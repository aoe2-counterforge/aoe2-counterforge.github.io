import { describe, expect, it } from 'vitest';
import { makeStats } from '../../../fixtures/unit-builder.ts';

describe('UnitStats hit chance', () => {
    it('always lands hits for a melee unit', () => {
        const stats = makeStats({ range: 0, accuracy: 80 });

        expect(stats.hitChance()).toBe(1);
    });

    it('applies the accuracy of a ranged unit', () => {
        const stats = makeStats({ range: 5, accuracy: 80 });

        expect(stats.hitChance()).toBe(0.8);
    });

    it('reads a recorded accuracy of zero as always hitting', () => {
        const stats = makeStats({ range: 7, accuracy: 0 });

        expect(stats.hitChance()).toBe(1);
    });

    it('reports the effective accuracy rather than the placeholder zero', () => {
        const stats = makeStats({ range: 7, accuracy: 0 });

        expect(stats.toRecord().accuracy).toBe(100);
    });
});

describe('UnitStats extra missiles copied from the main one', () => {
    it('hits with the unit attack, upgrades included', () => {
        const stats = makeStats({ attacks: { 'base-pierce': 9 }, extraProjectiles: 2, extrasRepeatMain: true });

        const upgraded = stats.patched({ attack: [{ armourClass: 'base-pierce', amount: 1 }] });

        expect(upgraded.secondaryAttack.pierce).toBe(10);
    });

    it('adds the missiles a technology gives each shot', () => {
        const stats = makeStats({ extraProjectiles: 2, extrasRepeatMain: true });

        const upgraded = stats.patched({ projectiles: 2 });

        expect(upgraded.extraProjectiles).toBe(4);
    });

    it('leaves the count of secondary missiles to the special attack that carries them', () => {
        const stats = makeStats({ extraProjectiles: 2, secondaryAttacks: { 'base-pierce': 3 } });

        const upgraded = stats.patched({ projectiles: 1 });

        expect([upgraded.extraProjectiles, upgraded.secondaryAttack.pierce]).toEqual([2, 3]);
    });
});
