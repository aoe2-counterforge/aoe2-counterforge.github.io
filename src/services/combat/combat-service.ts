import type { UnitStats } from '../../domain/values/unit-stats.ts';
import type { DamageBreakdown, DamageCalculator } from './damage-calculator.ts';

export interface CombatServiceConfig {
    damageCalculator: DamageCalculator;
    /** Free hits the longer-ranged side may land while the gap is closed. */
    maxFreeHits: number;
    /** How many approach phases a faster, longer-ranged unit is assumed to win. */
    kiteRepeats: number;
    /** Seconds a kiting shooter loses on each shot on top of its own attack delay. */
    kiteOverheadSeconds: number;
}

/**
 * How a fight is assumed to play out.
 *
 * `stand` trades blows from first contact, `skirmish` lets the longer-ranged unit shoot while the
 * gap closes, and `army` fights two equal-value armies instead of one unit of each.
 */
export type EngagementModel = 'stand' | 'skirmish' | 'army';

export interface DuelQuery {
    attacker: UnitStats;
    defender: UnitStats;
    model?: EngagementModel;
}

export interface DuelSide {
    damagePerHit: number;
    effectiveDamagePerHit: number;
    dps: number;
    hitsToKill: number;
    freeHits: number;
    timeToKill: number;
    breakdown: DamageBreakdown;
}

export interface DuelResult {
    attacker: DuelSide;
    defender: DuelSide;
    model: EngagementModel;
}

const MIN_SPEED = 0.1;
const MIN_RELOAD = 0.1;

/** Turns two stat lines into the numbers a player actually cares about: damage, DPS and kill times. */
export class CombatService {
    private readonly config: CombatServiceConfig;

    constructor(config: CombatServiceConfig) {
        this.config = config;
    }

    /**
     * Damage a single hit deals.
     *
     * @param attacker - Stat line of the unit landing the hit.
     * @param defender - Stat line of the unit taking the hit.
     * @returns The clamped total plus the per-class breakdown behind it.
     */
    public damage(attacker: UnitStats, defender: UnitStats): DamageBreakdown {
        return this.config.damageCalculator.between(attacker, defender);
    }

    /**
     * Sustained damage per second once accuracy is taken into account.
     *
     * A unit that never reloads spends itself in a single blow, so it has no sustained output to
     * measure rather than an enormous one.
     *
     * @param attacker - Stat line of the unit landing the hits.
     * @param defender - Stat line of the unit taking the hits.
     * @returns Damage per second against that defender, or zero for a single-use unit.
     */
    public dps(attacker: UnitStats, defender: UnitStats): number {
        if (attacker.reloadTime < MIN_RELOAD) return 0;

        return this.effectiveDamage(attacker, defender) / attacker.reloadTime;
    }

    /**
     * Resolves a one-versus-one fight between two stat lines.
     *
     * @param query - Both stat lines plus the engagement model to assume.
     * @returns Symmetric per-side figures; kill times are measured from first contact.
     */
    public duel(query: DuelQuery): DuelResult {
        const model = query.model ?? 'skirmish';
        const attackerFree = model === 'stand' ? 0 : this.freeHits(query.attacker, query.defender);
        const defenderFree = model === 'stand' ? 0 : this.freeHits(query.defender, query.attacker);

        return {
            model,
            attacker: this.side(query.attacker, query.defender, attackerFree),
            defender: this.side(query.defender, query.attacker, defenderFree),
        };
    }

    private side(attacker: UnitStats, defender: UnitStats, freeHits: number): DuelSide {
        const breakdown = this.damage(attacker, defender);
        const effective = this.effectiveDamage(attacker, defender);
        const hitsToKill = Math.max(1, Math.ceil(defender.hp / effective));
        const landedFree = Math.min(freeHits, hitsToKill - 1);
        const reload = Math.max(MIN_RELOAD, attacker.reloadTime);

        return {
            damagePerHit: breakdown.total + breakdown.volley.extra * breakdown.volley.each,
            effectiveDamagePerHit: effective,
            dps: this.dps(attacker, defender),
            hitsToKill,
            freeHits: landedFree,
            timeToKill: (hitsToKill - landedFree - 1) * reload,
            breakdown,
        };
    }

    private effectiveDamage(attacker: UnitStats, defender: UnitStats): number {
        const hit = this.damage(attacker, defender);

        return Math.max(0.1, (hit.total + hit.volley.extra * hit.volley.each) * attacker.hitChance());
    }

    /**
     * How fast a chaser eats into the gap a longer-ranged shooter keeps open.
     *
     * A shooter that outruns its chaser replays the approach several times, which is what kiting
     * looks like once it is boiled down to a single number. One that cannot outrun it still only
     * has to stand still until its missile leaves and can walk away for the rest of its reload, so
     * it holds off a chaser of its own speed and slows down a somewhat faster one; however well
     * that is done, it never wins more approaches than outrunning the chaser would.
     *
     * @param shooter - Stat line of the unit keeping its distance.
     * @param chaser - Stat line of the unit closing in.
     * @returns Tiles per second the gap shrinks by; the chaser's own speed when nothing slows it.
     */
    public closingSpeed(shooter: UnitStats, chaser: UnitStats): number {
        const chase = Math.max(MIN_SPEED, chaser.speed);
        if (shooter.range - chaser.range < 2 || !shooter.isRanged()) return chase;

        const floor = chase / this.config.kiteRepeats;
        if (shooter.speed > chase) return floor;

        const standing = shooter.attackDelay + this.config.kiteOverheadSeconds;
        const walking = Math.max(0, 1 - standing / Math.max(MIN_RELOAD, shooter.reloadTime));

        return Math.max(floor, chase - shooter.speed * walking);
    }

    /** How many hits the longer-ranged unit lands while its opponent closes the gap. */
    private freeHits(attacker: UnitStats, defender: UnitStats): number {
        const gap = attacker.range - Math.max(defender.range, 0);
        if (gap < 1) return 0;

        const approachSeconds = gap / this.closingSpeed(attacker, defender);

        return Math.min(this.config.maxFreeHits, Math.floor(approachSeconds / Math.max(MIN_RELOAD, attacker.reloadTime)));
    }
}
