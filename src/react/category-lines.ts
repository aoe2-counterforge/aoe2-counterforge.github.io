import type { UnitCategory } from '../domain/enums/unit-category.ts';
import type { RosterLine, RosterStep } from '../services/game-catalog/game-catalog-service.ts';

/** The upgrade lines of one category: the chains, and the units that upgrade into nothing. */
export interface CategoryLines {
    category: UnitCategory;
    chains: RosterLine[];
    /** Units that upgrade into nothing, each drawn as a row of its own. */
    standalone: RosterStep[][];
}

/**
 * Sorts the lines of a category into chains and the lone units that would not make one.
 *
 * @param category - Category the lines belong to.
 * @param lines - Every line of that category.
 * @returns The chains and the standalone steps, or null when the category holds neither.
 */
export function categoryLines(category: UnitCategory, lines: readonly RosterLine[]): CategoryLines | null {
    const chains = lines.filter((line) => line.steps.length > 1);
    const standalone = lines.filter((line) => line.steps.length === 1).flatMap((line) => line.steps);
    if (chains.length === 0 && standalone.length === 0) return null;

    return { category, chains, standalone };
}

/**
 * Whether any line in the groups carries a step it never reaches.
 *
 * @param groups - Lines by category.
 * @returns True when at least one step is drawn faded.
 */
export function hasGaps(groups: readonly CategoryLines[]): boolean {
    return groups.some((group) =>
        [...group.chains.flatMap((line) => line.steps), ...group.standalone].some((step) =>
            step.some((entry) => !entry.available),
        ),
    );
}
