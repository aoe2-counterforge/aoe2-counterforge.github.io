import { describe, expect, it } from 'vitest';
import type { RosterLine, RosterStep } from '../../../src/services/game-catalog/game-catalog-service.ts';
import { categoryLines, hasGaps } from '../../../src/react/category-lines.ts';
import { makeUnit } from '../../fixtures/unit-builder.ts';

function step(key: string, available = true): RosterStep[] {
    return [{ unit: makeUnit({ key, line: 'knight', category: 'cavalry' }), available }];
}

const knightLine: RosterLine = { line: 'knight', steps: [step('knight'), step('cavalier'), step('paladin')] };
const trebuchet: RosterLine = { line: 'trebuchet', steps: [step('trebuchet')] };
const ram: RosterLine = { line: 'ram', steps: [step('ram')] };

describe('categoryLines', () => {
    it('keeps the chains apart from the units that upgrade into nothing', () => {
        const group = categoryLines('cavalry', [knightLine, trebuchet, ram]);

        expect(group).toEqual({
            category: 'cavalry',
            chains: [knightLine],
            standalone: [...trebuchet.steps, ...ram.steps],
        });
    });

    it('has nothing to say of a category without lines', () => {
        const group = categoryLines('cavalry', []);

        expect(group).toBeNull();
    });
});

describe('hasGaps', () => {
    it('is false while every step is reached', () => {
        const groups = [{ category: 'cavalry' as const, chains: [knightLine], standalone: trebuchet.steps }];

        const gaps = hasGaps(groups);

        expect(gaps).toBe(false);
    });

    it('is true for a chain with a step never reached', () => {
        const faded: RosterLine = { line: 'knight', steps: [step('knight'), step('cavalier'), step('paladin', false)] };
        const groups = [{ category: 'cavalry' as const, chains: [faded], standalone: [] }];

        const gaps = hasGaps(groups);

        expect(gaps).toBe(true);
    });

    it('is true for a lone unit never reached', () => {
        const groups = [{ category: 'cavalry' as const, chains: [], standalone: step('trebuchet', false).map((entry) => [entry]) }];

        const gaps = hasGaps(groups);

        expect(gaps).toBe(true);
    });
});
