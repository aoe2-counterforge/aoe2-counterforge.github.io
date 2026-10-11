import { useEffect, useRef, type RefObject } from 'react';
import { DaylightField } from '../effects/daylight-field.ts';
import { EmberField } from '../effects/ember-field.ts';
import type { ParticleFieldConfig } from '../effects/particle-field.ts';

export interface EmberFieldOptions {
    density?: number;
    wind?: number;
    /** Keeps new embers inside one part of the canvas, such as the open tab. */
    column?: () => { from: number; width: number };
}

/**
 * Runs the forge's air on a canvas for as long as it is on screen.
 *
 * At night the canvas carries embers; by day, sparks. Which scene paints is decided every frame,
 * so switching the theme changes the picture without remounting anything.
 *
 * @param options - Density, wind, and where new particles are allowed to appear.
 * @returns The ref to attach to the canvas.
 */
export function useEmberField(options: EmberFieldOptions = {}): RefObject<HTMLCanvasElement | null> {
    const canvas = useRef<HTMLCanvasElement>(null);
    const latest = useRef(options);
    latest.current = options;

    useEffect(() => {
        const element = canvas.current;
        if (!element) return;
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        // A browser without a 2d context simply goes without the effect.
        if (!element.getContext('2d')) return;

        // Both scenes breathe the same air, read live: the owner may change the density and the
        // wind between renders without either field being rebuilt.
        const air: ParticleFieldConfig = {
            canvas: element,
            get density() {
                return latest.current.density;
            },
            get wind() {
                return latest.current.wind;
            },
            column: latest.current.column,
        };
        const night = new EmberField(air);
        const day = new DaylightField(air);
        const scene = () => (document.documentElement.dataset.theme === 'light' ? day : night);

        let visible = true;
        let frame = requestAnimationFrame(function loop() {
            if (visible) scene().step();
            frame = requestAnimationFrame(loop);
        });

        const measure = () => {
            night.measure();
            day.measure();
        };
        const watcher = new IntersectionObserver((entries) => {
            for (const entry of entries) visible = entry.isIntersecting;
            if (!visible) scene().clear();
        });
        const resizer = new ResizeObserver(measure);

        watcher.observe(element);
        resizer.observe(element);

        return () => {
            cancelAnimationFrame(frame);
            watcher.disconnect();
            resizer.disconnect();
        };
    }, []);

    return canvas;
}
