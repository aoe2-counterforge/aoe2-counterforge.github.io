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

describe('SpecialAttack replicating the unit attack', () => {
    const torch = () =>
        new SpecialAttack({
            role: 'charge',
            projectile: 2713,
            attack: new AttackProfile({ entries: [] }),
            range: 3,
            count: null,
            charge: { capacity: 1, rechargeRate: 100000 },
        });
    const sword = new AttackProfile({ entries: [{ armourClass: 'base-melee', amount: 8 }] });

    it('takes the unit attack when its own damage list is empty', () => {
        const thrown = torch().replicating(sword);

        expect([thrown.attack.melee, thrown.replicatesMain]).toEqual([8, true]);
    });

    it('takes the unit attack again once the unit has been upgraded', () => {
        const forged = new AttackProfile({ entries: [{ armourClass: 'base-melee', amount: 9 }] });

        const thrown = torch().replicating(sword).replicating(forged);

        expect(thrown.attack.melee).toBe(9);
    });

    it('leaves the damage changes to the unit, which already carries them', () => {
        const thrown = torch()
            .replicating(sword)
            .patched({ attack: [{ armourClass: 'base-melee', amount: 1 }], range: 1 });

        expect([thrown.attack.melee, thrown.range]).toEqual([8, 4]);
    });

    it('leaves an attack with a damage list of its own as it is', () => {
        const javelin = new SpecialAttack({
            role: 'charge',
            projectile: 2702,
            attack: new AttackProfile({ entries: [{ armourClass: 'base-pierce', amount: 6 }] }),
            range: 6,
            count: null,
            charge: null,
        });

        const thrown = javelin.replicating(sword);

        expect(thrown).toBe(javelin);
    });

    it('does not lend the unit attack to a secondary missile', () => {
        const secondary = new SpecialAttack({
            role: 'secondary',
            projectile: 510,
            attack: new AttackProfile({ entries: [] }),
            range: 4,
            count: 2,
            charge: null,
        });

        const thrown = secondary.replicating(sword);

        expect(thrown.attack.isEmpty()).toBe(true);
    });
});
