import { describe, expect, it } from 'vitest';
import { AttackProfile } from '../../../src/domain/values/attack-profile.ts';
import { SpecialAttack } from '../../../src/domain/values/special-attack.ts';
import { attackRows, cadenceOf } from '../../../src/react/attack-rows.ts';

function charged(rechargeRate: number, capacity = 1): SpecialAttack {
    return new SpecialAttack({
        role: 'charge',
        projectile: 1,
        attack: new AttackProfile({ entries: [{ armourClass: 'base-pierce', amount: 5 }] }),
        range: 4,
        count: null,
        charge: { capacity, rechargeRate },
    });
}

function secondary(count: number, maxCount: number): SpecialAttack {
    return new SpecialAttack({
        role: 'secondary',
        projectile: 2,
        attack: new AttackProfile({ entries: [{ armourClass: 'base-pierce', amount: 1 }] }),
        range: 4,
        count,
        maxCount,
        charge: null,
    });
}

describe('cadenceOf', () => {
    it('tells a charged attack by the time it takes to come back', () => {
        const cadence = cadenceOf(charged(0.0625));

        expect(cadence).toEqual({ kind: 'recharge', seconds: 16 });
    });

    it('says a charge the game refills at once goes off with each attack', () => {
        const cadence = cadenceOf(charged(100000));

        expect(cadence).toEqual({ kind: 'eachAttack' });
    });

    it('says extra projectiles fly with each shot', () => {
        const cadence = cadenceOf(secondary(2, 2));

        expect(cadence).toEqual({ kind: 'eachShot' });
    });

    it('has no cadence for a charge that holds nothing to refill', () => {
        const cadence = cadenceOf(charged(0.1, 0));

        expect(cadence).toBeNull();
    });
});

describe('attackRows', () => {
    it('gives each attack that fires on its own a row', () => {
        const rows = attackRows([secondary(2, 2), charged(0.1)]);

        expect(rows.map((row) => row.role)).toEqual(['secondary', 'charge']);
    });

    it('folds the extra missiles of a charged volley into the charged attack row', () => {
        const rows = attackRows([secondary(0, 5), charged(0.033)]);

        expect(rows.map((row) => [row.role, row.volley?.most])).toEqual([['charge', 5]]);
    });

    it('keeps the base attack beside an upgraded one to compare with', () => {
        const base = charged(0.1);

        const rows = attackRows([base], [base.patched({ range: 1 })]);

        expect([rows[0]?.attack.range, rows[0]?.before?.range]).toEqual([5, 4]);
    });
});
