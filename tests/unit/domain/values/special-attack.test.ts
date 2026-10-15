import { describe, expect, it } from 'vitest';
import { AttackProfile } from '../../../../src/domain/values/attack-profile.ts';
import { SpecialAttack, type ChargeConfig } from '../../../../src/domain/values/special-attack.ts';

function javelin(charge: ChargeConfig | null): SpecialAttack {
    return new SpecialAttack({
        role: 'charge',
        projectile: 2702,
        attack: new AttackProfile({ entries: [{ armourClass: 'base-pierce', amount: 6 }, { armourClass: 'archer', amount: 3 }] }),
        range: 6,
        count: null,
        charge,
    });
}

describe('SpecialAttack', () => {
    it('takes the capacity over the rate to fill a spent charge', () => {
        const attack = javelin({ capacity: 1, rechargeRate: 0.0625 });

        const seconds = attack.rechargeTime();

        expect(seconds).toBe(16);
    });

    it('has no recharge time while it holds no charge', () => {
        const attack = javelin({ capacity: 0, rechargeRate: 0.04 });

        const seconds = attack.rechargeTime();

        expect(seconds).toBeNull();
    });

    it('scales, then adds, then moves its reach', () => {
        const attack = javelin(null);

        const upgraded = attack.patched({
            attackMultipliers: [{ armourClass: 'archer', amount: 2 }],
            attack: [{ armourClass: 'base-pierce', amount: 1 }],
            range: 1,
        });

        expect([upgraded.attack.pierce, upgraded.attack.valueFor('archer'), upgraded.range]).toEqual([7, 6, 7]);
    });
});
