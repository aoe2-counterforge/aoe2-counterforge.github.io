import { describe, expect, it } from 'vitest';
import { BattleSimulator, type BattleSimulatorConfig } from '../../../../src/services/combat/battle-simulator.ts';
import { CombatService } from '../../../../src/services/combat/combat-service.ts';
import { DamageCalculator } from '../../../../src/services/combat/damage-calculator.ts';
import { makeStats } from '../../../fixtures/unit-builder.ts';

const combat = new CombatService({ damageCalculator: new DamageCalculator(), maxFreeHits: 6, kiteRepeats: 3 });

function simulator(overrides: Partial<BattleSimulatorConfig> = {}) {
    return new BattleSimulator({
        combat,
        armyValue: 1000,
        meleeFrontage: 4,
        kiteRepeats: 3,
        kiteOverheadSeconds: 0.2,
        ...overrides,
    });
}

const archer = makeStats({ hp: 40, range: 6, speed: 1, reloadTime: 2, attackDelay: 0.3, attacks: { 'base-pierce': 6 } });
const swordsman = makeStats({ hp: 60, range: 0, speed: 1, reloadTime: 2, attacks: { 'base-melee': 10 } });

describe('BattleSimulator', () => {
    it('buys each side as many units as the army value pays for', () => {
        const battle = simulator().fight({
            attacker: { stats: archer, value: 50 },
            defender: { stats: swordsman, value: 100 },
        });

        expect([battle.attacker.fielded, battle.defender.fielded]).toEqual([20, 10]);
    });

    it('lets two identical armies wear each other down evenly', () => {
        const battle = simulator().fight({
            attacker: { stats: swordsman, value: 100 },
            defender: { stats: swordsman, value: 100 },
        });

        expect(battle.attacker.lost).toBeCloseTo(battle.defender.lost, 5);
    });

    it('holds off a chaser of the same speed by walking away between shots', () => {
        const query = { attacker: { stats: archer, value: 100 }, defender: { stats: swordsman, value: 100 } };

        const kiting = simulator().fight(query);
        const standing = simulator({ kiteOverheadSeconds: Number.POSITIVE_INFINITY }).fight(query);

        expect(kiting.attacker.lost).toBeLessThan(standing.attacker.lost);
    });

    it('cannot kite with a shot that takes the whole reload to leave', () => {
        const slowShot = makeStats({ hp: 40, range: 6, speed: 1, reloadTime: 2, attackDelay: 2, attacks: { 'base-pierce': 6 } });
        const query = { attacker: { stats: slowShot, value: 100 }, defender: { stats: swordsman, value: 100 } };

        const kiting = simulator().fight(query);
        const standing = simulator({ kiteOverheadSeconds: Number.POSITIVE_INFINITY }).fight(query);

        expect(kiting.attacker.lost).toBeCloseTo(standing.attacker.lost, 5);
    });

    it('fights a melee army with only the units that fit around the enemy', () => {
        const query = { attacker: { stats: swordsman, value: 50 }, defender: { stats: swordsman, value: 100 } };

        const crowded = simulator({ meleeFrontage: 1 }).fight(query);
        const open = simulator({ meleeFrontage: 100 }).fight(query);

        expect(crowded.attacker.lost).toBeGreaterThan(open.attacker.lost);
    });
});
