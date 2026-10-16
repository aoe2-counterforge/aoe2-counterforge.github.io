import { describe, expect, it } from 'vitest';
import type { SpecialAttackRecord } from '../../../../src/data/records.ts';
import { CatalogAssembler } from '../../../../src/services/game-catalog/catalog-assembler.ts';
import { unitRecord } from '../../../fixtures/records.ts';

function secondary(count: number, classes: readonly string[] = ['base-pierce']): SpecialAttackRecord {
    return {
        role: 'secondary',
        projectile: 510,
        attacks: classes.map((armourClass) => ({ class: armourClass, amount: 3 })),
        range: 4,
        count,
    };
}

function charged(capacity: number, classes: readonly string[] = ['base-pierce']): SpecialAttackRecord {
    return {
        role: 'charge',
        projectile: 900,
        attacks: classes.map((armourClass) => ({ class: armourClass, amount: 5 })),
        range: 5,
        charge: { capacity, rechargeRate: 0.25 },
    };
}

function roles(specialAttacks: SpecialAttackRecord[]): string[] {
    const unit = new CatalogAssembler().toUnit(unitRecord({ key: 'unit', specialAttacks }));

    return unit.activeSpecialAttacks.map((attack) => attack.role);
}

describe('Unit active special attacks', () => {
    it('leaves out a secondary missile that no ordinary shot fires', () => {
        const active = roles([secondary(0)]);

        expect(active).toEqual([]);
    });

    it('keeps a secondary missile that flies with the ordinary shot', () => {
        const active = roles([secondary(2)]);

        expect(active).toEqual(['secondary']);
    });

    it('keeps a secondary missile that is the arrows of the unit charged volley', () => {
        const active = roles([secondary(0, ['spearman', 'base-pierce']), charged(1, ['base-pierce', 'spearman'])]);

        expect(active).toEqual(['secondary', 'charge']);
    });

    it('leaves out an idle secondary beside a charge whose missile hits other classes', () => {
        const active = roles([secondary(0, ['all-buildings', 'base-melee']), charged(1, ['base-pierce', 'ship'])]);

        expect(active).toEqual(['charge']);
    });

    it('leaves out a charge the unit holds no charge for yet', () => {
        const active = roles([charged(0)]);

        expect(active).toEqual([]);
    });

    it('does not count an idle secondary as part of a volley that cannot fire', () => {
        const active = roles([secondary(0), charged(0)]);

        expect(active).toEqual([]);
    });
});

describe('Unit charged attack without damage of its own', () => {
    const torch: SpecialAttackRecord = {
        role: 'charge',
        projectile: 2713,
        attacks: [],
        range: 3,
        charge: { capacity: 1, rechargeRate: 100000 },
    };

    function jomsviking() {
        return new CatalogAssembler().toUnit(
            unitRecord({ key: 'jomsviking', attacks: { 'base-melee': 8, 'standard-building': 6 }, specialAttacks: [torch] }),
        );
    }

    it('throws the unit own attack, bonus classes included', () => {
        const attack = jomsviking().activeSpecialAttack('charge');

        expect([attack?.attack.melee, attack?.attack.valueFor('standard-building')]).toEqual([8, 6]);
    });

    it('keeps the reach the missile gives it', () => {
        const attack = jomsviking().activeSpecialAttack('charge');

        expect(attack?.range).toBe(3);
    });

    it('keeps a damage list the game did write for the missile', () => {
        const unit = new CatalogAssembler().toUnit(
            unitRecord({ key: 'hearth-troop', attacks: { 'base-melee': 9 }, specialAttacks: [charged(1)] }),
        );

        const attack = unit.activeSpecialAttack('charge');

        expect([attack?.attack.pierce, attack?.replicatesMain]).toEqual([5, false]);
    });
});
