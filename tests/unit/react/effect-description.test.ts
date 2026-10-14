import { describe, expect, it } from 'vitest';
import { describeEffect, describeRate } from '../../../src/react/effect-description.ts';
import { translator } from '../../fixtures/translator.ts';

const t = translator();

describe('describeEffect', () => {
    it('writes an added value with its sign', () => {
        const labels = describeEffect({ hp: 20 }, t);

        expect(labels).toEqual(['+20 HP']);
    });

    it('says a unit gained a charge attack', () => {
        const labels = describeEffect({ charge: true }, t);

        expect(labels).toEqual(['Gains a charge attack']);
    });

    it('names the unit a technology turns another into', () => {
        const labels = describeEffect({ upgradesTo: ['war-galley'] }, t, () => 'War Galley');

        expect(labels).toEqual(['Upgrades to War Galley']);
    });

    it('says where a unit becomes trainable and how many a technology spawns', () => {
        const labels = describeEffect({ trainableAt: ['barracks'], spawns: 5 }, t);

        expect(labels).toEqual(['Spawns 5', 'Trainable at the Barracks']);
    });

    it('writes a population share as the percentage it takes away', () => {
        const labels = describeEffect({ populationMultiplier: 0.8 }, t);

        expect(labels).toEqual(['-20% population space']);
    });

    it('puts the projectile count in the plural when there are several', () => {
        const labels = [describeEffect({ projectiles: 1 }, t), describeEffect({ projectiles: 6 }, t)];

        expect(labels).toEqual([['+1 projectile'], ['+6 projectiles']]);
    });

    it('writes a factor as the percentage it adds', () => {
        const labels = describeEffect({ hpMultiplier: 1.2 }, t);

        expect(labels).toEqual(['+20% HP']);
    });

    it('names the damage class an attack bonus applies to', () => {
        const labels = describeEffect({ attack: [{ armourClass: 'archer', amount: 4 }] }, t);

        expect(labels).toEqual(['+4 attack vs Archers']);
    });

    it('leaves the class out for the plain attack value', () => {
        const labels = describeEffect({ attack: [{ armourClass: 'base-melee', amount: 3 }] }, t);

        expect(labels).toEqual(['+3 attack']);
    });

    it('states a factor once when it covers the whole damage table', () => {
        const labels = describeEffect(
            {
                attackMultipliers: [
                    { armourClass: 'archer', amount: 1.25 },
                    { armourClass: 'cavalry', amount: 1.25 },
                    { armourClass: 'infantry', amount: 1.25 },
                    { armourClass: 'monk', amount: 1.25 },
                ],
            },
            t,
        );

        expect(labels).toEqual(['+25% attack']);
    });

    it('keeps the classes apart while a factor reaches only a couple of them', () => {
        const labels = describeEffect(
            {
                attackMultipliers: [
                    { armourClass: 'archer', amount: 1.25 },
                    { armourClass: 'cavalry', amount: 1.25 },
                ],
            },
            t,
        );

        expect(labels).toEqual(['+25% attack vs Archers', '+25% attack vs Cavalry']);
    });

    it('splits a per-age bonus into the share each age grants', () => {
        const labels = describeEffect({ perAge: 3, attack: [{ armourClass: 'base-melee', amount: 3 }] }, t);

        expect(labels).toEqual(['+1 attack per age']);
    });

    it('says nothing for an effect the guide puts no number on', () => {
        const labels = describeEffect({}, t);

        expect(labels).toEqual([]);
    });
});

describe('describeRate', () => {
    it('names the villagers and the resource for a gathering rate', () => {
        const label = describeRate({ kind: 'gatherRate', resource: 'gold', factor: 1.15 }, t);

        expect(label).toBe('Villagers gather gold 15% faster.');
    });

    it('words a trade rate as trading, not as training', () => {
        const label = describeRate({ kind: 'tradeRate', resource: undefined, factor: 1.2 }, t);

        expect(label).toBe('Trade units earn 20% faster.');
    });
});
