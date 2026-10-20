import { beforeEach, describe, expect, it } from 'vitest';
import { setNumberLocale } from '../../../src/i18n/number-locale.ts';
import { describeEffect, describeRate } from '../../../src/react/effect-description.ts';
import { translator } from '../../fixtures/translator.ts';

const t = translator();

beforeEach(() => {
    setNumberLocale('en');
});

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

    it('words a scaled monk faith recharge as regaining faith faster, never as rate of fire', () => {
        const labels = describeEffect({ faithMultiplier: 1.875 }, t);

        expect(labels).toEqual(['Regains faith 87.5% faster']);
    });

    it('names the resource a unit carries more of', () => {
        const labels = describeEffect({ carry: [{ mode: 'add', value: 1, resource: 'food' }] }, t);

        expect(labels).toEqual(['Carries +1 food']);
    });

    it('writes a price change and a price set outright', () => {
        const labels = describeEffect(
            {
                costChanges: [
                    { mode: 'add', resource: 'gold', value: -20 },
                    { mode: 'set', resource: 'wood', value: 0 },
                ],
            },
            t,
        );

        expect(labels).toEqual(['-20 gold cost', 'wood cost set to 0']);
    });

    it('writes a blast radius factor and a shot that passes through', () => {
        const labels = describeEffect({ blastMultiplier: 1.2, passThrough: true }, t);

        expect(labels).toEqual(['Shots pass through targets', '+20% blast radius']);
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
});

describe('describeEffect special attacks', () => {
    const pierce = [{ armourClass: 'base-pierce' as const, amount: 1 }];

    it('words a charged attack gain apart from the unit gain', () => {
        const labels = describeEffect(
            { lineOfSight: 1, attack: pierce, range: 1, special: { charge: { attack: pierce, range: 1 } } },
            t,
        );

        expect(labels).toEqual(['+1 range', '+1 line of sight', '+1 attack', '+1 charged attack', '+1 charged attack range']);
    });

    it('words the Hearth Troop gain without a unit attack chip', () => {
        const labels = describeEffect({ lineOfSight: 1, special: { charge: { attack: pierce, range: 1 } } }, t);

        expect(labels).toEqual(['+1 line of sight', '+1 charged attack', '+1 charged attack range']);
    });

    it('words a gain on extra projectiles', () => {
        const labels = describeEffect({ special: { secondary: { attack: pierce } } }, t);

        expect(labels).toEqual(['+1 extra projectile attack']);
    });

    it('states a broad factor on a charged attack once, as a percentage', () => {
        const classes = (['all-buildings', 'castle', 'wall-gate'] as const).map((armourClass) => ({ armourClass, amount: 1.4 }));

        const labels = describeEffect({ special: { charge: { attackMultipliers: classes } } }, t);

        expect(labels).toEqual(['+40% charged attack']);
    });

    it('names the class a narrow factor and a flat gain apply to', () => {
        const labels = describeEffect(
            {
                special: {
                    charge: {
                        attack: [{ armourClass: 'base-pierce', amount: 2 }],
                        attackMultipliers: [{ armourClass: 'ship', amount: 1.25 }],
                    },
                },
            },
            t,
        );

        expect(labels).toEqual(['+25% charged attack vs Ships', '+2 charged attack']);
    });

    it('counts the missiles a technology adds to a charged attack and to its volley', () => {
        const labels = describeEffect({ special: { charge: { missiles: 3 }, secondary: { missiles: 1 } } }, t);

        expect(labels).toEqual(['+1 missile in the charged volley', '+3 charged missiles']);
    });

    it('says the extra projectiles leave a lingering effect', () => {
        const labels = describeEffect({ special: { secondary: { aftereffect: true } } }, t);

        expect(labels).toEqual(['Its extra projectiles leave a lingering effect']);
    });

    it('splits a per-age gain on a charged attack into the share each age grants', () => {
        const labels = describeEffect({ perAge: 2, special: { charge: { attack: [{ armourClass: 'base-pierce', amount: 2 }] } } }, t);

        expect(labels).toEqual(['+1 charged attack per age']);
    });
});
