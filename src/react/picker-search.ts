import { FuzzyFilterStrategy } from '@select-box/addon-fuzzy';
import type { OptionFilterStrategy } from '@select-box/core';

/** Above this many entries, scanning a list stops working and typing takes over. */
const SEARCH_FROM = 10;

/** How far a typed word may drift from a name and still find it, from 0 for exact to 1 for anything. */
const TOLERANCE = 0.4;

/**
 * Tells whether a list is long enough to be narrowed by typing rather than scanned.
 *
 * @param count - How many options the list holds.
 * @returns True once scanning stops working.
 */
export function needsFilter(count: number): boolean {
    return count > SEARCH_FROM;
}

/**
 * The matching every picker narrows its list with: fuzzy, ranked, blind to case and accents.
 *
 * @returns A filter for one select box.
 */
export function pickerFilter<TExtra extends object>(): OptionFilterStrategy<TExtra> {
    // Where in the name the letters sit does not count, so "arms" still lands on the Man-at-Arms.
    return new FuzzyFilterStrategy<TExtra>({ threshold: TOLERANCE, ignoreLocation: true, ignoreDiacritics: true });
}
