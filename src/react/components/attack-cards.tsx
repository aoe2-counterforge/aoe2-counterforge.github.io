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

    return (
        <Fact icon="damage" label={t('unit.attacks.damage')}>
            {short(damage)}
            <Gain value={strike.before === undefined ? 0 : damage - strike.before.displayValue} />
        </Fact>
    );
}

/** Which armour a strike goes through, as a figure of its own so it never reads as part of the number. */
function TypeFact({ type }: { type: DamageType }) {
    const { t } = useTranslation();

    return (
        <Fact icon={type} tint={`glyph--${type}`} label={t('unit.attacks.type')}>
            <span className={`attack-fact__type attack-fact__type--${type}`}>{t(`armourClasses.base-${type}`)}</span>
        </Fact>
    );
}

/** The damage type every strike of a card shares, which the card then states once. */
function sharedType(strikes: readonly Strike[]): DamageType | null {
    const types = new Set(strikes.map((strike) => strike.attack.damageType()));
    const [type] = types;

    return types.size === 1 && type ? type : null;
}

/**
 * A card with one strike lists everything beside its role glyph; a volley keeps reach and rhythm
 * there and gives each of its missiles a line of its own, since they share the first and not the second.
 */
function AttackCardItem({ card }: { card: AttackCard }) {
    const { t } = useTranslation();
    const name = t(ROLE_NAMES[card.role]);
    const [only] = card.strikes.length === 1 ? card.strikes : [];
    const type = sharedType(card.strikes);
    const others = [only?.count, card.cadence, card.range > 0].filter(Boolean).length;
    // A phone cannot fit damage, type and two more figures beside the glyph, so such a card falls into even columns.
    const stacked = only !== undefined && others > 1;

    return (
        <li className={`attack-card attack-card--${card.role}${stacked ? ' attack-card--stacked' : ''}`}>
            <div className="attack-card__body">
                <span className="attack-card__role" role="img" aria-label={name} title={name}>
                    <Icon name={ROLE_GLYPHS[card.role]} />
                </span>
                <div className="attack-card__head">
                    {only || type ? (
                        <div className="attack-card__lead">
                            {only ? <DamageFact strike={only} /> : null}
                            {type ? <TypeFact type={type} /> : null}
                        </div>
                    ) : null}
                    {others > 0 ? (
                        <div className="attack-card__facts">
                            {only?.count ? <CountFact count={only.count} /> : null}
                            {card.cadence ? <CadenceFact cadence={card.cadence} /> : null}
                            {card.range > 0 ? (
                                <Fact icon="range" label={t(card.hasMinimumRange ? 'stats.maxRange' : 'stats.range')}>
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
                    card.strikes.map((strike, index) => {
                        const own = type === null ? strike.attack.damageType() : null;

                        return (
                            <div key={index} className="attack-strike">
                                <div className="attack-strike__facts">
                                    <DamageFact strike={strike} />
                                    {own ? <TypeFact type={own} /> : null}
                                    {strike.count ? <CountFact count={strike.count} /> : null}
                                </div>
                                <BonusChips attack={strike.attack} compareWith={strike.before} />
                            </div>
                        );
                    })
                )}
            </div>
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
