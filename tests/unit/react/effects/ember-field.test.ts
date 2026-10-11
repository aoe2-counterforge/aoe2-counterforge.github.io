import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmberField } from '../../../../src/react/effects/ember-field.ts';
import { createCanvas } from '../../../mocks/canvas.ts';

const BOX = { width: 260, height: 160 };

beforeEach(() => {
    vi.stubGlobal('devicePixelRatio', 2);
});

describe('EmberField', () => {
    it('matches the drawing buffer to the pixels the screen actually has', () => {
        const recording = createCanvas(BOX);

        new EmberField({ canvas: recording.canvas });

        expect([recording.canvas.width, recording.canvas.height]).toEqual([520, 320]);
    });

    it('scales the crowd to the size of the surface', () => {
        const small = createCanvas({ width: 100, height: 100 });
        const large = createCanvas({ width: 300, height: 300 });

        new EmberField({ canvas: small.canvas }).step();
        new EmberField({ canvas: large.canvas }).step();

        expect(large.circles.length).toBeGreaterThan(small.circles.length);
    });

    it('answers the density it was given', () => {
        const calm = createCanvas(BOX);
        const busy = createCanvas(BOX);

        new EmberField({ canvas: calm.canvas, density: 0.5 }).step();
        new EmberField({ canvas: busy.canvas, density: 2 }).step();

        expect(busy.circles.length).toBeGreaterThan(calm.circles.length * 2);
    });

    it('keeps new embers inside the column it is pointed at', () => {
        const recording = createCanvas(BOX);
        const field = new EmberField({ canvas: recording.canvas, column: () => ({ from: 100, width: 40 }) });

        field.step();

        const strays = recording.circles.filter((circle) => circle.x < 95 || circle.x > 145);
        expect(strays).toEqual([]);
    });

    it('leaves the canvas painting plainly once a frame is done', () => {
        const recording = createCanvas(BOX);

        new EmberField({ canvas: recording.canvas }).step();

        expect(recording.paint.globalCompositeOperation).toBe('source-over');
    });

    it('paints nothing at all on a canvas the page gave no room', () => {
        const recording = createCanvas({ width: 0, height: 0 });

        new EmberField({ canvas: recording.canvas }).step();

        expect(recording.circles).toEqual([]);
    });

    it('wipes the canvas when the effect is switched off', () => {
        const recording = createCanvas(BOX);
        const field = new EmberField({ canvas: recording.canvas });

        field.clear();

        expect(recording.paint.clearRect).toHaveBeenCalled();
    });
});
