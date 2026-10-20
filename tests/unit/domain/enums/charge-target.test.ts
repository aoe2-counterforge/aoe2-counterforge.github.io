import { describe, expect, it } from 'vitest';
import { groupTargets } from '../../../../src/domain/enums/charge-target.ts';

const LAND = ['infantry', 'cavalry', 'archer', 'cavalry-archer', 'monk', 'villager'] as const;

describe('groupTargets', () => {
    it('names the groups a charge takes in whole and the ones it leaves out', () => {
        const groups = groupTargets([...LAND, 'ship']);

        expect(groups).toEqual({ within: ['land', 'ship'], without: ['siege', 'building'] });
    });

    it('names no group when one is only partly in', () => {
        const groups = groupTargets(['infantry', 'ship']);

        expect(groups).toBeNull();
    });
});
