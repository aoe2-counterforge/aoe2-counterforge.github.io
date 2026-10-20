import { describe, expect, it } from 'vitest';
import type { SpecialAttackRecord, TechEffectRecord } from '../../../../src/data/records.ts';
import { CatalogAssembler } from '../../../../src/services/game-catalog/catalog-assembler.ts';
import { GameCatalogService } from '../../../../src/services/game-catalog/game-catalog-service.ts';
import { UpgradeService } from '../../../../src/services/upgrade/upgrade-service.ts';
import { civilizationRecord, technologyRecord, unitRecord } from '../../../fixtures/records.ts';

const SHIPS = 22;
const SKIRMISHERS = 0;

function add(unit: number, attribute: string, value: number): TechEffectRecord {
    return { mode: 'add', unit, unitClass: null, attribute, value };
}

function charged(kind: 'missiles' | 'volley', count: number): SpecialAttackRecord {
    return {
        role: 'charge',
        projectile: 900,
        attacks: [{ class: 'base-pierce', amount: 5 }],
        range: 10,
        count,
        charge: { capacity: 1, rechargeRate: 100000, kind },
    };
}

function buildService() {
    const catalog = new GameCatalogService({
        assembler: new CatalogAssembler(),
        units: [
            unitRecord({
                key: 'lou-chuan',
                id: 1,
                classId: SHIPS,
                category: 'naval',
                range: 13,
                specialAttacks: [charged('missiles', 10)],
            }),
            unitRecord({
                key: 'turtle-ship',
                id: 2,
                classId: SHIPS,
                category: 'naval',
                range: 6,
                attacks: { 'base-pierce': 9 },
                extraProjectiles: 2,
                extrasRepeatMain: true,
                specialAttacks: [charged('volley', 1)],
            }),
            unitRecord({ key: 'skirmisher', id: 3, classId: SKIRMISHERS, category: 'archer', range: 4 }),
        ],
        technologies: [
            technologyRecord({ key: 'bolt-magazine', age: 4, building: 'castle', effects: [add(1, 'maxProjectiles', 3)] }),
            technologyRecord({
                key: 'shinkichon',
                age: 4,
                building: 'castle',
                effects: [add(2, 'projectiles', 2), add(2, 'maxProjectiles', 2)],
            }),
            technologyRecord({ key: 'hul-che-javelineers', age: 4, building: 'castle', effects: [add(3, 'maxProjectiles', 1)] }),
        ],
        civilizations: [civilizationRecord('wu')],
    });

    return { catalog, service: new UpgradeService({ catalog }) };
}

describe('UpgradeService charged missiles', () => {
    it('adds the missiles a technology gives a charge that fires its own missile as often as it can', () => {
        const { catalog, service } = buildService();

        const outcome = service.apply({ unit: catalog.unit('lou-chuan'), techs: ['bolt-magazine'] });

        expect([outcome.specialAttacks[0]?.count, outcome.applied[0]?.delta]).toEqual([
            13,
            { special: { charge: { missiles: 3 } } },
        ]);
    });

    it('adds the copies of the main missile to every shot and leaves the charged volley as it was', () => {
        const { catalog, service } = buildService();

        const outcome = service.apply({ unit: catalog.unit('turtle-ship'), techs: ['shinkichon'] });

        expect([outcome.stats.extraProjectiles, outcome.specialAttacks[0]?.count]).toEqual([4, 1]);
    });

    it('lists no change for room for missiles a unit never fires', () => {
        const { catalog, service } = buildService();

        const changed = service.unitsChangedBy(catalog.technology('hul-che-javelineers'));

        expect(changed).toEqual([]);
    });
});
