import { describe, expect, it } from 'vitest';
import { CatalogAssembler } from '../../../../src/services/game-catalog/catalog-assembler.ts';
import { unitRecord } from '../../../fixtures/records.ts';

function champion() {
    return new CatalogAssembler().toUnit(unitRecord({ key: 'champion', age: 4, ageByCiv: { armenians: 3 } }));
}

describe('Unit', () => {
    it('reports the age most civilizations reach it in when no civilization is named', () => {
        const unit = champion();

        const age = unit.ageFor(null);

        expect(age).toBe(4);
    });

    it('moves the age for a civilization whose bonus reaches it earlier', () => {
        const unit = champion();

        const age = unit.ageFor('armenians');

        expect(age).toBe(3);
    });

    it('keeps the common age for a civilization without such a bonus', () => {
        const unit = champion();

        const age = unit.ageFor('britons');

        expect(age).toBe(4);
    });
});
