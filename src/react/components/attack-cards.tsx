import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectileRole } from '../../domain/enums/projectile-role.ts';
import type { ChargeAbility, ChargeAbilityKind } from '../../domain/values/charge-ability.ts';
import type { SpecialAttack } from '../../domain/values/special-attack.ts';
import type { UnitStats } from '../../domain/values/unit-stats.ts';
import {
    attackCards,
    type AttackCard,
    type CardCadence,
    type MissileCount,
    type Strike,
} from '../attack-rows.ts';
import { precise, short } from '../format.ts';
import { BonusChips, Gain, type DamageType } from './attack-parts.tsx';
import { Icon, type IconName } from './icon.tsx';
import { TargetSeals } from './target-seals.tsx';

export interface AttackCardsProps {
    /** The unit's stat line, base or upgraded. */
    stats: UnitStats;
    /** The stat line before technologies, when the reader is looking at an upgraded one. */
    compareWith?: UnitStats;
    /** The special attacks the unit fires as it stands. */
    base: readonly SpecialAttack[];
    /** The same attacks with technologies applied, when the reader asked for them. */
    upgraded?: readonly SpecialAttack[];
    /** A charge the unit spends on its own blows or its own defence, shown as a card of its own. */
    ability?: ChargeAbility | null;
}

/** The game's attack stat is a sword whatever the unit wields, so the main attack keeps it. */
const ROLE_GLYPHS: Record<ProjectileRole, IconName> = {
    main: 'attack',
    charge: 'charge',
    secondary: 'projectiles',
};

const ROLE_NAMES: Record<ProjectileRole, string> = {
    main: 'unit.attacks.main',
    charge: 'unit.attacks.charge',
    secondary: 'unit.attacks.secondary',
};

function useSeconds(): (value: number) => string {
    const { t } = useTranslation();

    // Past ten seconds a decimal is noise next to a figure that size.
    return (value) => t('unit.attacks.seconds', { value: short(value >= 10 ? Math.round(value) : value) });
}

type FactKind = 'damage' | 'reload' | 'recharge' | 'cadence' | 'range' | 'count' | 'type';

interface FactProps {
    kind: FactKind;
    icon: IconName;
    tint?: string;
    /** The armour the figure goes through, for a figure painted in its damage's colour. */
    type?: DamageType | null;
    label: string;
    children: ReactNode;
}

/** One figure on a card, labelled the way the stat tiles above label theirs. */
function Fact({ kind, icon, tint, type, label, children }: FactProps) {
    return (
        <div className="attack-fact" data-stat={kind} data-type={type ?? undefined}>
            <div className="stat__label">
                <Icon name={icon} className={tint} />
                <span className="stat__name">{label}</span>
            </div>
            <div className="stat__value">{children}</div>
        </div>
    );
}

function CadenceFact({ cadence }: { cadence: CardCadence }) {
    const { t } = useTranslation();
    const seconds = useSeconds();

    switch (cadence.kind) {
        case 'reload':
            return (
                <Fact kind="reload" icon="reload" label={t('unit.attacks.reload')}>
                    {seconds(cadence.seconds)}
                    <Gain value={cadence.before === undefined ? 0 : cadence.seconds - cadence.before} inverted />
                </Fact>
            );
        case 'recharge':
            return (
                <Fact kind="recharge" icon="recharge" label={t('unit.attacks.recharge')}>
                    {seconds(cadence.seconds)}
                </Fact>
            );
        default:
            return (
                <Fact kind="cadence" icon="repeat" label={t('unit.attacks.cadence')}>
                    <span className="attack-fact__word">{t(`unit.attacks.${cadence.kind}`)}</span>
                </Fact>
            );
    }
}

function CountFact({ count, label }: { count: MissileCount; label: string }) {
    const { t } = useTranslation();
    const full = t(`unit.attacks.${count.kind}`, { count: count.amount });
    const shown = count.kind === 'upTo' ? t('unit.attacks.upToShort', { count: count.amount }) : `×${String(count.amount)}`;

    return (
        <Fact kind="count" icon="projectiles" label={label}>
            <span aria-hidden="true">{shown}</span>
            <span className="visually-hidden">{full}</span>
        </Fact>
    );
}

function DamageFact({ strike }: { strike: Strike }) {
    const { t } = useTranslation();
    const damage = strike.attack.displayValue;
    const type = strike.attack.damageType();

    return (
        <Fact kind="damage" icon="damage" type={type} label={t('unit.attacks.damage')}>
            {short(damage)}
            <Gain value={strike.before === undefined ? 0 : damage - strike.before.displayValue} />
        </Fact>
    );
}

/**
 * A damage type is drawn as the armour it goes through, the shield of the stat tile it answers.
 * Named by the hit rather than "melee", since a mangonel's stone is melee damage from seven tiles away.
 */
const TYPE_GLYPHS: Record<DamageType, IconName> = {
    melee: 'meleeArmour',
    pierce: 'pierceArmour',
};

/** Which armour a strike goes through, for the rare missile that differs from the attack it rides with. */
function TypeFact({ type }: { type: DamageType }) {
    const { t } = useTranslation();

    return (
        <Fact kind="type" icon={TYPE_GLYPHS[type]} tint={`glyph--${type}`} type={type} label={t('unit.attacks.type')}>
            <span className={`attack-fact__type attack-fact__type--${type}`}>{t(`unit.attacks.types.${type}`)}</span>
        </Fact>
    );
}

interface RoleBadgeProps {
    glyph: IconName;
    name: string;
    type: DamageType | null;
    nameId: string;
}

/** What the attack is and which armour it goes through, as one badge heading the card. */
function RoleBadge({ glyph, name, type, nameId }: RoleBadgeProps) {
    const { t } = useTranslation();

    return (
        <p className="attack-badge">
            <span className="attack-badge__role">
                <Icon name={glyph} />
                <span id={nameId} className="attack-badge__name">
                    {name}
                </span>
            </span>
            {type ? (
                <span className={`attack-badge__type attack-badge__type--${type}`}>
                    <Icon name={TYPE_GLYPHS[type]} />
                    <span className="attack-badge__word">{t(`unit.attacks.types.${type}`)}</span>
                </span>
            ) : null}
        </p>
    );
}

/** The glyph each ability is drawn with: the charge's bolt for a charged blow, the burst for one that spreads. */
const ABILITY_GLYPHS: Record<ChargeAbilityKind, IconName> = {
    blow: 'charge',
    blast: 'blast',
    dodge: 'dodge',
    block: 'block',
};

/** A dodge answers missiles and a block answers blows, so each is sealed with the armour it stands in for. */
const ABILITY_SEALS: Record<ChargeAbilityKind, DamageType> = {
    blow: 'melee',
    blast: 'melee',
    dodge: 'pierce',
    block: 'melee',
};

/**
 * A charge the unit spends on its own blows or its own defence, as a card of the same family.
 *
 * A charged blow is damage, so it reads like an attack: its bonus beside its recharge. A dodge
 * counts missiles and the time to win one back; a block only needs its recharge.
 *
 * @param props.ability - The ability, as the game data gives it.
 */
function AbilityCardItem({ ability }: { ability: ChargeAbility }) {
    const { t } = useTranslation();
    const seconds = useSeconds();
    const nameId = useId();
    const strikes = ability.kind === 'blow' || ability.kind === 'blast';
    const seal = ABILITY_SEALS[ability.kind];

    return (
        <li
            className={`attack-card attack-card--charge attack-card--ability attack-card--${ability.kind}`}
            data-type={seal}
            data-ability={ability.kind}
            aria-labelledby={nameId}
        >
            <span className="attack-card__emblem" aria-hidden="true">
                <Icon name={TYPE_GLYPHS[seal]} />
            </span>
            <RoleBadge
                glyph={ABILITY_GLYPHS[ability.kind]}
                name={t(`unit.attacks.abilities.${ability.kind}`)}
                type={strikes ? seal : null}
                nameId={nameId}
            />
            <div className="attack-card__facts">
                {strikes ? (
                    <Fact kind="damage" icon="damage" type="melee" label={t('unit.attacks.damage')}>
                        +{short(ability.amount)}
                    </Fact>
                ) : null}
                {ability.kind === 'dodge' ? (
                    <Fact kind="count" icon="projectiles" label={t('unit.attacks.dodges')}>
                        {short(ability.amount)}
                    </Fact>
                ) : null}
                <Fact
                    kind="recharge"
                    icon="recharge"
                    label={t(ability.kind === 'dodge' ? 'unit.attacks.regain' : 'unit.attacks.recharge')}
                >
                    {seconds(ability.cycleTime())}
                </Fact>
                {ability.blast ? (
                    <Fact kind="range" icon="blast" label={t('unit.attacks.area')}>
                        {precise(ability.blast.radius)}
                    </Fact>
                ) : null}
            </div>
            <p className="attack-note">
                {t(`unit.attacks.abilityNotes.${ability.kind}`, { share: short((ability.blast?.share ?? 0) * 100) })}
            </p>
        </li>
    );
}

/**
 * The figures run damage, rhythm, reach, so that on a phone, where they fall into three columns,
 * each sits over the same figure of the card above.
 *
 * Missiles that fly with every shot need no rhythm of their own beside their count: the count
 * already says how many each shot carries, and it takes the rhythm's place in the row.
 */
function AttackCardItem({ card }: { card: AttackCard }) {
    const { t } = useTranslation();
    const seconds = useSeconds();
    const nameId = useId();
    const { strike, rider } = card;
    const type = strike.attack.damageType();
    const riderType = rider?.attack.damageType();
    const cadence = card.cadence?.kind === 'eachShot' && strike.count ? null : card.cadence;

    return (
        <li className={`attack-card attack-card--${card.role}`} data-type={type ?? undefined} aria-labelledby={nameId}>
            {type ? (
                <span className="attack-card__emblem" aria-hidden="true">
                    <Icon name={TYPE_GLYPHS[type]} />
                </span>
            ) : null}
            <RoleBadge glyph={ROLE_GLYPHS[card.role]} name={t(ROLE_NAMES[card.role])} type={type} nameId={nameId} />
            {card.targets ? <TargetSeals note={card.targets} /> : null}
            <div className="attack-card__facts">
                <DamageFact strike={strike} />
                {cadence ? <CadenceFact cadence={cadence} /> : null}
                {strike.count ? <CountFact count={strike.count} label={t('unit.attacks.count')} /> : null}
                {card.range > 0 ? (
                    <Fact kind="range" icon="range" label={t(card.hasMinimumRange ? 'stats.maxRange' : 'stats.range')}>
                        {short(card.range)}
                        <Gain value={card.rangeBefore === undefined ? 0 : card.range - card.rangeBefore} />
                    </Fact>
                ) : null}
            </div>
            <BonusChips attack={strike.attack} compareWith={strike.before} />
            {card.replacesShot ? <p className="attack-note">{t('unit.attacks.replacesShot')}</p> : null}
            {card.slows ? (
                <p className="attack-note">
                    {t('unit.attacks.slows', { share: short(card.slows.share * 100), seconds: seconds(card.slows.seconds) })}
                </p>
            ) : null}
            {rider?.count ? (
                <div className="attack-rider">
                    <div className="attack-card__facts">
                        <DamageFact strike={rider} />
                        {riderType && riderType !== type ? <TypeFact type={riderType} /> : null}
                        <CountFact count={rider.count} label={t('unit.attacks.secondary')} />
                    </div>
                    <BonusChips attack={rider.attack} compareWith={rider.before} />
                </div>
            ) : null}
        </li>
    );
}

/**
 * Every attack a unit makes, as one compact card each: the main attack, then any charged attack
 * and extra projectiles.
 *
 * A badge heading each card names the attack and the armour it goes through, so the figures
 * below are numbers only. Extra missiles hang inside the card of the shot they fly with, the main
 * attack's or the charged one's, with their own damage beside their count rather than added into
 * the shot's, since each one hits with a damage list of its own.
 *
 * @param props.stats - The stat line to read, base or upgraded.
 * @param props.compareWith - What the technologies are measured against.
 * @param props.base - The unit's active special attacks as it stands.
 * @param props.upgraded - The same attacks with technologies applied, when asked for.
 * @param props.ability - A charge spent on the unit's own blows or defence, which gets a card after the attacks.
 */
export function AttackCards({ stats, compareWith, base, upgraded, ability }: AttackCardsProps) {
    const { t } = useTranslation();
    const titleId = useId();
    const cards = attackCards({ stats, compareWith, base, upgraded });
    if (cards.length === 0 && !ability) return null;

    return (
        <section className="attack-section" aria-labelledby={titleId}>
            <h3 id={titleId} className="attack-section__title">
                {t('unit.attacks.title')}
            </h3>
            <ul className="attack-cards">
                {cards.map((card) => (
                    <AttackCardItem key={card.role} card={card} />
                ))}
                {ability ? <AbilityCardItem ability={ability} /> : null}
            </ul>
        </section>
    );
}
