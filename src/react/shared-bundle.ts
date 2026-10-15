/** One thing a technology changes, with the changes it makes in the words the reader sees. */
export interface BundleEntry<T> {
    item: T;
    effects: readonly string[];
}

/** An entry with what to say beside it: nothing when it gets the shared bundle. */
export interface BundledEntry<T> {
    item: T;
    /** The changes to state beside the item, or null when it gets exactly the shared bundle. */
    own: string[] | null;
}

export interface SharedBundle<T> {
    /** The changes most entries share, stated once. */
    shared: string[];
    entries: BundledEntry<T>[];
}

const keyOf = (effects: readonly string[]) => effects.join('|');

/**
 * Finds the bundle of changes most entries share and says what each other entry adds to it.
 *
 * Fletching gives every archer the same three changes and gives the Fire Archer two more; saying
 * the three once and the two beside the Fire Archer reads better than a second list of all five.
 * An entry whose changes include the shared bundle states only the extras; one that does not
 * states its complete set, since extras alone would hide what it lacks.
 *
 * @param entries - Each item with its changes; their order is kept.
 * @returns The shared bundle, and for each entry what to state beside it.
 */
export function sharedBundle<T>(entries: readonly BundleEntry<T>[]): SharedBundle<T> {
    const counts = new Map<string, { effects: readonly string[]; count: number }>();
    for (const entry of entries) {
        const known = counts.get(keyOf(entry.effects));
        if (known) known.count += 1;
        else counts.set(keyOf(entry.effects), { effects: entry.effects, count: 1 });
    }

    // Earliest wins a tie, which keeps the choice stable for a fixed unit order.
    const shared = [...counts.values()].reduce<{ effects: readonly string[]; count: number } | null>(
        (best, candidate) => (best === null || candidate.count > best.count ? candidate : best),
        null,
    );
    const common = new Set(shared?.effects ?? []);

    return {
        shared: [...(shared?.effects ?? [])],
        entries: entries.map((entry) => {
            if (keyOf(entry.effects) === keyOf(shared?.effects ?? [])) return { item: entry.item, own: null };

            const holdsAll = [...common].every((effect) => entry.effects.includes(effect));
            const own = holdsAll && common.size > 0 ? entry.effects.filter((effect) => !common.has(effect)) : [...entry.effects];

            return { item: entry.item, own };
        }),
    };
}
