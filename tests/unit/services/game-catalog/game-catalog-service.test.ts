import { describe, expect, it } from 'vitest';
import { EntityNotFoundError } from '../../../../src/domain/errors/domain-error.ts';
import { CatalogAssembler } from '../../../../src/services/game-catalog/catalog-assembler.ts';
import { GameCatalogService } from '../../../../src/services/game-catalog/game-catalog-service.ts';
import { civilizationRecord, technologyRecord, unitRecord } from '../../../fixtures/records.ts';

function buildCatalog() {
    return new GameCatalogService({
        assembler: new CatalogAssembler(),
        units: [
            unitRecord({ key: 'militia', age: 1, line: 'militia', civs: ['britons', 'franks'] }),
            unitRecord({ key: 'man-at-arms', age: 2, line: 'militia', upgradesFrom: 'militia', civs: ['britons'] }),
            unitRecord({ key: 'knight', age: 3, category: 'cavalry', line: 'knight', civs: ['franks'] }),
            unitRecord({
                key: 'cavalier',
                age: 4,
                category: 'cavalry',
                line: 'knight',
                upgradesFrom: 'knight',
                civs: ['franks'],
            }),
            unitRecord({
                key: 'paladin',
                age: 4,
                category: 'cavalry',
                line: 'knight',
                upgradesFrom: 'cavalier',
                civs: ['franks'],
            }),
            unitRecord({
                key: 'savar',
                age: 4,
                category: 'cavalry',
                line: 'knight',
                upgradesFrom: 'cavalier',
                civs: ['franks'],
            }),
            unitRecord({ key: 'villager', age: 1, category: 'civilian', civs: ['britons', 'franks'] }),
        ],
        technologies: [
            technologyRecord({ key: 'forging', civs: ['britons', 'franks'] }),
            technologyRecord({ key: 'chivalry', building: 'castle', civs: ['franks'] }),
        ],
        civilizations: [civilizationRecord('britons'), civilizationRecord('franks')],
    });
}

describe('GameCatalogService upgrade steps', () => {
    it('puts the alternatives of a line in the same step', () => {
        const catalog = buildCatalog();

        const steps = catalog.upgradeSteps('knight').map((step) => step.map((unit) => unit.key));

        expect(steps).toEqual([['knight'], ['cavalier'], ['paladin', 'savar']]);
    });

    it('walks a plain chain one unit at a time', () => {
        const catalog = buildCatalog();

        const steps = catalog.upgradeSteps('militia').map((step) => step.map((unit) => unit.key));

        expect(steps).toEqual([['militia'], ['man-at-arms']]);
    });

    it('gives a line nobody upgrades a single step', () => {
        const catalog = buildCatalog();

        expect(catalog.upgradeSteps('villager')).toHaveLength(1);
    });
});

describe('GameCatalogService', () => {
    it('finds a unit by its slug', () => {
        const catalog = buildCatalog();

        expect(catalog.unit('knight').key).toBe('knight');
    });

    it('reports an unknown slug instead of returning nothing', () => {
        const catalog = buildCatalog();

        expect(() => catalog.unit('nonexistent')).toThrow(EntityNotFoundError);
    });

    it('keeps only the units a civilization can train', () => {
        const catalog = buildCatalog();

        const units = catalog.units({ civ: 'franks' });

        expect(units.map((unit) => unit.key)).toEqual([
            'militia',
            'villager',
            'knight',
            'cavalier',
            'paladin',
            'savar',
        ]);
    });

    it('drops civilian units when only combat units are asked for', () => {
        const catalog = buildCatalog();

        const units = catalog.units({ combatOnly: true });

        expect(units.map((unit) => unit.key)).not.toContain('villager');
    });

    it('returns a whole upgrade line in age order', () => {
        const catalog = buildCatalog();

        const line = catalog.units({ line: 'militia' });

        expect(line.map((unit) => unit.key)).toEqual(['militia', 'man-at-arms']);
    });

    it('keeps only the technologies owned by a single civilization when asked', () => {
        const catalog = buildCatalog();

        const unique = catalog.technologies({ uniqueOnly: true });

        expect(unique.map((technology) => technology.key)).toEqual(['chivalry']);
    });

    it('lists civilizations sorted by slug', () => {
        const catalog = buildCatalog();

        expect(catalog.civilizations().map((civilization) => civilization.key)).toEqual(['britons', 'franks']);
    });
});

function buildRosterCatalog() {
    return new GameCatalogService({
        assembler: new CatalogAssembler(),
        units: [
            unitRecord({ key: 'spearman', age: 1, line: 'spearman', civs: ['aztecs', 'britons'] }),
            unitRecord({
                key: 'pikeman',
                age: 2,
                line: 'spearman',
                upgradesFrom: 'spearman',
                civs: ['aztecs', 'britons'],
            }),
            unitRecord({ key: 'halberdier', age: 4, line: 'spearman', upgradesFrom: 'pikeman', civs: ['britons'] }),
            unitRecord({
                key: 'scout-cavalry',
                age: 2,
                category: 'cavalry',
                line: 'scout-cavalry',
                civs: ['britons', 'poles'],
            }),
            unitRecord({
                key: 'light-cavalry',
                age: 3,
                category: 'cavalry',
                line: 'scout-cavalry',
                upgradesFrom: 'scout-cavalry',
                civs: ['britons', 'poles'],
            }),
            unitRecord({
                key: 'hussar',
                age: 4,
                category: 'cavalry',
                line: 'scout-cavalry',
                upgradesFrom: 'light-cavalry',
                civs: ['franks', 'magyars'],
            }),
            unitRecord({
                key: 'winged-hussar',
                age: 4,
                category: 'cavalry',
                line: 'scout-cavalry',
                upgradesFrom: 'light-cavalry',
                civs: ['poles'],
            }),
            unitRecord({ key: 'skirmisher', age: 2, category: 'archer', line: 'skirmisher', civs: ['aztecs', 'britons'] }),
            unitRecord({
                key: 'imperial-skirmisher',
                age: 4,
                category: 'archer',
                line: 'skirmisher',
                upgradesFrom: 'skirmisher',
                civs: ['vietnamese'],
                uniqueTo: 'vietnamese',
            }),
            unitRecord({ key: 'xolotl-warrior', age: 3, category: 'cavalry', civs: ['aztecs'], inTechTree: false }),
            unitRecord({ key: 'scorpion', age: 3, category: 'siege', line: 'scorpion', civs: ['tatars'] }),
            unitRecord({
                key: 'flaming-camel',
                age: 4,
                category: 'camel',
                line: 'scorpion',
                upgradesFrom: 'scorpion',
                civs: ['tatars'],
                uniqueTo: 'tatars',
            }),
        ],
        technologies: [],
        civilizations: ['aztecs', 'britons', 'poles', 'tatars'].map((key) => civilizationRecord(key)),
    });
}

function describeLines(lines: ReturnType<GameCatalogService['rosterLines']>): string[][] {
    return lines.map((line) =>
        line.steps.map((step) => step.map((entry) => (entry.available ? entry.unit.key : `-${entry.unit.key}`)).join('|')),
    );
}

describe('GameCatalogService roster lines', () => {
    it('keeps a step the civilization never reaches, marked as the gap', () => {
        const catalog = buildRosterCatalog();

        const lines = catalog.rosterLines({ civ: 'aztecs', category: 'infantry' });

        expect(describeLines(lines)).toEqual([['spearman', 'pikeman', '-halberdier']]);
    });

    it('leaves out the alternative to a step the civilization already has', () => {
        const catalog = buildRosterCatalog();

        const lines = catalog.rosterLines({ civ: 'poles', category: 'cavalry' });

        expect(describeLines(lines)).toEqual([['scout-cavalry', 'light-cavalry', 'winged-hussar']]);
    });

    it('names the most widespread alternative as the gap when the civilization has neither', () => {
        const catalog = buildRosterCatalog();

        const lines = catalog.rosterLines({ civ: 'britons', category: 'cavalry' });

        expect(describeLines(lines)).toEqual([['scout-cavalry', 'light-cavalry', '-hussar']]);
    });

    it("leaves out another civilization's unique unit instead of showing it as a gap", () => {
        const catalog = buildRosterCatalog();

        const lines = catalog.rosterLines({ civ: 'aztecs', category: 'archer' });

        expect(describeLines(lines)).toEqual([['skirmisher']]);
    });

    it('keeps a unit no tech tree lists when the civilization can train it', () => {
        const catalog = buildRosterCatalog();

        const lines = catalog.rosterLines({ civ: 'aztecs', category: 'cavalry' });

        expect(describeLines(lines)).toEqual([['xolotl-warrior']]);
    });

    it('keeps each step to the category asked for', () => {
        const catalog = buildRosterCatalog();

        const siege = catalog.rosterLines({ civ: 'tatars', category: 'siege' });
        const camels = catalog.rosterLines({ civ: 'tatars', category: 'camel' });

        expect(describeLines(siege)).toEqual([['scorpion']]);
        expect(describeLines(camels)).toEqual([['flaming-camel']]);
    });

    it('orders the lines by the age their first unit is trained in', () => {
        const catalog = buildRosterCatalog();

        const lines = catalog.rosterLines({ civ: 'aztecs' });

        expect(lines.map((line) => line.line)).toEqual(['spearman', 'skirmisher', 'xolotl-warrior']);
    });
});
