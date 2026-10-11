export interface ParticleFieldConfig {
    canvas: HTMLCanvasElement;
    /** Particles per ten thousand square pixels; one is the calm setting. */
    density?: number;
    /** How hard the air pushes sideways; one is a light draught. */
    wind?: number;
    /** Keeps new particles inside one part of the canvas, such as the open tab. */
    column?: () => { from: number; width: number };
}

/** How thickly a field is peopled at the calm density: by area over a banner, by count inside a column. */
export interface Population {
    /** Square pixels one particle stands for. */
    areaPerParticle: number;
    /** How many particles a column holds. */
    inColumn: number;
}

const MAX_PIXEL_RATIO = 2;

/** No banner is wider than this; anything beyond it is a layout mistake, not a request. */
const MAX_SIDE = 4096;

/**
 * A crowd of particles drifting over a canvas.
 *
 * Nothing here knows about the interface framework: the field owns a canvas, and whoever created
 * it decides when to measure and when to advance a frame. Each kind of field says how a particle
 * is born and how the crowd moves and paints in one frame; the sizing, the head count and the
 * housekeeping between frames are the same for all of them.
 */
export abstract class ParticleField<TParticle extends object> {
    protected readonly config: ParticleFieldConfig;
    protected readonly paint: CanvasRenderingContext2D;
    protected readonly particles: TParticle[] = [];
    protected width = 0;
    protected height = 0;
    private readonly population: Population;

    protected constructor(config: ParticleFieldConfig, population: Population) {
        const paint = config.canvas.getContext('2d');
        if (!paint) throw new Error('This browser refused a 2d canvas for the particle field.');

        this.config = config;
        this.paint = paint;
        this.population = population;
        this.measure();
    }

    /** Matches the drawing buffer to the size the page gave the canvas. */
    public measure(): void {
        const ratio = Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);
        const box = this.config.canvas.getBoundingClientRect();

        this.width = Math.min(box.width, MAX_SIDE);
        this.height = Math.min(box.height, MAX_SIDE);
        this.config.canvas.width = Math.max(1, Math.round(this.width * ratio));
        this.config.canvas.height = Math.max(1, Math.round(this.height * ratio));
        this.paint.setTransform(ratio, 0, 0, ratio, 0, 0);
        this.particles.length = 0;
    }

    /** Advances every particle one frame and repaints the canvas. */
    public step(): void {
        this.paint.clearRect(0, 0, this.width, this.height);
        if (this.width < 1 || this.height < 1) return;

        this.fill();
        this.frame();
    }

    /** Clears the canvas, for when the effect is switched off. */
    public clear(): void {
        this.paint.clearRect(0, 0, this.width, this.height);
    }

    /** Moves and paints the whole crowd once. */
    protected abstract frame(): void;

    /** A new particle: anywhere on the canvas while the crowd is being seeded, else at its birthplace. */
    protected abstract spawn(seeded: boolean): TParticle;

    /** Sends a particle that has left the canvas back in as a new one, so the crowd keeps its size. */
    protected recycle(particle: TParticle): void {
        Object.assign(particle, this.spawn(false));
    }

    private fill(): void {
        const density = this.config.density ?? 1;
        const wanted = this.config.column
            ? Math.round(this.population.inColumn * density)
            : Math.round(((this.width * this.height) / this.population.areaPerParticle) * density);

        while (this.particles.length < wanted) this.particles.push(this.spawn(true));
        while (this.particles.length > wanted) this.particles.pop();
    }
}
