import { describe, expect, it } from 'vitest';
import { countersReason } from '../../../src/react/counters-reason.ts';
import { makeUnit } from '../../fixtures/unit-builder.ts';

describe('countersReason', () => {
    it('keeps the conversion wording for a monk without an attack', () => {
        const monk = makeUnit({ category: 'monk', attacks: {} });

        const reason = countersReason(monk);

        expect(reason).toBe('counters.noAttackConverter');
    });

    it('gives a neutral wording to a non-converting unit without an attack', () => {
        const tradeCart = makeUnit({ category: 'civilian', attacks: {} });

        const reason = countersReason(tradeCart);

        expect(reason).toBe('counters.noAttack');
    });

    it('explains a demolition unit by its own wording', () => {
        const ram = makeUnit({ category: 'siege', tags: ['demolition'] });

        const reason = countersReason(ram);

        expect(reason).toBe('counters.demolition');
    });

    it('has no reason for a unit that fights', () => {
        const swordsman = makeUnit();

        const reason = countersReason(swordsman);

        expect(reason).toBeNull();
    });
});
