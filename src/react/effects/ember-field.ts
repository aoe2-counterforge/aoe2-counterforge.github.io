import { ParticleField, type ParticleFieldConfig } from './particle-field.ts';

interface Ember {
    x: number;
    y: number;
    size: number;
    rise: number;
    sway: number;
    phase: number;
    beat: number;
    heat: number;
    drift: number;
}

const AREA_PER_EMBER = 2600;
const EMBERS_IN_COLUMN = 7;
const FRAME = 1 / 60;

/**
 * The embers that drift up over the forge at night.
 *
 * Each one is painted as a light source, a bloom around a hot core, and the lights add up where
 * they overlap: over dark metal that is what fire looks like.
 */
export class EmberField extends ParticleField<Ember> {
    private clock = 0;

    constructor(config: ParticleFieldConfig) {
        super(config, { areaPerParticle: AREA_PER_EMBER, inColumn: EMBERS_IN_COLUMN });
    }

    protected frame(): void {
        this.clock += FRAME;

        this.paint.globalCompositeOperation = 'lighter';
        for (const ember of this.particles) this.advance(ember);
        this.paint.globalCompositeOperation = 'source-over';
    }

    protected spawn(seeded: boolean): Ember {
        const brisk = this.config.column !== undefined;
        const size = brisk ? 0.4 + Math.random() * 0.9 : 0.5 + Math.random() ** 2 * 2.1;
        const column = this.config.column?.() ?? { from: 0, width: this.width };

        return {
            x: column.from + Math.random() * column.width,
            y: seeded ? Math.random() * this.height : this.height + Math.random() * 12,
            size,
            rise: (brisk ? 0.34 : 0.16) + size * 0.055 + Math.random() * 0.12,
            sway: 0.4 + Math.random() * 1.1,
            phase: Math.random() * Math.PI * 2,
            beat: 0.5 + Math.random() * 2.4,
            heat: 0.45 + Math.random() * 0.55,
            drift: (Math.random() - 0.5) * 0.14,
        };
    }

    private advance(ember: Ember): void {
        const wind = this.config.wind ?? 1;

        ember.y -= ember.rise;
        ember.x +=
            Math.sin(ember.y * 0.017 + this.clock * 0.55 + ember.phase) * 0.22 * ember.sway * wind +
            ember.drift * wind;

        if (ember.y < -6 || ember.x < -12 || ember.x > this.width + 12) {
            this.recycle(ember);

            return;
        }

        const climb = 1 - ember.y / this.height;
        const fade = Math.min(1, climb * 3.2) * Math.min(1, (1 - climb) * 2.6 + 0.25);
        const flicker = 0.62 + 0.38 * Math.sin(this.clock * ember.beat * 3 + ember.phase);
        const alpha = Math.max(0, ember.heat * fade * flicker);
        if (alpha < 0.015) return;

        this.draw(ember, alpha);
    }

    /** Paints one ember as a light source: a bloom, then the hot core inside it. */
    private draw(ember: Ember, alpha: number): void {
        const warm = 150 + Math.round(ember.heat * 90);
        const bloom = ember.size * 5.5;
        const halo = this.paint.createRadialGradient(ember.x, ember.y, 0, ember.x, ember.y, bloom);
        halo.addColorStop(0, `rgb(255 ${warm} 70 / ${(alpha * 0.42).toFixed(3)})`);
        halo.addColorStop(1, 'rgb(255 120 30 / 0%)');

        this.paint.fillStyle = halo;
        this.paint.beginPath();
        this.paint.arc(ember.x, ember.y, bloom, 0, Math.PI * 2);
        this.paint.fill();

        const core = Math.min(255, 205 + Math.round(ember.heat * 50));
        this.paint.fillStyle = `rgb(255 ${core} 165 / ${Math.min(1, alpha * 1.25).toFixed(3)})`;
        this.paint.beginPath();
        this.paint.arc(ember.x, ember.y, ember.size * 0.62, 0, Math.PI * 2);
        this.paint.fill();
    }
}
