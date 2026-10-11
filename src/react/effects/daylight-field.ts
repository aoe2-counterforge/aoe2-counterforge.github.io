export interface DaylightFieldConfig {
    canvas: HTMLCanvasElement;
    /** Sparks per ten thousand square pixels; one is the calm setting. */
    density?: number;
    /** How hard the air pushes sideways; one is a light draught. */
    wind?: number;
    /** Keeps new sparks inside one part of the canvas, such as the open tab. */
    column?: () => { from: number; width: number };
}

interface Spark {
    x: number;
    y: number;
    vx: number;
    vy: number;
    age: number;
    span: number;
    size: number;
    heat: number;
}

const AREA_PER_SPARK = 6000;
const MAX_PIXEL_RATIO = 2;

/** No banner is wider than this; anything beyond it is a layout mistake, not a request. */
const MAX_SIDE = 4096;

/** How much a spark slows each frame once thrown; it climbs, hangs, and falls back. */
const GRAVITY = 0.012;

/** How far behind its head a spark's streak reaches, in frames of travel. */
const TRAIL = 7;

/**
 * The forge by day: sparks thrown up from the hearth, each drawn as the streak it leaves.
 *
 * A glowing dot is nothing against a pale plate, so by day a spark is its trail: a short stroke of
 * saturated orange that the eye reads as motion. Like the embers, the field only owns a canvas;
 * whoever created it decides when to measure and when to advance a frame.
 */
export class DaylightField {
    private readonly config: DaylightFieldConfig;
    private readonly paint: CanvasRenderingContext2D;
    private readonly sparks: Spark[] = [];
    private width = 0;
    private height = 0;

    constructor(config: DaylightFieldConfig) {
        const paint = config.canvas.getContext('2d');
        if (!paint) throw new Error('This browser refused a 2d canvas for the daylight field.');

        this.config = config;
        this.paint = paint;
        this.paint.lineCap = 'round';
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
        this.sparks.length = 0;
    }

    /** Advances every spark one frame and repaints the canvas. */
    public step(): void {
        this.paint.clearRect(0, 0, this.width, this.height);
        if (this.width < 1 || this.height < 1) return;

        this.fill();

        this.paint.globalCompositeOperation = 'source-over';
        for (const spark of this.sparks) this.advance(spark);
    }

    /** Clears the canvas, for when the effect is switched off. */
    public clear(): void {
        this.paint.clearRect(0, 0, this.width, this.height);
    }

    private fill(): void {
        const density = this.config.density ?? 1;
        const wanted = this.config.column
            ? Math.round(5 * density)
            : Math.round(((this.width * this.height) / AREA_PER_SPARK) * density);

        while (this.sparks.length < wanted) this.sparks.push(this.spawn(true));
        while (this.sparks.length > wanted) this.sparks.pop();
    }

    /** A spark leaves the hearth in the middle of the floor, or whatever column it was pointed at. */
    private spawn(seeded: boolean): Spark {
        const column = this.config.column?.() ?? { from: this.width * 0.25, width: this.width * 0.5 };
        const span = 70 + Math.random() * 80;

        return {
            x: column.from + Math.random() * column.width,
            y: seeded ? Math.random() * this.height : this.height + Math.random() * 4,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -(0.6 + Math.random() * 0.9),
            age: seeded ? Math.random() * span : 0,
            span,
            size: 0.9 + Math.random() * 1.1,
            heat: 0.5 + Math.random() * 0.5,
        };
    }

    private advance(spark: Spark): void {
        const wind = this.config.wind ?? 1;

        spark.age += 1;
        spark.vy += GRAVITY;
        spark.vx += (Math.random() - 0.5) * 0.04 + 0.004 * wind;
        spark.x += spark.vx;
        spark.y += spark.vy;

        if (spark.age >= spark.span || spark.y > this.height + 10 || spark.x < -10 || spark.x > this.width + 10) {
            Object.assign(spark, this.spawn(false));

            return;
        }

        // Bright the moment it leaves the hearth, then cooling all the way down.
        const life = spark.age / spark.span;
        const alpha = spark.heat * Math.min(1, life * 6) * (1 - life) ** 0.8;
        if (alpha < 0.02) return;

        this.draw(spark, alpha);
    }

    /** Paints one spark as its streak, fading from nothing at the tail to full heat at the head. */
    private draw(spark: Spark, alpha: number): void {
        const tailX = spark.x - spark.vx * TRAIL;
        const tailY = spark.y - spark.vy * TRAIL;
        const streak = this.paint.createLinearGradient(tailX, tailY, spark.x, spark.y);
        streak.addColorStop(0, 'rgb(225 75 15 / 0%)');
        streak.addColorStop(1, `rgb(225 75 15 / ${alpha.toFixed(3)})`);

        this.paint.strokeStyle = streak;
        this.paint.lineWidth = spark.size;
        this.paint.beginPath();
        this.paint.moveTo(tailX, tailY);
        this.paint.lineTo(spark.x, spark.y);
        this.paint.stroke();

        this.paint.fillStyle = `rgb(255 120 20 / ${(alpha * 0.9).toFixed(3)})`;
        this.paint.beginPath();
        this.paint.arc(spark.x, spark.y, spark.size * 0.9, 0, Math.PI * 2);
        this.paint.fill();
    }
}
