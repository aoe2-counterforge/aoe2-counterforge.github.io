import { beforeEach, describe, expect, it } from 'vitest';
import { setNumberLocale } from '../../../src/i18n/number-locale.ts';
import { percentDelta, preciseDelta, techIconPath, unitIconPath } from '../../../src/react/format.ts';

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

beforeEach(() => {
    setNumberLocale('en');
});

describe('percentDelta', () => {
    it('writes a speed-up that is fifty percent to a rounding error as fifty', () => {
        const written = percentDelta(1 / 0.667);

        expect(written).toBe('+50');
    });

    it('keeps a figure that is not near a whole percentage', () => {
        const written = percentDelta(1 / 0.65);

        expect(written).toBe('+53.8');
    });
});

describe('preciseDelta', () => {
    it('keeps the second decimal of a small change', () => {
        const written = preciseDelta(-0.35);

        expect(written).toBe('-0.35');
    });
});
