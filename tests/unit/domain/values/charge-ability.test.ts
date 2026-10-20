import { describe, expect, it } from 'vitest';
import { ChargeAbility } from '../../../../src/domain/values/charge-ability.ts';

describe('ChargeAbility', () => {
    it('comes back once the whole charge is regained for a charged blow', () => {
        const blow = new ChargeAbility({ kind: 'blow', capacity: 20, rechargeRate: 0.5 });

        expect([blow.amount, blow.cycleTime()]).toEqual([20, 40]);
    });

    it('regains one dodge for each point of charge', () => {
        const dodge = new ChargeAbility({ kind: 'dodge', capacity: 5, rechargeRate: 0.25 });

        expect([dodge.amount, dodge.cycleTime()]).toEqual([5, 4]);
    });

    it('waits for its charge to fill before blocking again', () => {
        const block = new ChargeAbility({ kind: 'block', capacity: 1, rechargeRate: 0.025 });

        expect(block.cycleTime()).toBe(40);
    });

    it('keeps the reach and share of a charged blast', () => {
        const blast = new ChargeAbility({
            kind: 'blast',
            capacity: 12,
            rechargeRate: 0.5,
            blast: { radius: 0.75, share: 0.5 },
        });

        expect([blast.cycleTime(), blast.blast]).toEqual([24, { radius: 0.75, share: 0.5 }]);
    });
});
