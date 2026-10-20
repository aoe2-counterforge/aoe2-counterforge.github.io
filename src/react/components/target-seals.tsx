import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { TARGET_GROUPS, type TargetGroup } from '../../domain/enums/charge-target.ts';
import type { TargetNote } from '../attack-rows.ts';

/** Hand-drawn at the icon set's stroke, round caps and joins, each in the 24-unit box. */
const GLYPHS: Record<TargetGroup, ReactElement> = {
    land: (
        <>
            <path d="M5 14a7 7 0 0 1 14 0v5l-3 2.5H8L5 19z" />
            <path d="M8.5 14h7" />
            <path d="M12 14v4" />
            <path d="M12 3v3" />
        </>
    ),
    ship: (
        <>
            <path d="M3 15h18l-3 5.5H6z" />
            <path d="M12 3v12" />
            <path d="M12 4l6.5 9H12" />
            <path d="M10 7L5.5 13H10" />
        </>
    ),
    siege: (
        <>
            <circle cx="7" cy="19" r="2" />
            <circle cx="17" cy="19" r="2" />
            <path d="M4 16.5h16" />
            <path d="M9 16.5L12 9l3 7.5" />
            <path d="M6 5l8.5 7.5" />
            <circle cx="5" cy="4.5" r="1.5" />
        </>
    ),
    building: (
        <>
            <path d="M5 21V9h14v12" />
            <path d="M5 9V4.5h3V7h2.5V4.5h3V7H16V4.5h3V9" />
            <path d="M10 21v-4.5a2 2 0 0 1 4 0V21" />
        </>
    ),
};

/**
 * The kinds of target an attack is used against, as one fixed row of seals.
 *
 * Land units, ships, siege weapons and buildings always stand in the same order, so a reader learns
 * the row once and only has to look at which seals are lit: a target is drawn at full strength, one
 * the attack is never used against is the same seal faded. A card that is only for some targets and
 * a card that leaves them out therefore look like each other's negatives.
 *
 * @param props.note - The groups the attack is for, or the groups it is never used against.
 */
export function TargetSeals({ note }: { note: TargetNote }) {
    const { t } = useTranslation();
    const hit = note.kind === 'against' ? note.groups : TARGET_GROUPS.filter((group) => !note.groups.includes(group));

    return (
        <div className="attack-targets" role="group" aria-label={t('unit.attacks.targetsLabel')}>
            <ul className="attack-targets__list">
                {TARGET_GROUPS.map((group) => {
                    const targeted = hit.includes(group);
                    const name = t(`unit.attacks.groups.${group}`);
                    const described = targeted ? name : t('unit.attacks.notTarget', { name });

                    return (
                        <li key={group} className="target-seal" data-group={group} data-hit={targeted} title={described}>
                            <span className="target-seal__disc" aria-hidden="true">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="glyph"
                                    focusable="false"
                                >
                                    {GLYPHS[group]}
                                </svg>
                            </span>
                            <span className="target-seal__name" aria-hidden="true">
                                {t(`unit.attacks.groupsShort.${group}`)}
                            </span>
                            <span className="visually-hidden">{described}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
