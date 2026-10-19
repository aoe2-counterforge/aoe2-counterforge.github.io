import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectileRole } from '../../domain/enums/projectile-role.ts';
import type { SpecialAttack } from '../../domain/values/special-attack.ts';
import type { UnitStats } from '../../domain/values/unit-stats.ts';
import { attackCards, type AttackCard, type CardCadence, type MissileCount, type Strike } from '../attack-rows.ts';
import { short } from '../format.ts';
import { BonusChips, Gain, type DamageType } from './attack-parts.tsx';
import { Icon, type IconName } from './icon.tsx';

export interface AttackCardsProps {
    /** The unit's stat line, base or upgraded. */
    stats: UnitStats;
    /** The stat line before technologies, when the reader is looking at an upgraded one. */
    compareWith?: UnitStats;
    /** The special attacks the unit fires as it stands. */
    base: readonly SpecialAttack[];
    /** The same attacks with technologies applied, when the reader asked for them. */
    upgraded?: readonly SpecialAttack[];
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

interface FactProps {
    icon: IconName;
    tint?: string;
    label: string;
    children: ReactNode;
}

/** One figure on a card, labelled the way the stat tiles above label theirs. */
function Fact({ icon, tint, label, children }: FactProps) {
    return (
        <div className="attack-fact">
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
                <Fact icon="reload" label={t('unit.attacks.reload')}>
                    {seconds(cadence.seconds)}
                    <Gain value={cadence.before === undefined ? 0 : cadence.seconds - cadence.before} inverted />
                </Fact>
            );
        case 'recharge':
            return (
                <Fact icon="recharge" label={t('unit.attacks.recharge')}>
                    {seconds(cadence.seconds)}
                </Fact>
            );
        default:
            return (
                <Fact icon="repeat" label={t('unit.attacks.cadence')}>
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
        <Fact icon="projectiles" label={label}>
            <span aria-hidden="true">{shown}</span>
            <span className="visually-hidden">{full}</span>
        </Fact>
    );
}

function DamageFact({ strike }: { strike: Strike }) {
    const { t } = useTranslation();
    const damage = strike.attack.displayValue;

    return (
        <Fact icon="damage" label={t('unit.attacks.damage')}>
            {short(damage)}
            <Gain value={strike.before === undefined ? 0 : damage - strike.before.displayValue} />
        </Fact>
    );
}

/** Which armour a strike goes through, for the rare missile that differs from the attack it rides with. */
function TypeFact({ type }: { type: DamageType }) {
    const { t } = useTranslation();

    return (
        <Fact icon={type} tint={`glyph--${type}`} label={t('unit.attacks.type')}>
            <span className={`attack-fact__type attack-fact__type--${type}`}>{t(`armourClasses.base-${type}`)}</span>
        </Fact>
    );
}

/** What the attack is and which armour it goes through, as one badge on the card's top edge. */
function RoleBadge({ role, type, nameId }: { role: ProjectileRole; type: DamageType | null; nameId: string }) {
    const { t } = useTranslation();

    return (
        <p className="attack-badge">
            <span className="attack-badge__role">
                <Icon name={ROLE_GLYPHS[role]} />
                <span id={nameId} className="attack-badge__name">
                    {t(ROLE_NAMES[role])}
                </span>
            </span>
            {type ? (
                <span className={`attack-badge__type attack-badge__type--${type}`}>
                    <Icon name={type} />
                    {t(`armourClasses.base-${type}`)}
                </span>
            ) : null}
        </p>
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
    const nameId = useId();
    const { strike, rider } = card;
    const type = strike.attack.damageType();
    const riderType = rider?.attack.damageType();
    const cadence = card.cadence?.kind === 'eachShot' && strike.count ? null : card.cadence;

    return (
        <li className={`attack-card attack-card--${card.role}`} aria-labelledby={nameId}>
            <RoleBadge role={card.role} type={type} nameId={nameId} />
            <div className="attack-card__facts">
                <DamageFact strike={strike} />
                {cadence ? <CadenceFact cadence={cadence} /> : null}
                {strike.count ? <CountFact count={strike.count} label={t('unit.attacks.count')} /> : null}
                {card.range > 0 ? (
                    <Fact icon="range" label={t(card.hasMinimumRange ? 'stats.maxRange' : 'stats.range')}>
                        {short(card.range)}
                        <Gain value={card.rangeBefore === undefined ? 0 : card.range - card.rangeBefore} />
                    </Fact>
                ) : null}
            </div>
            <BonusChips attack={strike.attack} compareWith={strike.before} />
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
 * A badge on each card's edge names the attack and the armour it goes through, so the figures
 * below are numbers only. The extra attacks stay apart from the main one because each flies as a
 * missile of its own, and folding them into the unit's numbers would count an arrow volley as if
 * the shooter swung it; extra missiles that only fly with a charge hang inside the charged card.
 *
 * @param props.stats - The stat line to read, base or upgraded.
 * @param props.compareWith - What the technologies are measured against.
 * @param props.base - The unit's active special attacks as it stands.
 * @param props.upgraded - The same attacks with technologies applied, when asked for.
 */
export function AttackCards({ stats, compareWith, base, upgraded }: AttackCardsProps) {
    const { t } = useTranslation();
    const titleId = useId();
    const cards = attackCards({ stats, compareWith, base, upgraded });
    if (cards.length === 0) return null;

    return (
        <section className="attack-section" aria-labelledby={titleId}>
            <h3 id={titleId} className="attack-section__title">
                {t('unit.attacks.title')}
            </h3>
            <ul className="attack-cards">
                {cards.map((card) => (
                    <AttackCardItem key={card.role} card={card} />
                ))}
            </ul>
        </section>
    );
}
