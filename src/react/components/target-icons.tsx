import { useId, type ReactElement, type SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { membersOf, type ChargeTarget, type TargetGroup } from '../../domain/enums/charge-target.ts';
import type { TargetNote } from '../attack-rows.ts';
import { iconUrl } from '../format.ts';
import { useTargetStyle, type TargetStyle } from '../target-style.ts';

/** The pictures of the units each kind of target is shown as: Militia, Knight, Archer, Cavalry Archer, Monk, Villager, Galley, Mangonel and a House. */
const PORTRAITS: Record<ChargeTarget, string> = {
    infantry: 'Unit/8.png',
    cavalry: 'Unit/1.png',
    archer: 'Unit/17.png',
    'cavalry-archer': 'Unit/19.png',
    monk: 'Unit/131.png',
    villager: 'Unit/15.png',
    ship: 'Unit/87.png',
    siege: 'Unit/27.png',
    building: 'Building/34.png',
};

/** Hand-drawn at the icon set's stroke, round caps and joins, each in the 24-unit box. */
const HELMET = (
    <>
        <path d="M5 14a7 7 0 0 1 14 0v5l-3 2.5H8L5 19z" />
        <path d="M8.5 14h7" />
        <path d="M12 14v4" />
        <path d="M12 3v3" />
    </>
);

const HORSE = (
    <>
        <path d="M8 21c-.3-5 .2-9 3-13l.8-4.5 2.2 2.6c3.2.6 5.7 3.3 6.5 7.4v2.3c0 1-1 1.6-1.9 1.2L15.5 15c-1.3 1.7-1.8 4-1.5 6" />
        <path d="M15 9.2h.01" />
    </>
);

const GLYPHS: Record<ChargeTarget, ReactElement> = {
    infantry: HELMET,
    cavalry: HORSE,
    archer: (
        <>
            <path d="M8 3c8 3.5 8 14.5 0 18" />
            <path d="M8 3v18" />
            <path d="M3 12h15" />
            <path d="M15 9l3 3-3 3" />
        </>
    ),
    'cavalry-archer': (
        <>
            <path d="M3.5 21c-.2-3.5.1-6.2 2-9l.6-3 1.5 1.8c2.2.4 3.8 2.2 4.4 5v1.6c0 .7-.7 1.1-1.3.8l-1.8-.9c-.9 1.2-1.2 2.8-1 4.7" />
            <path d="M15.5 3.5c4.5 2 4.5 9.5 0 11.5" />
            <path d="M15.5 3.5v11.5" />
            <path d="M12 9.2h8" />
        </>
    ),
    monk: (
        <>
            <path d="M12 2.5c-3.4 0-5.5 2.6-5.5 6 0 1.8.4 3 .9 4L5 21h14l-2.4-8.5c.5-1 .9-2.2.9-4 0-3.4-2.1-6-5.5-6z" />
            <path d="M12 8c-1.8 0-2.7 1.2-2.7 3s.9 3 2.7 3 2.7-1.2 2.7-3S13.8 8 12 8z" />
        </>
    ),
    villager: (
        <>
            <path d="M4 20L15 9" />
            <path d="M6 6c4.5-3 11.5-1 13.5 6.5" />
            <path d="M6 6l1 2.8" />
            <path d="M19.5 12.5l-2.8-.5" />
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

/** The three kinds that stand for the land units on a seal: a foot soldier, a horseman and an archer. */
const LAND_TRIO: readonly ChargeTarget[] = ['infantry', 'cavalry', 'archer'];

/**
 * Draws one kind of target.
 *
 * @param props.kind - The kind of target.
 * @param props.rest - Passed straight through, so it sizes and colours like any other glyph.
 */
function TargetGlyph({ kind, ...rest }: { kind: ChargeTarget } & SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="glyph"
            aria-hidden="true"
            focusable="false"
            {...rest}
        >
            {GLYPHS[kind]}
        </svg>
    );
}

interface TargetMarkProps {
    kind: ChargeTarget | 'land';
    style: TargetStyle;
    name: string;
}

/** One target as an icon that carries its name for hovering and for readers that cannot see it. */
function TargetMark({ kind, style, name }: TargetMarkProps) {
    return (
        <span className="target-icon" data-kind={kind} title={name}>
            {kind === 'land' ? (
                LAND_TRIO.map((part) => <TargetGlyph key={part} kind={part} />)
            ) : style === 'portrait' ? (
                <img src={iconUrl(PORTRAITS[kind])} alt="" width="256" height="256" loading="lazy" decoding="async" />
            ) : (
                <TargetGlyph kind={kind} />
            )}
            <span className="visually-hidden">{name}</span>
        </span>
    );
}

/**
 * Which targets an attack is used against, or never used against, as a row of icons.
 *
 * A group of land units is drawn as the kinds it holds, boxed together; the seals style draws a
 * group as one mark with its name beneath. A kind an attack is never used against is struck through.
 *
 * @param props.note - The groups and whether the attack is for them or kept from them.
 */
export function TargetStrip({ note }: { note: TargetNote }) {
    const { t } = useTranslation();
    const style = useTargetStyle();
    const labelId = useId();
    const never = note.kind === 'never';

    return (
        <div className="attack-targets" data-targets={note.kind} data-style={style} role="group" aria-labelledby={labelId}>
            <span id={labelId} className="attack-targets__label">
                {t(never ? 'unit.attacks.neverLabel' : 'unit.attacks.againstLabel')}
            </span>
            <ul className="attack-targets__list">
                {note.groups.map((group: TargetGroup) => {
                    const groupName = t(`unit.attacks.targets.${group}`);
                    const parts = style === 'seal' ? null : membersOf(group);

                    return (
                        <li key={group} className="target-group" data-group={group} data-parts={parts && parts.length > 1 ? 'many' : 'one'}>
                            {parts ? (
                                parts.map((kind) => <TargetMark key={kind} kind={kind} style={style} name={t(`unit.attacks.kinds.${kind}`)} />)
                            ) : (
                                <>
                                    <TargetMark kind={group === 'land' ? 'land' : group} style={style} name={groupName} />
                                    <span className="target-group__name" aria-hidden="true">
                                        {groupName}
                                    </span>
                                </>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
