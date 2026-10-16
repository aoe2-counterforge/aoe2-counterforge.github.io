import { describe, expect, it } from 'vitest';
import type { GenieUnit } from '../../../../scripts/extract/genie-dat.ts';
import type { TechEffectRecord } from '../../../../src/data/records.ts';
import {
    datasetBuilderFixture,
    genieUnit,
    sampleGameData,
    sampleStrings,
    sampleTechTree,
    techTreeNode,
} from '../../../fixtures/game-data.ts';

/** The unit type the file gives a missile. */
const MISSILE = 60;
const ARCHERS = 0;
const PIERCE = 3;
const ATTACK = 9;
const BALLISTICS = 19;
const PROJECTILES = 102;
const ADD = 4;
const SET = 0;

/** A packed attack command: the class times 256, plus the amount. */
function attackOn(unit: number, amount: number): { type: number; unit: number; unitClass: number; attribute: number; value: number } {
    return { type: ADD, unit, unitClass: -1, attribute: ATTACK, value: PIERCE * 256 + amount };
}

const SHOOTERS: Record<number, { name: string; fields: Partial<GenieUnit> }> = {
    80: {
        name: 'Fire Archer',
        fields: {
            maxRange: 9,
            displayedRange: 5,
            projectileUnitId: 90,
            chargeProjectileUnit: 90,
            chargeEvent: -4,
            maxCharge: 20,
            rechargeRate: 2,
            totalProjectiles: 1,
        },
    },
    81: { name: 'Kipchak', fields: { maxRange: 4, projectileUnitId: 91, secondaryProjectileUnit: 92, totalProjectiles: 3 } },
    82: { name: 'Archer', fields: { maxRange: 4, projectileUnitId: 93, secondaryProjectileUnit: 94, totalProjectiles: 1 } },
    83: {
        name: 'Xianbei Raider',
        fields: { maxRange: 4, projectileUnitId: 95, secondaryProjectileUnit: 94, totalProjectiles: 1, maxTotalProjectiles: 6 },
    },
};

const MISSILES: Record<number, number> = { 90: 5, 91: 0, 92: 3, 93: 0, 94: 3 };

/**
 * Runs the builder over a roster of shooters whose missiles carry damage of their own.
 *
 * @param extraCommands - Commands added to the one researchable technology.
 * @returns The built dataset.
 */
function buildWith(extraCommands: { type: number; unit: number; unitClass: number; attribute: number; value: number }[] = []) {
    const game = sampleGameData();
    const units = game.civilizations[1].units;
    for (const [id, shooter] of Object.entries(SHOOTERS)) {
        units.set(
            Number(id),
            genieUnit({ id: Number(id), nameStringId: 6000 + Number(id), classId: ARCHERS, ...shooter.fields }),
        );
    }
    for (const [id, amount] of Object.entries(MISSILES)) {
        const attacks = amount > 0 ? [{ class: PIERCE, amount }] : [];
        units.set(Number(id), genieUnit({ id: Number(id), nameStringId: 0, type: MISSILE, attacks }));
    }
    game.effects[0] = {
        name: 'Fletching',
        commands: [
            { type: ADD, unit: -1, unitClass: ARCHERS, attribute: ATTACK, value: PIERCE * 256 + 1 },
            attackOn(90, 1),
            attackOn(91, 1),
            attackOn(92, 1),
            { type: SET, unit: 90, unitClass: -1, attribute: BALLISTICS, value: 1 },
            ...extraCommands,
        ],
    };

    const tree = sampleTechTree();
    const strings = sampleStrings();
    for (const [id, shooter] of Object.entries(SHOOTERS)) {
        tree.civ_techs_units.push(techTreeNode({ 'Node ID': Number(id), 'Name String ID': 16000 + Number(id) }));
        strings.set(16000 + Number(id), shooter.name);
    }

    return datasetBuilderFixture({ game, trees: [tree], strings }).build();
}

const dataset = buildWith();
const unitByKey = (key: string) => dataset.units.find((unit) => unit.key === key);
const idOf = (key: string) => unitByKey(key)?.id;
const effects: TechEffectRecord[] = dataset.technologies[0]?.effects ?? [];

describe('DatasetBuilder special attacks', () => {
    it('reads a charged attack off the charged missile, reaching the range plus the charge event', () => {
        const attacks = unitByKey('fire-archer')?.specialAttacks;

        expect(attacks).toEqual([
            {
                role: 'charge',
                projectile: 90,
                attacks: [{ class: 'base-pierce', amount: 5 }],
                range: 5,
                charge: { capacity: 20, rechargeRate: 2 },
            },
        ]);
    });

    it('reads the secondary missiles a unit fires with each shot', () => {
        const attacks = unitByKey('kipchak')?.specialAttacks;

        expect(attacks).toEqual([
            { role: 'secondary', projectile: 92, attacks: [{ class: 'base-pierce', amount: 3 }], range: 4, count: 2, maxCount: 2 },
        ]);
    });

    it('counts the most missiles a charged volley can put in the air', () => {
        const attacks = unitByKey('xianbei-raider')?.specialAttacks;

        expect(attacks?.map((attack) => [attack.role, attack.count, attack.maxCount])).toEqual([['secondary', 0, 5]]);
    });

    it('leaves out a secondary missile that never flies', () => {
        const attacks = unitByKey('archer')?.specialAttacks;

        expect(attacks).toEqual([]);
    });

    it('keeps a secondary missile a technology puts in the air, with none at the start', () => {
        const raised = buildWith([{ type: ADD, unit: 82, unitClass: -1, attribute: PROJECTILES, value: 2 }]);

        const attacks = raised.units.find((unit) => unit.key === 'archer')?.specialAttacks;

        expect(attacks?.map((attack) => [attack.role, attack.projectile, attack.count])).toEqual([['secondary', 94, 0]]);
    });

    it('gives damage written on a missile that is both main and charged to the charged attack', () => {
        const onFireArcher = effects.filter((effect) => effect.unit === idOf('fire-archer') && effect.attribute === 'attack');

        expect(onFireArcher).toEqual([
            { mode: 'add', unit: 80, unitClass: null, attribute: 'attack', value: 1, damageClass: 'base-pierce', projectile: 'charge' },
        ]);
    });

    it('keeps a flight property of the main missile on the unit shot, tagged as the main one', () => {
        const ballistics = effects.find((effect) => effect.unit === idOf('fire-archer') && effect.attribute === 'ballistics');

        expect(ballistics?.projectile).toBe('main');
    });

    it('tags damage on each missile with the role it plays for the shooter', () => {
        const kipchak = effects
            .filter((effect) => effect.unit === idOf('kipchak') && effect.attribute === 'attack')
            .map((effect) => effect.projectile);

        expect(kipchak).toEqual(['main', 'secondary']);
    });

    it('keeps the change to the whole class apart from the ones on its missiles', () => {
        const byClass = effects.filter((effect) => effect.unitClass === ARCHERS && effect.unit === null);

        expect(byClass.map((effect) => [effect.attribute, effect.value, effect.projectile])).toEqual([['attack', 1, undefined]]);
    });
});
