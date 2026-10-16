import { describe, expect, it } from 'vitest';
import { CatalogAssembler } from '../../../../src/services/game-catalog/catalog-assembler.ts';
import { GameCatalogService } from '../../../../src/services/game-catalog/game-catalog-service.ts';
import { UpgradeService } from '../../../../src/services/upgrade/upgrade-service.ts';
import { civilizationRecord, technologyRecord, unitRecord } from '../../../fixtures/records.ts';

const INFANTRY = 6;

function buildService() {
    const catalog = new GameCatalogService({
        assembler: new CatalogAssembler(),
        units: [
            unitRecord({
                key: 'jomsviking',
                id: 1,
                classId: INFANTRY,
                attacks: { 'base-melee': 8, 'standard-building': 6 },
                specialAttacks: [
                    {
                        role: 'charge',
                        projectile: 2713,
                        attacks: [],
                        range: 3,
                        charge: { capacity: 1, rechargeRate: 100000 },
                    },
                ],
            }),
        ],
        technologies: [
            technologyRecord({
                key: 'forging',
                age: 2,
                building: 'blacksmith',
                effects: [
                    { mode: 'add', unit: null, unitClass: INFANTRY, attribute: 'attack', value: 1, damageClass: 'base-melee' },
                    { mode: 'add', unit: 1, unitClass: null, attribute: 'attack', value: 1, damageClass: 'base-melee', projectile: 'charge' },
                ],
            }),
        ],
        civilizations: [civilizationRecord('wu')],
    });

    return { catalog, service: new UpgradeService({ catalog }) };
}

describe('UpgradeService attack that replicates the unit', () => {
    it('follows the unit own upgrades rather than adding them a second time', () => {
        const { catalog, service } = buildService();

        const outcome = service.apply({ unit: catalog.unit('jomsviking'), techs: ['forging'] });

        expect(outcome.specialAttacks.map((attack) => [attack.attack.melee, outcome.stats.attack.melee])).toEqual([[9, 9]]);
    });

    it('keeps the bonus classes of the unit', () => {
        const { catalog, service } = buildService();

        const outcome = service.apply({ unit: catalog.unit('jomsviking'), techs: ['forging'] });

        expect(outcome.specialAttacks[0]?.attack.valueFor('standard-building')).toBe(6);
    });
});
