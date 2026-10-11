/** A roster one unit a row, or one upgrade line a row; the list is the default. */
export const ROSTER_VIEWS = ['list', 'lines'] as const;

export type RosterView = (typeof ROSTER_VIEWS)[number];
