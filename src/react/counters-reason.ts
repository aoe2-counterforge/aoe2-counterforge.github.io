import type { Unit } from '../domain/entities/unit.ts';

/** The locale key explaining why a unit has no matchup ranking, or null when it has one. */
export type CountersReason =
    | 'counters.demolition'
    | 'counters.slowSiege'
    | 'counters.noAttack'
    | 'counters.noAttackConverter'
    | null;

/**
 * Decides why a unit is left out of the matchup ranking.
 *
 * Only units of the monk class convert, so the conversion wording is kept for them
 * and every other unit without an attack gets the neutral one.
 *
 * @param unit - The unit whose counters page is shown.
 * @returns The locale key of the explanation, or null when the unit is ranked.
 */
export function countersReason(unit: Unit): CountersReason {
    // A demolition unit with a reload fires again; only the one that has none spends itself in a blow.
    if (unit.hasTag('demolition')) return unit.stats.reloadTime > 0 ? 'counters.slowSiege' : 'counters.demolition';
    if (unit.stats.canAttack()) return null;

    return unit.category === 'monk' ? 'counters.noAttackConverter' : 'counters.noAttack';
}
