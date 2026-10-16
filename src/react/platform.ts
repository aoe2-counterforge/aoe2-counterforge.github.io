/**
 * Whether the reader's keyboard says Command where everyone else's says Control.
 *
 * @returns True on Apple hardware, where shortcuts answer to the meta key.
 */
export function isApple(): boolean {
    return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
}
