import { useSyncExternalStore } from 'react';

/** What a target is drawn as: a hand-drawn glyph, the game's own portrait, a glyph struck on a seal, or plain words. */
export type TargetStyle = 'glyph' | 'portrait' | 'seal' | 'text';

const STYLE_BY_CODE: Record<string, TargetStyle> = { a: 'glyph', b: 'portrait', c: 'seal', text: 'text' };
const DEFAULT_STYLE: TargetStyle = 'seal';

/** The style picked by the ?targets= switch stays for the rest of the visit, even as the address changes. */
let chosen: TargetStyle | null = null;

function currentStyle(): TargetStyle {
    const code = new URLSearchParams(window.location.search).get('targets');
    if (code && code in STYLE_BY_CODE) chosen = STYLE_BY_CODE[code] ?? null;

    return chosen ?? DEFAULT_STYLE;
}

function subscribe(): () => void {
    return () => undefined;
}

/**
 * The style target icons are drawn in, switchable while the spike is compared.
 *
 * @returns The style named by the ?targets=a|b|c address parameter, or the default one.
 */
export function useTargetStyle(): TargetStyle {
    return useSyncExternalStore(subscribe, currentStyle, () => DEFAULT_STYLE);
}
