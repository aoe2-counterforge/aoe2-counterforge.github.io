import { describe, expect, it } from 'vitest';
import { needsFilter, pickerFilter } from '../../../src/react/picker-search.ts';

const options = [
    { value: 'archer', label: 'Archer' },
    { value: 'man-at-arms', label: 'Man-at-Arms' },
    { value: 'mangudai', label: 'Mangudai' },
    { value: 'militia', label: 'Militia' },
];

describe('needsFilter', () => {
    it('leaves a short list to be scanned', () => {
        expect(needsFilter(10)).toBe(false);
    });

    it('asks for typing once the list grows past a screen', () => {
        expect(needsFilter(11)).toBe(true);
    });
});

describe('pickerFilter', () => {
    const filter = pickerFilter();

    it('keeps every option while nothing is typed', () => {
        const kept = filter.filter(options, '   ');

        expect(kept).toBe(options);
    });

    it('finds a hyphenated name from words typed with a space', () => {
        const kept = filter.filter(options, 'man at');

        expect(kept.map((option) => option.value)).toEqual(['man-at-arms']);
    });

    it('drops the names a typed word is nowhere near', () => {
        const kept = filter.filter(options, 'zzz');

        expect(kept).toEqual([]);
    });

    it('puts the name that holds the typed letters whole first', () => {
        const kept = filter.filter(options, 'mil');

        expect(kept[0]?.value).toBe('militia');
    });

    it('ignores accents and case', () => {
        const kept = filter.filter([{ value: 'militia', label: 'Milícia' }], 'MILIC');

        expect(kept.map((option) => option.value)).toEqual(['militia']);
    });
});
