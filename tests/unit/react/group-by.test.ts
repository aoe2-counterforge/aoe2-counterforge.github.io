import { describe, expect, it } from 'vitest';
import { groupBy } from '../../../src/react/group-by.ts';

describe('groupBy', () => {
    it('files items under the key each one yields', () => {
        const items = [
            { line: 'knight', key: 'knight' },
            { line: 'archer', key: 'archer' },
            { line: 'knight', key: 'cavalier' },
        ];

        const groups = groupBy(items, (item) => item.line);

        expect(groups).toEqual([
            [
                { line: 'knight', key: 'knight' },
                { line: 'knight', key: 'cavalier' },
            ],
            [{ line: 'archer', key: 'archer' }],
        ]);
    });

    it('keeps the groups in the order their keys are first met', () => {
        const groups = groupBy(['b', 'a', 'b', 'c', 'a'], (item) => item);

        expect(groups.map((group) => group[0])).toEqual(['b', 'a', 'c']);
    });

    it('yields nothing for nothing', () => {
        const groups = groupBy([], () => 'any');

        expect(groups).toEqual([]);
    });
});
