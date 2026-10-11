import { useEffect, useRef, type RefObject } from 'react';
import { DaylightField } from '../effects/daylight-field.ts';
import { EmberField } from '../effects/ember-field.ts';

export interface EmberFieldOptions {
    density?: number;
    wind?: number;
    /** Keeps new embers inside one part of the canvas, such as the open tab. */
    column?: () => { from: number; width: number };
}

/**
 * Runs the forge's air on a canvas for as long as it is on screen.
 *
 * At night the canvas carries embers; by day, sunlit dust and a little smoke. Which scene paints
 * is decided every frame, so switching the theme changes the picture without remounting anything.
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

        const isLight = (): boolean => {
            const chosen = document.documentElement.dataset.theme;

            return chosen === 'light' || (chosen === undefined && !matchMedia('(prefers-color-scheme: dark)').matches);
        };

        const night = new EmberField({
            canvas: element,
            get density() {
                return latest.current.density;
            },
            get wind() {
                return latest.current.wind;
            },
            column: latest.current.column,
            isLight,
        });
        const day = new DaylightField({
            canvas: element,
            get density() {
                return latest.current.density;
            },
            get wind() {
                return latest.current.wind;
            },
            column: latest.current.column,
        });
        const scene = () => (isLight() ? day : night);

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
