import { describe, expect, it } from 'vitest';
import type { SpecialAttackRecord, TechEffectRecord } from '../../../../src/data/records.ts';
import { CatalogAssembler } from '../../../../src/services/game-catalog/catalog-assembler.ts';
import { GameCatalogService } from '../../../../src/services/game-catalog/game-catalog-service.ts';
import { UpgradeService } from '../../../../src/services/upgrade/upgrade-service.ts';
import { civilizationRecord, technologyRecord, unitRecord } from '../../../fixtures/records.ts';

const ARCHERS = 0;
const SHIPS = 22;
const SAXON_INFANTRY = 6;

function pierceOn(unit: number, projectile: TechEffectRecord['projectile']): TechEffectRecord {
    return { mode: 'add', unit, unitClass: null, attribute: 'attack', value: 1, damageClass: 'base-pierce', projectile };
}

function charged(range: number, pierce: number): SpecialAttackRecord {
    return {
        role: 'charge',
        projectile: 900,
        attacks: [{ class: 'base-pierce', amount: pierce }],
        range,
        charge: { capacity: 1, rechargeRate: 0.25 },
    };
}

function buildService() {
    const catalog = new GameCatalogService({
        assembler: new CatalogAssembler(),
        units: [
            unitRecord({
                key: 'fire-archer',
                id: 1,
                classId: ARCHERS,
                category: 'archer',
                range: 5,
                attacks: { 'base-pierce': 5 },
                specialAttacks: [charged(5, 5)],
            }),
            unitRecord({
                key: 'xianbei-raider',
                id: 2,
                classId: ARCHERS,
                category: 'cavalry-archer',
                range: 4,
                attacks: { 'base-pierce': 5 },
                specialAttacks: [
                    { role: 'secondary', projectile: 901, attacks: [{ class: 'base-pierce', amount: 1 }], range: 4, count: 0 },
                    charged(4, 5),
                ],
            }),
            unitRecord({
                key: 'hearth-troop',
                id: 3,
                classId: SAXON_INFANTRY,
                attacks: { 'base-melee': 9 },
                specialAttacks: [charged(6, 6)],
            }),
            unitRecord({
                key: 'lou-chuan',
                id: 4,
                classId: SHIPS,
                category: 'naval',
                range: 10,
                attacks: { 'base-melee': 25 },
                specialAttacks: [charged(10, 5)],
            }),
            unitRecord({ key: 'crossbowman', id: 5, classId: ARCHERS, category: 'archer', range: 5, attacks: { 'base-pierce': 5 } }),
        ],
        technologies: [
            technologyRecord({
                key: 'fletching',
                age: 2,
                building: 'blacksmith',
                effects: [
                    { mode: 'add', unit: null, unitClass: ARCHERS, attribute: 'attack', value: 1, damageClass: 'base-pierce' },
                    { mode: 'add', unit: null, unitClass: ARCHERS, attribute: 'range', value: 1 },
                    pierceOn(1, 'charge'),
                    pierceOn(2, 'charge'),
                    pierceOn(2, 'secondary'),
                    pierceOn(3, 'charge'),
                    { mode: 'add', unit: 3, unitClass: null, attribute: 'chargeEvent', value: 1 },
                    { mode: 'set', unit: 1, unitClass: null, attribute: 'ballistics', value: 1, projectile: 'main' },
                ],
            }),
            technologyRecord({
                key: 'siege-engineers',
                age: 4,
                building: 'university',
                effects: [
                    { mode: 'add', unit: 4, unitClass: null, attribute: 'range', value: 1 },
                    { mode: 'add', unit: 4, unitClass: null, attribute: 'chargeEvent', value: -1 },
                    { mode: 'multiply', unit: 4, unitClass: null, attribute: 'attack', value: 1.2, damageClass: 'base-melee', projectile: 'main' },
                ],
            }),
            technologyRecord({
                key: 'bolt-magazine',
                age: 4,
                building: 'castle',
                effects: [pierceOn(5, 'secondary')],
            }),
        ],
        civilizations: [civilizationRecord('wu')],
    });

    return { catalog, service: new UpgradeService({ catalog }) };
}

describe('UpgradeService special attacks', () => {
    it('counts a change on the charged missile once, on the charged attack, not on the unit', () => {
        const { catalog, service } = buildService();

        const changed = service.unitsChangedBy(catalog.technology('fletching')).find((entry) => entry.unit.key === 'fire-archer');

        expect(changed?.delta).toEqual({
            attack: [{ armourClass: 'base-pierce', amount: 1 }],
            range: 1,
            ballistics: true,
            special: { charge: { attack: [{ armourClass: 'base-pierce', amount: 1 }], range: 1 } },
        });
    });

    it('keeps the unit stat line free of what its special attacks gain', () => {
        const { catalog, service } = buildService();

        const outcome = service.apply({ unit: catalog.unit('fire-archer'), techs: ['fletching'] });

        expect([outcome.stats.attack.pierce, outcome.stats.range]).toEqual([6, 6]);
    });

    it('upgrades the special attack with what lands on it', () => {
        const { catalog, service } = buildService();

        const outcome = service.apply({ unit: catalog.unit('fire-archer'), techs: ['fletching'] });

        expect(outcome.specialAttacks.map((attack) => [attack.role, attack.attack.pierce, attack.range])).toEqual([
            ['charge', 6, 6],
        ]);
    });

    it('keeps the change to each special attack apart rather than summing them', () => {
        const { catalog, service } = buildService();

        const changed = service.unitsChangedBy(catalog.technology('fletching')).find((entry) => entry.unit.key === 'xianbei-raider');

        expect(changed?.delta.special).toEqual({
            secondary: { attack: [{ armourClass: 'base-pierce', amount: 1 }] },
            charge: { attack: [{ armourClass: 'base-pierce', amount: 1 }], range: 1 },
        });
    });

    it('reads the charge event as how far the charged attack reaches', () => {
        const { catalog, service } = buildService();

        const changed = service.unitsChangedBy(catalog.technology('fletching')).find((entry) => entry.unit.key === 'hearth-troop');

        expect(changed?.delta).toEqual({
            special: { charge: { attack: [{ armourClass: 'base-pierce', amount: 1 }], range: 1 } },
        });
    });

    it('leaves the charged reach alone when a technology moves the range and the charge event apart', () => {
        const { catalog, service } = buildService();

        const changed = service.unitsChangedBy(catalog.technology('siege-engineers')).find((entry) => entry.unit.key === 'lou-chuan');

        expect(changed?.delta).toEqual({ range: 1 });
    });

    it('ignores a change aimed at a special attack the unit does not make', () => {
        const { catalog, service } = buildService();

        const upgrades = service.affecting(catalog.unit('crossbowman')).map((upgrade) => upgrade.technology.key);

        expect(upgrades).toEqual(['fletching']);
    });
});
