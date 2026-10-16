import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { SpecialAttack } from '../../domain/values/special-attack.ts';
import { attackRows, cadenceOf, type AttackRow, type Cadence } from '../attack-rows.ts';
import { short } from '../format.ts';
import { BonusChips, DamageTypePill, Gain } from './attack-parts.tsx';

export interface ExtraAttacksProps {
    /** The attacks as the unit has them, which is what an upgraded one is compared with. */
    base: readonly SpecialAttack[];
    /** The same attacks with technologies applied, when the reader asked for them. */
    upgraded?: readonly SpecialAttack[];
}

/** One missile, or set of missiles, whose damage a row lists. */
interface Segment {
    caption: string | null;
    attack: SpecialAttack;
    before: SpecialAttack | undefined;
    /** Whether the damage is that of each missile rather than of the attack as a whole. */
    each: boolean;
}

function CadenceText({ cadence }: { cadence: Cadence | null }) {
    const { t } = useTranslation();
    if (cadence === null) return <span className="attack-none">—</span>;
    if (cadence.kind !== 'recharge') {
        return <span className="attack-row__figure attack-row__figure--word">{t(`unit.attacks.${cadence.kind}`)}</span>;
    }
    const { seconds } = cadence;

    return (
        <span className="attack-row__figure">
            {t('unit.attacks.seconds', { value: short(seconds >= 10 ? Math.round(seconds) : seconds) })}
        </span>
    );
}

function segmentsOf(row: AttackRow, caption: (key: string, count?: number) => string): Segment[] {
    const own: Segment = {
        caption: null,
        attack: row.attack,
        before: row.before,
        each: row.role === 'secondary',
    };

    if (row.volley) {
        return [
            { ...own, caption: caption('mainMissile') },
            {
                caption: caption('extraMissiles', row.volley.most),
                attack: row.volley.attack,
                before: row.volley.before,
                each: true,
            },
        ];
    }

    const perShot = row.attack.count ?? 0;

    return [row.role === 'secondary' && perShot > 0 ? { ...own, caption: caption('perShot', perShot) } : own];
}

function ExtraAttackRow({ row }: { row: AttackRow }) {
    const { t } = useTranslation();
    const caption = (key: string, count?: number) => t(`unit.attacks.${key}`, { amount: count });
    const segments = segmentsOf(row, caption);
    const rangeGain = row.attack.range - (row.before?.range ?? row.attack.range);

    return (
        <li className={`attack-row attack-row--${row.role}${segments.length > 1 ? ' attack-row--volley' : ''}`}>
            <div className="attack-row__name">{t(`unit.attacks.${row.role}`)}</div>
            <div className="attack-row__damage">
                {segments.map((segment, index) => {
                    const type = segment.attack.attack.damageType();
                    const before = segment.before?.attack.displayValue;

                    return (
                        <div key={index} className="attack-row__segment">
                            {index === 0 ? <div className="attack-row__label">{t('unit.attacks.damage')}</div> : null}
                            {segment.caption ? <div className="attack-row__caption">{segment.caption}</div> : null}
                            <div className="attack-row__line">
                                <span className="attack-row__figure">
                                    {short(segment.attack.attack.displayValue)}
                                    <Gain value={before === undefined ? 0 : segment.attack.attack.displayValue - before} />
                                </span>
                                {type ? <DamageTypePill type={type} /> : null}
                                {segment.each ? <span className="attack-row__each">{t('unit.attacks.each')}</span> : null}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="attack-row__range">
                <div className="attack-row__label">{t('stats.range')}</div>
                <span className="attack-row__figure">
                    {short(row.attack.range)}
                    <Gain value={rangeGain} />
                </span>
            </div>
            <div className="attack-row__cadence">
                <div className="attack-row__label">{t('unit.attacks.cadence')}</div>
                <CadenceText cadence={cadenceOf(row.attack)} />
            </div>
            <div className="attack-row__bonus">
                {segments.map((segment, index) => (
                    <div key={index} className="attack-row__segment">
                        {index === 0 ? <div className="attack-row__label">{t('unit.bonusDamage')}</div> : null}
                        <BonusChips attack={segment.attack.attack} compareWith={segment.before?.attack} />
                    </div>
                ))}
            </div>
        </li>
    );
}

/**
 * The charged attack and the extra projectiles of a unit, one row each, with their damage, reach,
 * cadence and bonus damage.
 *
 * They sit apart from the main attack because each flies as a missile of its own; folding them
 * into the unit's numbers would count an arrow volley as if the shooter swung it. A unit with
 * nothing of the kind shows no section at all.
 *
 * @param props.base - The unit's active special attacks as it stands.
 * @param props.upgraded - The same attacks with technologies applied, when asked for.
 */
export function ExtraAttacks({ base, upgraded }: ExtraAttacksProps) {
    const { t } = useTranslation();
    const titleId = useId();
    const rows = attackRows(base, upgraded);
    if (rows.length === 0) return null;

    const penalties = [...rows.flatMap((row) => [row.attack, row.volley?.attack])].some((attack) =>
        attack?.attack.modifiers().some((entry) => entry.amount < 0),
    );

    return (
        <section className="attack-section" aria-labelledby={titleId}>
            <div className="attack-section__head">
                <h3 id={titleId} className="attack-section__title">
                    {t('unit.attacks.extra')}
                    <span className="attack-section__count">{rows.length}</span>
                </h3>
                <span className="attack-section__aside">{t('unit.attacks.follows')}</span>
            </div>
            <div className="attack-rows__head" aria-hidden="true">
                <span>{t('stats.attack')}</span>
                <span>{t('unit.attacks.damage')}</span>
                <span>{t('stats.range')}</span>
                <span>{t('unit.attacks.cadence')}</span>
                <span>{t('unit.bonusDamage')}</span>
            </div>
            <ul className="attack-rows">
                {rows.map((row) => (
                    <ExtraAttackRow key={row.role} row={row} />
                ))}
            </ul>
            <p className="card__hint">{t(penalties ? 'unit.attacks.noteWithPenalties' : 'unit.attacks.note')}</p>
        </section>
    );
}
