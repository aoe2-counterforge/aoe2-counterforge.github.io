import { describe, expect, it } from 'vitest';
import { techIconPath, unitIconPath } from '../../../src/react/format.ts';

describe('unitIconPath', () => {
    it('points at the sprite inside the unit folder', () => {
        const path = unitIconPath(17);

        expect(path).toBe('Unit/17.png');
    });

    it('has no path for a unit without a sprite', () => {
        const path = unitIconPath(null);

        expect(path).toBeNull();
    });
});

describe('techIconPath', () => {
    it('points at the sprite inside the technology folder', () => {
        const path = techIconPath(4);

        expect(path).toBe('Tech/4.png');
    });

    it('has no path for a technology without a sprite', () => {
        const path = techIconPath(null);

        expect(path).toBeNull();
    });
});
