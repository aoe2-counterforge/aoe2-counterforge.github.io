/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { UnitRecord } from '../../../../src/data/records.ts';

const units = JSON.parse(readFileSync('src/data/generated/units.json', 'utf8')) as UnitRecord[];
const byKey = new Map(units.map((unit) => [unit.key, unit]));

describe('the combat fields read out of the unit record', () => {
    it('flags the units the game builds to go through armour', () => {
        const piercing = units.filter((unit) => unit.ignoresArmour).map((unit) => unit.key);

        expect(piercing.sort()).toEqual([
            'composite-bowman',
            'e-composite-bowman',
            'elite-leitis',
            'elite-turtle-ship',
            'heavy-rocket-cart',
            'leitis',
            'rocket-cart',
            'turtle-ship',
        ]);
    });

    it('gives buildings and siege the armour that holds against them', () => {
        expect(byKey.get('battering-ram')?.resistsArmourIgnore).toBe(true);
        expect(byKey.get('champion')?.resistsArmourIgnore).toBe(false);
    });

    it('keeps the resistance a fraction', () => {
        const outside = units.filter((unit) => unit.bonusDamageResistance < 0 || unit.bonusDamageResistance > 1);

        expect(outside).toEqual([]);
    });

    it('reads a base armour far above any attack, so an unmatched class comes to nothing', () => {
        expect(byKey.get('champion')?.baseArmour).toBe(10000);
    });

    it('reads the Hearth Troop javelin as a charged attack thrown from six tiles', () => {
        const javelin = byKey.get('hearth-troop')?.specialAttacks.find((attack) => attack.role === 'charge');

        expect([javelin?.projectile, javelin?.range, javelin?.attacks.filter((entry) => entry.amount !== 0)]).toEqual([
            2702,
            6,
            [
                { class: 'base-pierce', amount: 6 },
                { class: 'archer', amount: 3 },
            ],
        ]);
    });

    it('describes every volley the combat model fires as a secondary special attack too', () => {
        const volleys = units.filter((unit) => unit.extraProjectiles > 0);

        const mismatched = volleys.filter((unit) => {
            const secondary = unit.specialAttacks.find((attack) => attack.role === 'secondary');

            return secondary?.count !== unit.extraProjectiles || JSON.stringify(secondary.attacks) !== JSON.stringify(unit.secondaryAttacks);
        });

        expect([volleys.length > 0, mismatched.map((unit) => unit.key)]).toEqual([true, []]);
    });
});
