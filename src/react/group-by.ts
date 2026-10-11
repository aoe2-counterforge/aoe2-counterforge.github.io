/**
 * Gathers items under the key each one yields, in the order the keys are first met.
 *
 * @param items - What to group.
 * @param keyOf - The key an item is filed under.
 * @returns One group per distinct key, each holding its items in their original order.
 */
export function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): T[][] {
    const groups = new Map<string, T[]>();
    for (const item of items) {
        const key = keyOf(item);
        const group = groups.get(key);
        if (group) group.push(item);
        else groups.set(key, [item]);
    }

    return [...groups.values()];
}
