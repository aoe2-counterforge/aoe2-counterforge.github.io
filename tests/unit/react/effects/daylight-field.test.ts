import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DaylightField } from '../../../../src/react/effects/daylight-field.ts';
import { createCanvas } from '../../../mocks/canvas.ts';

const BOX = { width: 260, height: 160 };

beforeEach(() => {
    vi.stubGlobal('devicePixelRatio', 2);
});

describe('DaylightField', () => {
    it('matches the drawing buffer to the pixels the screen actually has', () => {
        const recording = createCanvas(BOX);

        new DaylightField({ canvas: recording.canvas });

        expect([recording.canvas.width, recording.canvas.height]).toEqual([520, 320]);
    });

    it('scales the shower to the size of the surface', () => {
        const small = createCanvas({ width: 100, height: 100 });
        const large = createCanvas({ width: 300, height: 300 });

        new DaylightField({ canvas: small.canvas }).step();
        new DaylightField({ canvas: large.canvas }).step();

        expect(large.circles.length).toBeGreaterThan(small.circles.length);
    });

    it('answers the density it was given', () => {
        const calm = createCanvas(BOX);
        const busy = createCanvas(BOX);

        new DaylightField({ canvas: calm.canvas, density: 0.5 }).step();
        new DaylightField({ canvas: busy.canvas, density: 2 }).step();

        expect(busy.circles.length).toBeGreaterThan(calm.circles.length * 2);
    });

    it('keeps new sparks inside the column it is pointed at', () => {
        const recording = createCanvas(BOX);
        const field = new DaylightField({ canvas: recording.canvas, column: () => ({ from: 100, width: 40 }) });

        field.step();

        const strays = recording.circles.filter((circle) => circle.x < 95 || circle.x > 145);
        expect(strays).toEqual([]);
    });

    it('draws every spark as a streak with a head', () => {
        const recording = createCanvas(BOX);

        new DaylightField({ canvas: recording.canvas, density: 3 }).step();

        expect(recording.circles.length).toBeGreaterThan(0);
        expect(recording.paint.stroke).toHaveBeenCalledTimes(recording.circles.length);
    });

    it('paints nothing at all on a canvas the page gave no room', () => {
        const recording = createCanvas({ width: 0, height: 0 });

        new DaylightField({ canvas: recording.canvas }).step();

        expect(recording.circles).toEqual([]);
    });

    it('wipes the canvas when the effect is switched off', () => {
        const recording = createCanvas(BOX);
        const field = new DaylightField({ canvas: recording.canvas });

        field.clear();

        expect(recording.paint.clearRect).toHaveBeenCalled();
    });
});
