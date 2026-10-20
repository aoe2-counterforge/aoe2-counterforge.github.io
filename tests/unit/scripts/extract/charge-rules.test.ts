import { describe, expect, it } from 'vitest';
import type { GenieUnit, Task } from '../../../../scripts/extract/genie-dat.ts';
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
const SHIPS = 22;
const MELEE = 4;
const PIERCE = 3;
const BUILDINGS = 11;

/** A stinger task, as the file writes the one on the Bolas Rider's charged bolas. */
function stinger(overrides: Partial<Task> = {}): Task {
    return {
        taskType: 1,
        id: 0,
        isDefault: 0,
        actionType: 157,
        classId: -1,
        unitId: -1,
        terrainId: -1,
        resourceIn: -1,
        resourceMultiplier: -1,
        resourceOut: -1,
        unusedResource: -1,
        workValue1: -0.15,
        workValue2: 10,
        workRange: 1,
        autoSearchTargets: 0,
        searchWaitTime: 5,
        enableTargeting: 0,
        combatLevelFlag: 3,
        gatherType: 0,
        workFlag2: 0,
        targetDiplomacy: 2,
        carryCheck: 0,
        pickForConstruction: 0,
        movingGraphicId: -1,
        proceedingGraphicId: -1,
        workingGraphicId: -1,
        carryingGraphicId: -1,
        gatherSoundId: -1,
        depositSoundId: -1,
        wwiseGatherSoundId: 0,
        wwiseDepositSoundId: 0,
        enabled: -1,
        ...overrides,
    };
}

const UNITS: Record<number, { name: string; fields: Partial<GenieUnit> }> = {
    80: {
        name: 'Lou Chuan',
        fields: {
            classId: SHIPS,
            maxRange: 13,
            displayedRange: 10,
            attacks: [{ class: BUILDINGS, amount: 180 }],
            projectileUnitId: 90,
            secondaryProjectileUnit: 91,
            chargeProjectileUnit: 92,
            chargeType: 6,
            chargeTarget: 127,
            maxCharge: 1,
            rechargeRate: 100000,
            chargeEvent: -3,
            totalProjectiles: 1,
            maxTotalProjectiles: 10,
        },
    },
    81: {
        name: 'Fire Archer',
        fields: {
            classId: 0,
            maxRange: 9,
            displayedRange: 5,
            projectileUnitId: 93,
            chargeProjectileUnit: 93,
            chargeType: 6,
            chargeTarget: 191,
            maxCharge: 20,
            rechargeRate: 3.2e18,
            chargeEvent: -4,
            totalProjectiles: 1,
            maxTotalProjectiles: 3,
        },
    },
    82: {
        name: 'Xianbei Raider',
        fields: {
            classId: 36,
            maxRange: 4,
            projectileUnitId: 94,
            secondaryProjectileUnit: 95,
            chargeProjectileUnit: 96,
            chargeType: 7,
            chargeTarget: 127,
            maxCharge: 1,
            rechargeRate: 0.033,
            totalProjectiles: 1,
            maxTotalProjectiles: 6,
        },
    },
    83: {
        name: 'Turtle Ship',
        fields: {
            classId: SHIPS,
            maxRange: 6,
            attacks: [{ class: PIERCE, amount: 9 }],
            projectileUnitId: 97,
            chargeProjectileUnit: 98,
            chargeType: 7,
            chargeTarget: -1,
            maxCharge: 1,
            rechargeRate: 0.17,
            totalProjectiles: 3,
            maxTotalProjectiles: 3,
        },
    },
    84: {
        name: 'Mangonel',
        fields: {
            classId: 13,
            maxRange: 7,
            blastWidth: 1,
            projectileUnitId: 99,
            secondaryProjectileUnit: 100,
            totalProjectiles: 6,
        },
    },
    85: {
        name: 'Jomsviking',
        fields: {
            chargeProjectileUnit: 101,
            chargeType: 6,
            chargeTarget: 320,
            maxCharge: 1,
            rechargeRate: 100000,
            chargeEvent: 3,
            maxTotalProjectiles: 1,
        },
    },
    86: {
        name: 'Bolas Rider',
        fields: {
            classId: 36,
            maxRange: 4,
            projectileUnitId: 94,
            chargeProjectileUnit: 102,
            chargeType: 6,
            chargeTarget: 63,
            maxCharge: 1,
            rechargeRate: 0.033,
            totalProjectiles: 1,
            maxTotalProjectiles: 1,
        },
    },
    87: { name: 'Coustillier', fields: { classId: 12, chargeType: 1, maxCharge: 20, rechargeRate: 0.5, chargeEvent: 1 } },
    88: {
        name: 'Urumi Swordsman',
        fields: { chargeType: 3, maxCharge: 12, rechargeRate: 0.5, chargeEvent: 1, blastWidth: 0.75, blastDamage: 0.5 },
    },
    89: { name: 'Shrivamsha Rider', fields: { classId: 12, chargeType: 4, maxCharge: 5, rechargeRate: 0.25 } },
    79: { name: 'Iron Pagoda', fields: { classId: 12, chargeType: 5, maxCharge: 1, rechargeRate: 0.025 } },
};

const MISSILES: Record<number, Partial<GenieUnit>> = {
    90: { attacks: [{ class: BUILDINGS, amount: 230 }] },
    91: { attacks: [{ class: MELEE, amount: 10 }] },
    92: { attacks: [{ class: PIERCE, amount: 5 }, { class: 16, amount: 5 }] },
    93: { attacks: [{ class: PIERCE, amount: 5 }] },
    94: {},
    95: { attacks: [{ class: PIERCE, amount: 1 }] },
    96: { attacks: [{ class: PIERCE, amount: 5 }] },
    97: { attacks: [{ class: MELEE, amount: 5 }] },
    98: { attacks: [{ class: MELEE, amount: 20 }] },
    99: {},
    100: {},
    101: {},
    102: { attacks: [{ class: PIERCE, amount: 7 }], combatAbility: 128, tasks: [stinger()] },
};

/**
 * Runs the builder over a roster whose charges and missiles are each one of the game's cases.
 *
 * @param change - Fields to replace on one unit or missile before the build.
 * @returns The built dataset.
 */
function buildWith(change: { id: number; fields: Partial<GenieUnit> } | null = null) {
    const game = sampleGameData();
    const units = game.civilizations[1].units;
    const fieldsOf = (id: number, fields: Partial<GenieUnit>) =>
        change?.id === id ? { ...fields, ...change.fields } : fields;
    for (const [id, unit] of Object.entries(UNITS)) {
        const fields = fieldsOf(Number(id), unit.fields);
        units.set(Number(id), genieUnit({ id: Number(id), nameStringId: 6000 + Number(id), ...fields }));
    }
    for (const [id, missile] of Object.entries(MISSILES)) {
        const fields = fieldsOf(Number(id), missile);
        units.set(Number(id), genieUnit({ id: Number(id), nameStringId: 0, type: MISSILE, attacks: [], ...fields }));
    }

    const tree = sampleTechTree();
    const strings = sampleStrings();
    for (const [id, unit] of Object.entries(UNITS)) {
        tree.civ_techs_units.push(techTreeNode({ 'Node ID': Number(id), 'Name String ID': 16000 + Number(id) }));
        strings.set(16000 + Number(id), unit.name);
    }

    return datasetBuilderFixture({ game, trees: [tree], strings }).build();
}

const dataset = buildWith();
const unitByKey = (key: string) => dataset.units.find((unit) => unit.key === key);
const charged = (key: string) => unitByKey(key)?.specialAttacks.find((attack) => attack.role === 'charge');

describe('DatasetBuilder charge rules', () => {
    it('gives the unit the range the engine uses rather than the one the interface displays', () => {
        const range = unitByKey('lou-chuan')?.range;

        expect(range).toBe(13);
    });

    it('offsets a charged attack by its charge event when the unit holds a single charge', () => {
        const range = charged('lou-chuan')?.range;

        expect(range).toBe(10);
    });

    it('leaves the charged range at the unit range when the unit holds more than one charge', () => {
        const range = charged('fire-archer')?.range;

        expect(range).toBe(9);
    });

    it('fires as many charged missiles as the unit can for charge type 6', () => {
        const attacks = [charged('lou-chuan'), charged('fire-archer'), charged('jomsviking')];

        expect(attacks.map((attack) => [attack?.charge?.kind, attack?.count])).toEqual([
            ['missiles', 10],
            ['missiles', 3],
            ['missiles', 1],
        ]);
    });

    it('keeps the secondary missile out of a type 6 charge', () => {
        const secondary = unitByKey('lou-chuan')?.specialAttacks.find((attack) => attack.role === 'secondary');

        expect(secondary).toBeUndefined();
    });

    it('fires one charged missile and the secondary ones beyond the ordinary count for charge type 7', () => {
        const attacks = unitByKey('xianbei-raider')?.specialAttacks;

        expect(attacks?.map((attack) => [attack.role, attack.count, attack.maxCount])).toEqual([
            ['secondary', 0, 5],
            ['charge', 1, undefined],
        ]);
    });

    it('reads the kinds of target a charge is used against off the bits of its target field', () => {
        const targets = [charged('lou-chuan'), charged('jomsviking'), charged('fire-archer'), charged('bolas-rider')].map(
            (attack) => attack?.charge?.targets,
        );

        expect(targets).toEqual([
            ['infantry', 'cavalry', 'archer', 'cavalry-archer', 'monk', 'villager', 'ship'],
            ['ship', 'building'],
            ['infantry', 'cavalry', 'archer', 'cavalry-archer', 'monk', 'villager', 'siege'],
            ['infantry', 'cavalry', 'archer', 'cavalry-archer', 'monk', 'villager'],
        ]);
    });

    it('leaves the targets out of a charge used against every target', () => {
        const turtle = charged('turtle-ship')?.charge;

        expect(turtle).toEqual({ capacity: 1, rechargeRate: 0.17, kind: 'volley' });
    });

    it('counts copies of the main missile when the unit names no secondary one', () => {
        const turtle = unitByKey('turtle-ship');

        expect([turtle?.extraProjectiles, turtle?.extrasRepeatMain, turtle?.secondaryAttacks]).toEqual([2, true, []]);
    });

    it('drops the pieces of a blast whose secondary missile carries no damage', () => {
        const mangonel = unitByKey('mangonel');

        expect([mangonel?.extraProjectiles, mangonel?.extrasRepeatMain]).toEqual([0, false]);
    });

    it('reads a slow off the stinger task the charged missile carries', () => {
        const slows = charged('bolas-rider')?.slows;

        expect(slows).toEqual({ share: 0.15, seconds: 10 });
    });

    it('reads no slow from a stinger the missile is not allowed to use', () => {
        const rebuilt = buildWith({ id: 102, fields: { combatAbility: 0 } });

        const bolas = rebuilt.units.find((unit) => unit.key === 'bolas-rider');
        const slows = bolas?.specialAttacks.find((attack) => attack.role === 'charge')?.slows;

        expect(slows).toBeUndefined();
    });

    it('reads a charged blow, a charged blast with its reach and share, a dodge and a block', () => {
        const keys = ['coustillier', 'urumi-swordsman', 'shrivamsha-rider', 'iron-pagoda'];

        const abilities = keys.map((key) => unitByKey(key)?.chargeAbility);

        expect(abilities).toEqual([
            { kind: 'blow', capacity: 20, rechargeRate: 0.5 },
            { kind: 'blast', capacity: 12, rechargeRate: 0.5, blast: { radius: 0.75, share: 0.5 } },
            { kind: 'dodge', capacity: 5, rechargeRate: 0.25 },
            { kind: 'block', capacity: 1, rechargeRate: 0.025 },
        ]);
    });

    it('gives no ability to a unit that spends its charge on a missile', () => {
        const ability = unitByKey('lou-chuan')?.chargeAbility;

        expect(ability).toBeNull();
    });
});
