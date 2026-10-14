/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CivilizationRecord, TechnologyRecord, UnitRecord } from '../../../../src/data/records.ts';

const technologies = JSON.parse(
    readFileSync('src/data/generated/technologies.json', 'utf8'),
) as TechnologyRecord[];
const civilizations = JSON.parse(
    readFileSync('src/data/generated/civilizations.json', 'utf8'),
) as CivilizationRecord[];
const units = JSON.parse(readFileSync('src/data/generated/units.json', 'utf8')) as UnitRecord[];

describe('technology effects', () => {
    it('hands a unit one change per technology, however many missiles it fires', () => {
        const listed = new Set(units.map((unit) => unit.id));

        const repeated = technologies.flatMap((technology) => {
            const seen = new Set<string>();

            return technology.effects.flatMap((effect) => {
                if (effect.unit === null || !listed.has(effect.unit)) return [];

                const key = [effect.unit, effect.attribute, effect.damageClass ?? '', effect.mode, effect.value].join('|');
                if (!seen.has(key)) {
                    seen.add(key);

                    return [];
                }

                return [`${technology.key}: ${key}`];
            });
        });

        expect(repeated).toEqual([]);
    });

    it('keeps what a technology does to a unit that is not a number', () => {
        const idOf = (key: string) => units.find((unit) => unit.key === key)?.id;
        const effectsOf = (key: string) => technologies.find((technology) => technology.key === key)?.effects ?? [];

        const anarchy = effectsOf('anarchy').find((effect) => effect.unit === idOf('huskarl'));
        const warships = effectsOf('medium-warships').find((effect) => effect.unit === idOf('galley'));
        const siphons = effectsOf('siphons').find(
            (effect) => effect.unit === idOf('fire-ship') && effect.attribute === 'maxCharge',
        );

        expect([anarchy?.attribute, anarchy?.building]).toEqual(['trainLocation', 'barracks']);
        expect([warships?.attribute, warships?.value]).toEqual(['upgradesTo', idOf('war-galley')]);
        expect(siphons?.attribute).toBe('maxCharge');
    });

    it('words a work rate by what the target does rather than as training', () => {
        const kindsOf = (key: string) => [
            ...new Set(
                (technologies.find((technology) => technology.key === key)?.effects ?? [])
                    .filter((effect) => effect.attribute.endsWith('Rate') && effect.attribute !== 'rechargeRate')
                    .map((effect) => `${effect.attribute}/${effect.resource ?? ''}`),
            ),
        ];

        const kinds = ['conscription', 'gold-mining', 'double-bit-axe', 'treadmill-crane', 'caravan', 'fereters'].map(kindsOf);

        expect(kinds).toEqual([
            ['productionRate/'],
            ['gatherRate/gold'],
            ['gatherRate/wood'],
            ['buildRate/'],
            ['tradeRate/'],
            ['healRate/'],
        ]);
    });

    it('leaves the civilization bonuses an age advance carries off the advance itself', () => {
        const ages = ['feudal-age', 'castle-age', 'imperial-age'];

        const counts = ages.map((key) => technologies.find((technology) => technology.key === key)?.effects.length);

        expect(counts).toEqual([0, 0, 0]);
    });

    it('reads a set to a negative share as the share of population space the unit keeps', () => {
        const effects = technologies.find((technology) => technology.key === 'aznauri-cavalry')?.effects ?? [];

        const shares = effects.filter((effect) => effect.attribute === 'population').map((effect) => [effect.mode, effect.value]);

        expect(new Set(shares.map((share) => share.join(':')))).toEqual(new Set(['multiply:0.8']));
    });

    it('gives a civilization only the bonuses it is handed free, not a retired technology it still carries', () => {
        const bonuses = (key: string) => civilizations.find((civ) => civ.key === key)?.bonusEffects ?? [];

        const slavsArmour = bonuses('slavs').filter((effect) => effect.attribute === 'armour');
        const lithuanianRelics = bonuses('lithuanians').length;

        expect(slavsArmour).toEqual([]);
        expect(lithuanianRelics).toBeGreaterThan(30);
    });

    it('does not read how fast a missile flies as how fast its shooter walks', () => {
        const effects = technologies.find((technology) => technology.key === 'arquebus')?.effects ?? [];
        const listed = new Set(units.map((unit) => unit.id));

        const speeds = effects.filter((effect) => effect.attribute === 'speed' && listed.has(effect.unit ?? -1));

        expect(speeds).toEqual([]);
    });

    it('shows a gathering technology on the villager the job units are states of', () => {
        const villager = units.find((unit) => unit.key === 'villager')?.id;
        const effects = technologies.find((technology) => technology.key === 'double-bit-axe')?.effects ?? [];

        const targets = [...new Set(effects.map((effect) => effect.unit))];

        expect(targets).toEqual([villager]);
    });

    it('keeps the description of a unit whose tech tree entry names a different form of it', () => {
        const strings = JSON.parse(readFileSync('src/data/generated/strings.en.json', 'utf8')) as {
            units: Record<string, { role: string }>;
        };

        const roles = [strings.units.ratha?.role, strings.units['elite-ratha']?.role];

        expect(roles.every((role) => role !== undefined && role !== '')).toBe(true);
    });

    it('reads the reload a technology scales on monks as their faith recharge', () => {
        const effects = technologies.find((technology) => technology.key === 'illumination')?.effects ?? [];

        const attributes = effects.map((effect) => [effect.attribute, effect.value]);

        expect(attributes).toEqual([['faithRate', 1.875]]);
    });

    it('puts the carry capacity of a villager form on the Villager, with the resource it gathers', () => {
        const villager = units.find((unit) => unit.key === 'villager')?.id;
        const effects = technologies.find((technology) => technology.key === 'heavy-plow')?.effects ?? [];

        const carry = effects.find((effect) => effect.attribute === 'carryCapacity');

        expect([carry?.unit, carry?.resource, carry?.value]).toEqual([villager, 'food', 1]);
    });

    it('keeps what a technology does to towers and walls under the building it is about', () => {
        const effects = technologies.find((technology) => technology.key === 'masonry')?.effects ?? [];

        const targets = new Set(effects.map((effect) => effect.target));

        expect(targets.has('towers')).toBe(true);
    });
});
