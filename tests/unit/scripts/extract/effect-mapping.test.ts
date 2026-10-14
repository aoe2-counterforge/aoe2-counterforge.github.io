/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { TechnologyRecord, UnitRecord } from '../../../../src/data/records.ts';

const technologies = JSON.parse(
    readFileSync('src/data/generated/technologies.json', 'utf8'),
) as TechnologyRecord[];
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
});
