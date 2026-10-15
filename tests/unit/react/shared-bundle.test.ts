import { describe, expect, it } from 'vitest';
import { sharedBundle } from '../../../src/react/shared-bundle.ts';

const ARCHER = ['+1 range', '+1 line of sight', '+1 attack'];

describe('sharedBundle', () => {
    it('states the bundle most entries share once and nothing beside the entries that have it', () => {
        const entries = [
            { item: 'archer', effects: ARCHER },
            { item: 'skirmisher', effects: ARCHER },
        ];

        const result = sharedBundle(entries);

        expect(result).toEqual({
            shared: ARCHER,
            entries: [
                { item: 'archer', own: null },
                { item: 'skirmisher', own: null },
            ],
        });
    });

    it('gives an entry that holds the shared bundle only what it adds', () => {
        const entries = [
            { item: 'archer', effects: ARCHER },
            { item: 'crossbowman', effects: ARCHER },
            { item: 'fire-archer', effects: [...ARCHER, '+1 charged attack', '+1 charged attack range'] },
        ];

        const result = sharedBundle(entries);

        expect(result.entries[2]).toEqual({
            item: 'fire-archer',
            own: ['+1 charged attack', '+1 charged attack range'],
        });
    });

    it('gives an entry that lacks part of the shared bundle its complete set', () => {
        const entries = [
            { item: 'archer', effects: ARCHER },
            { item: 'crossbowman', effects: ARCHER },
            { item: 'hearth-troop', effects: ['+1 line of sight', '+1 charged attack', '+1 charged attack range'] },
        ];

        const result = sharedBundle(entries);

        expect(result.entries[2].own).toEqual(['+1 line of sight', '+1 charged attack', '+1 charged attack range']);
    });

    it('takes the bundle with the most entries and, on a tie, the one met first', () => {
        const entries = [
            { item: 'a', effects: ['x'] },
            { item: 'b', effects: ['y'] },
            { item: 'c', effects: ['y'] },
            { item: 'd', effects: ['x'] },
        ];

        const result = sharedBundle(entries);

        expect(result.shared).toEqual(['x']);
    });

    it('gives an entry with no numbers an empty set beside a shared bundle', () => {
        const entries = [
            { item: 'a', effects: ['x'] },
            { item: 'b', effects: ['x'] },
            { item: 'c', effects: [] },
        ];

        const result = sharedBundle(entries);

        expect(result.entries[2].own).toEqual([]);
    });

    it('has nothing to share when there are no entries', () => {
        const result = sharedBundle([]);

        expect(result).toEqual({ shared: [], entries: [] });
    });
});
