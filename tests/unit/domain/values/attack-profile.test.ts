import { describe, expect, it } from 'vitest';
import { AttackProfile } from '../../../../src/domain/values/attack-profile.ts';

const xianbei = new AttackProfile({
    entries: [
        { armourClass: 'base-pierce', amount: 5 },
        { armourClass: 'infantry', amount: 1 },
        { armourClass: 'spearman', amount: 3 },
        { armourClass: 'mounted-unit', amount: -3 },
        { armourClass: 'archer', amount: 0 },
        { armourClass: 'unused-31', amount: -1 },
    ],
});

describe('AttackProfile', () => {
    it('lists the bonuses largest first and the penalties last, without the base damage', () => {
        const modifiers = xianbei.modifiers();

        expect(modifiers).toEqual([
            { armourClass: 'spearman', amount: 3 },
            { armourClass: 'infantry', amount: 1 },
            { armourClass: 'mounted-unit', amount: -3 },
        ]);
    });

    it('names melee or pierce by the base damage it carries', () => {
        const melee = new AttackProfile({ entries: [{ armourClass: 'base-melee', amount: 9 }] });

        expect([melee.damageType(), xianbei.damageType()]).toEqual(['melee', 'pierce']);
    });

    it('has no damage type when it carries no damage', () => {
        const empty = new AttackProfile({ entries: [] });

        expect([empty.damageType(), empty.isEmpty()]).toEqual([null, true]);
    });
});
