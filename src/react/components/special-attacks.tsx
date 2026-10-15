import { useTranslation } from 'react-i18next';
import type { SpecialAttack } from '../../domain/values/special-attack.ts';
import { delta, short } from '../format.ts';
import { Icon } from './icon.tsx';

export interface SpecialAttacksProps {
    /** The attacks as the unit has them, which is what an upgraded one is compared with. */
    base: readonly SpecialAttack[];
    /** The same attacks with technologies applied, when the reader asked for them. */
    upgraded?: readonly SpecialAttack[];
}

/** A charge that refills in less than this reads as ready again at once. */
const INSTANT = 0.05;

function Gain({ value }: { value: number }) {
    return value === 0 ? null : <span className="stat__delta">{delta(value)}</span>;
}

/**
 * The charged attack and the extra projectiles of a unit, each with its damage, reach and rhythm.
 *
 * They are shown apart from the stat block because each flies as a missile of its own; folding
 * them into the unit's numbers would count an arrow volley as if the shooter swung it.
 */
export function SpecialAttacks({ base, upgraded }: SpecialAttacksProps) {
    const { t } = useTranslation();
    const shown = upgraded ?? base;
    if (shown.length === 0) return null;

    return (
        <div className="stack stack--tight special-attacks">
            <hr className="divider" />
            <div className="section-label">{t('unit.special.title')}</div>
            <p className="card__hint">{t('unit.special.hint')}</p>
            {shown.map((attack) => {
                const before = upgraded ? base.find((entry) => entry.role === attack.role) : undefined;
                const recharge = attack.rechargeTime();
                const attackGain = attack.attack.displayValue - (before?.attack.displayValue ?? attack.attack.displayValue);
                const rangeGain = attack.range - (before?.range ?? attack.range);
                const volley = attack.role === 'secondary' && (attack.count ?? 0) === 0;

                return (
                    <section key={attack.role} className="special-attack">
                        <div className="special-attack__title">{t(`unit.special.${attack.role}`)}</div>
                        <div className="stat-grid">
                            {attack.attack.displayValue > 0 ? (
                                <div className="stat">
                                    <div className="stat__label">
                                        <Icon name="attack" />
                                        {t('stats.attack')}
                                    </div>
                                    <div className="stat__value">
                                        {short(attack.attack.displayValue)}
                                        <Gain value={attackGain} />
                                    </div>
                                </div>
                            ) : null}
                            <div className="stat">
                                <div className="stat__label">
                                    <Icon name="range" />
                                    {t('stats.range')}
                                </div>
                                <div className="stat__value">
                                    {short(attack.range)}
                                    <Gain value={rangeGain} />
                                </div>
                            </div>
                            {recharge === null ? null : (
                                <div className="stat">
                                    <div className="stat__label">
                                        <Icon name="trainTime" />
                                        {t('unit.special.recharge')}
                                    </div>
                                    <div className="stat__value">
                                        {recharge < INSTANT
                                            ? t('unit.special.instant')
                                            : t('unit.special.seconds', { value: short(recharge >= 10 ? Math.round(recharge) : recharge) })}
                                    </div>
                                </div>
                            )}
                            {attack.role === 'secondary' && !volley ? (
                                <div className="stat">
                                    <div className="stat__label">{t('unit.special.projectiles')}</div>
                                    <div className="stat__value">{short(attack.count ?? 0)}</div>
                                </div>
                            ) : null}
                        </div>
                        {volley ? <p className="card__hint">{t('unit.special.volley')}</p> : null}
                        {attack.attack.bonuses().length > 0 ? (
                            <ul className="bullets special-attack__bonuses">
                                {attack.attack.bonuses().map((bonus) => (
                                    <li key={bonus.armourClass}>
                                        <span>
                                            <strong>+{short(bonus.amount)}</strong> {t(`armourClasses.${bonus.armourClass}`)}
                                            <Gain
                                                value={bonus.amount - (before?.attack.valueFor(bonus.armourClass) ?? bonus.amount)}
                                            />
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </section>
                );
            })}
        </div>
    );
}
