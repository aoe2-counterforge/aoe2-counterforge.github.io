import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectileRole } from '../../domain/enums/projectile-role.ts';
import type { SpecialAttack } from '../../domain/values/special-attack.ts';
import type { UnitStats } from '../../domain/values/unit-stats.ts';
import { attackCards, type AttackCard, type CardCadence, type MissileCount, type Strike } from '../attack-rows.ts';
import { short } from '../format.ts';
import { BonusChips, DamageTypePill, Gain } from './attack-parts.tsx';
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
    lead?: boolean;
    children: ReactNode;
}

/** One figure on a card, labelled the way the stat tiles above label theirs. */
function Fact({ icon, tint, label, lead = false, children }: FactProps) {
    return (
        <div className={lead ? 'attack-fact attack-fact--lead' : 'attack-fact'}>
            <div className="stat__label">
                <Icon name={icon} className={tint} />
                {label}
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
                <Fact icon="reload" label={t('stats.reloadTime')}>
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

function CountFact({ count }: { count: MissileCount }) {
    const { t } = useTranslation();
    const full = t(`unit.attacks.${count.kind}`, { count: count.amount });
    const shown = count.kind === 'upTo' ? t('unit.attacks.upToShort', { count: count.amount }) : `×${String(count.amount)}`;

    return (
        <Fact icon="projectiles" label={t('unit.attacks.count')}>
            <span aria-hidden="true">{shown}</span>
            <span className="visually-hidden">{full}</span>
        </Fact>
    );
}

/** The damage of one strike, which heads its card or its line. */
function DamageFact({ strike }: { strike: Strike }) {
    const { t } = useTranslation();
    const damage = strike.attack.displayValue;
    const type = strike.attack.damageType();

    return (
        <Fact icon={type ?? 'attack'} tint={type ? `glyph--${type}` : undefined} label={t('unit.attacks.damage')} lead>
            <span className="attack-fact__damage">
                {short(damage)}
                <Gain value={strike.before === undefined ? 0 : damage - strike.before.displayValue} />
            </span>
            {type ? <DamageTypePill type={type} /> : null}
        </Fact>
    );
}

/**
 * A card with one strike lists everything beside its role glyph; a volley keeps reach and rhythm
 * there and gives each of its missiles a line of its own, since they share the first and not the second.
 */
function AttackCardItem({ card }: { card: AttackCard }) {
    const { t } = useTranslation();
    const name = t(ROLE_NAMES[card.role]);
    const [only] = card.strikes.length === 1 ? card.strikes : [];
    const others = [only?.count, card.cadence, card.range > 0].filter(Boolean).length;
    // A phone cannot fit the damage and three more figures on one line, so those three get a row of their own.
    const stacked = only !== undefined && others > 2;

    return (
        <li className={`attack-card attack-card--${card.role}${stacked ? ' attack-card--stacked' : ''}`}>
            <span className="attack-card__role" role="img" aria-label={name} title={name}>
                <Icon name={ROLE_GLYPHS[card.role]} />
            </span>
            <div className="attack-card__head">
                {only ? <DamageFact strike={only} /> : null}
                {others > 0 ? (
                    <div className="attack-card__facts">
                        {only?.count ? <CountFact count={only.count} /> : null}
                        {card.cadence ? <CadenceFact cadence={card.cadence} /> : null}
                        {card.range > 0 ? (
                            <Fact icon="range" label={t('stats.range')}>
                                {short(card.range)}
                                <Gain value={card.rangeBefore === undefined ? 0 : card.range - card.rangeBefore} />
                            </Fact>
                        ) : null}
                    </div>
                ) : null}
            </div>
            {only ? (
                <BonusChips attack={only.attack} compareWith={only.before} />
            ) : (
                card.strikes.map((strike, index) => (
                    <div key={index} className="attack-strike">
                        <div className="attack-strike__facts">
                            <DamageFact strike={strike} />
                            {strike.count ? <CountFact count={strike.count} /> : null}
                        </div>
                        <BonusChips attack={strike.attack} compareWith={strike.before} />
                    </div>
                ))
            )}
        </li>
    );
}

/**
 * Every attack a unit makes, as one compact card each: the main attack, then any charged attack
 * and extra projectiles.
 *
 * A glyph tells the cards apart instead of a printed name, so that a phone spends its width on the
 * numbers; the name is still there for a screen reader and in a tooltip. The extra attacks stay
 * apart from the main one because each flies as a missile of its own, and folding them into the
 * unit's numbers would count an arrow volley as if the shooter swung it.
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
