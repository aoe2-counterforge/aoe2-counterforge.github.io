import { FuzzyMatcher, normalize } from '../services/search/fuzzy-matcher.ts';
import type { PickerOption } from './components/picker.tsx';

/** Above this many entries, scanning a list stops working and typing takes over. */
const SEARCH_FROM = 10;

/**
 * Tells whether a list is long enough to be narrowed by typing rather than scanned.
 *
 * @param count - How many options the list holds.
 * @returns True once scanning stops working.
 */
export function needsFilter(count: number): boolean {
    return count > SEARCH_FROM;
}

/** The same scoring the command palette uses, so "brt" finds the Britons in a picker too. */
const matcher = new FuzzyMatcher();

/**
 * Keeps the options a typed filter still matches, best match first.
 *
 * @param options - Every option the list can show, in its resting order.
 * @param term - Raw text from the filter; accents and case do not count.
 * @returns The options untouched while the filter is blank, otherwise the matches ranked by score.
 */
export function narrowOptions<T extends PickerOption>(options: readonly T[], term: string): readonly T[] {
    const fragment = normalize(term.trim());
    if (!fragment) return options;

    return options
        .map((option) => ({ option, match: matcher.match(fragment, normalize(option.label)) }))
        .filter((entry) => entry.match !== null)
        .sort((left, right) => (right.match?.score ?? 0) - (left.match?.score ?? 0))
        .map((entry) => entry.option);
}
