import { useTranslation } from 'react-i18next';
import type { UnitStats } from '../../domain/values/unit-stats.ts';
import { short } from '../format.ts';
import { BonusChips, DamageTypePill, Gain } from './attack-parts.tsx';
import { Icon } from './icon.tsx';

export interface MainAttackPanelProps {
    stats: UnitStats;
    /** The stat line before technologies, when the reader is looking at an upgraded one. */
    compareWith?: UnitStats;
}

/**
 * The attack a unit makes with every ordinary blow or shot: its damage and what kind it is, how
 * often it lands, how far it reaches and which classes it hits harder.
 *
 * A melee unit has no range to show, and a unit that cannot attack has no panel at all.
 *
 * @param props.stats - The stat line to read, base or upgraded.
 * @param props.compareWith - What the technologies are measured against.
 */
export function MainAttackPanel({ stats, compareWith }: MainAttackPanelProps) {
    const { t } = useTranslation();
    const damage = stats.attack.displayValue;
    if (damage <= 0) return null;

    const type = stats.attack.damageType();
    const gain = (now: number, before: number | undefined) => (before === undefined ? 0 : now - before);

    return (
        <section className="attack-section" aria-labelledby="main-attack-title">
            <div className="attack-section__head">
                <h3 id="main-attack-title" className="attack-section__title">
                    {t('unit.attacks.main')}
                </h3>
            </div>
            <div className="attack-panel">
                <div className="attack-fact">
                    <div className="attack-fact__label">
                        <Icon name={type ?? 'attack'} className={type ? `glyph--${type}` : undefined} />
                        {t('stats.attack')}
                    </div>
                    <div className="attack-fact__line">
                        <span className="attack-fact__figure attack-fact__figure--lead">
                            {short(damage)}
                            <Gain value={gain(damage, compareWith?.attack.displayValue)} />
                        </span>
                        {type ? <DamageTypePill type={type} /> : null}
                    </div>
                </div>
                {stats.reloadTime > 0 ? (
                    <div className="attack-fact">
                        <div className="attack-fact__label">
                            <Icon name="trainTime" />
                            {t('stats.reloadTime')}
                        </div>
                        <div className="attack-fact__figure">
                            {t('unit.attacks.seconds', { value: short(stats.reloadTime) })}
                            <Gain value={gain(stats.reloadTime, compareWith?.reloadTime)} inverted />
                        </div>
                    </div>
                ) : null}
                {stats.range > 0 ? (
                    <div className="attack-fact">
                        <div className="attack-fact__label">
                            <Icon name="range" />
                            {t('stats.range')}
                        </div>
                        <div className="attack-fact__figure">
                            {short(stats.range)}
                            <Gain value={gain(stats.range, compareWith?.range)} />
                        </div>
                    </div>
                ) : null}
                <div className="attack-fact attack-fact--wide">
                    <div className="attack-fact__label">
                        <Icon name="bonus" />
                        {t('unit.bonusDamage')}
                    </div>
                    <BonusChips attack={stats.attack} compareWith={compareWith?.attack} />
                </div>
            </div>
        </section>
    );
}
