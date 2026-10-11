import { ParticleField, type ParticleFieldConfig } from './particle-field.ts';

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
const SPARKS_IN_COLUMN = 5;

/** How much a spark slows each frame once thrown; it climbs, hangs, and falls back. */
const GRAVITY = 0.012;

/** How far behind its head a spark's streak reaches, in frames of travel. */
const TRAIL = 7;

/**
 * The forge by day: sparks thrown up from the hearth, each drawn as the streak it leaves.
 *
 * A glowing dot is nothing against a pale plate, so by day a spark is its trail: a short stroke of
 * saturated orange that the eye reads as motion.
 */
export class DaylightField extends ParticleField<Spark> {
    constructor(config: ParticleFieldConfig) {
        super(config, { areaPerParticle: AREA_PER_SPARK, inColumn: SPARKS_IN_COLUMN });
        this.paint.lineCap = 'round';
    }

    protected frame(): void {
        for (const spark of this.particles) this.advance(spark);
    }

    /** A spark leaves the hearth in the middle of the floor, or whatever column it was pointed at. */
    protected spawn(seeded: boolean): Spark {
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
            this.recycle(spark);

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
