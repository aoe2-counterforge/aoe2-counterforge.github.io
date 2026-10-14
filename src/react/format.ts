import { numberLocale } from '../i18n/number-locale.ts';

const formatters = new Map<string, Intl.NumberFormat>();

/** A formatter for the interface's language, kept so that formatting a column does not rebuild it. */
function formatter(decimals: number): Intl.NumberFormat {
    const locale = numberLocale();
    const id = `${locale ?? ''}|${String(decimals)}`;
    const known = formatters.get(id);
    if (known) return known;

    const created = new Intl.NumberFormat(locale, { maximumFractionDigits: decimals });
    formatters.set(id, created);

    return created;
}

/**
 * Formats a number with at most one decimal, dropping a trailing zero.
 *
 * @param value - Raw number.
 * @returns A short, locale-aware string.
 */
export function short(value: number): string {
    return formatter(1).format(value);
}

/**
 * Formats a number with at most two decimals.
 *
 * @param value - Raw number.
 * @returns A precise, locale-aware string.
 */
export function precise(value: number): string {
    return formatter(2).format(value);
}

/**
 * Formats a signed delta, keeping the plus sign for gains.
 *
 * @param value - Difference between two stats.
 * @returns The signed string, or an empty string when there is no change.
 */
export function delta(value: number): string {
    if (Math.abs(value) < 0.001) return '';

    return `${value > 0 ? '+' : ''}${short(value)}`;
}

/**
 * Formats a signed delta with up to two decimals, for the small ones one decimal would round away.
 *
 * @param value - Difference between two stats.
 * @returns The signed string, or an empty string when there is no change.
 */
export function preciseDelta(value: number): string {
    if (Math.abs(value) < 0.001) return '';

    return `${value > 0 ? '+' : ''}${precise(value)}`;
}

/**
 * Formats a multiplier as a percentage change.
 *
 * @param multiplier - Factor applied to a stat, where 1 means unchanged.
 * @returns The signed percentage string.
 */
export function percentDelta(multiplier: number): string {
    return delta((multiplier - 1) * 100);
}

/**
 * Formats a trade efficiency ratio.
 *
 * Above ten the decimals stop carrying information and only make the column harder to scan.
 *
 * @param value - Ratio where one means an even trade.
 * @returns The ratio with its multiplier sign.
 */
export function efficiency(value: number): string {
    return `${value >= 10 ? Math.round(value) : precise(value)}x`;
}

/**
 * Address of a shipped file, honouring the deployment base path.
 *
 * The base path is absolute, so the result holds from any page depth and from inside a stylesheet,
 * where a relative url() would resolve against the stylesheet rather than the page.
 *
 * @param relativePath - Path inside the public folder, such as "brand.svg".
 * @returns A path the browser can request from anywhere on the site.
 */
export function assetUrl(relativePath: string): string {
    return `${import.meta.env.BASE_URL}${relativePath}`;
}

/**
 * Path to a shipped icon, honouring the deployment base path.
 *
 * @param relativePath - Path inside the icon folder, such as "Unit/17.png".
 * @returns A URL the browser can request.
 */
export function iconUrl(relativePath: string): string {
    return assetUrl(`img/${relativePath}`);
}

/**
 * Path of a unit's sprite inside the icon folder.
 *
 * @param icon - Sprite number the unit carries, or null when it ships without one.
 * @returns The path, or null when there is no sprite to show.
 */
export function unitIconPath(icon: number | null): string | null {
    return icon === null ? null : `Unit/${String(icon)}.png`;
}

/**
 * Path of a technology's sprite inside the icon folder.
 *
 * @param icon - Sprite number the technology carries, or null when it ships without one.
 * @returns The path, or null when there is no sprite to show.
 */
export function techIconPath(icon: number | null): string | null {
    return icon === null ? null : `Tech/${String(icon)}.png`;
}
