/** A roster one unit a row, or one upgrade line a row. */
export type RosterView = 'list' | 'lines';

const ROSTER_VIEWS: readonly RosterView[] = ['list', 'lines'];

/**
 * Whether an address names one of the two ways to show a roster.
 *
 * @param value - The parameter as read from the address, if any.
 * @returns True for `list` or `lines`.
 */
export function isRosterView(value: string | null): value is RosterView {
    return ROSTER_VIEWS.includes((value ?? '') as RosterView);
}
