import type { UnitStats } from '../../domain/values/unit-stats.ts';
import type { CombatService } from './combat-service.ts';

export interface BattleSimulatorConfig {
    combat: CombatService;
    /** Weighted resources each side spends on its army. */
    armyValue: number;
    /** Melee attackers that fit around a formation, per square root of the units in it. */
    meleeFrontage: number;
}

export interface Army {
    stats: UnitStats;
    /** Weighted cost of a single unit. */
    value: number;
}

export interface BattleQuery {
    attacker: Army;
    defender: Army;
}

export interface BattleSide {
    /** Units bought with the army value; fractional, since the two budgets rarely divide evenly. */
    fielded: number;
    lost: number;
}

export interface BattleResult {
    attacker: BattleSide;
    defender: BattleSide;
    seconds: number;
}

/** Fine enough that a fast unit covers well under a tile between two steps. */
const TICK = 0.05;
/** Past ten minutes neither side is going to finish the other. */
const MAX_SECONDS = 600;

interface Formation {
    stats: UnitStats;
    fielded: number;
    pool: number;
    /** Damage per second one unit deals to one unit of the other side. */
    dps: number;
}

/**
 * Plays out a fight between two armies of equal value.
 *
 * A duel hides the two things a mass fight is decided by. Every unit of a ranged army shoots at
 * once, so its output grows with its numbers, while a melee army only fights with the units that
 * fit around the enemy. And the approach is paid for by the whole army at once rather than by a
 * single unit, so a long walk under fire costs a handful of units instead of a handful of hits.
 */
export class BattleSimulator {
    private readonly config: BattleSimulatorConfig;

    constructor(config: BattleSimulatorConfig) {
        this.config = config;
    }

    /**
     * Fights two equal-value armies to the end, or to the time limit.
     *
     * Damage is focused: each side finishes one target before it moves to the next, so the
     * survivors are always at full health and the units still alive are the pool divided by the
     * health of one.
     *
     * @param query - Both unit types and what a single unit of each costs.
     * @returns How many units each side fielded and lost, and how long the fight lasted.
     */
    public fight(query: BattleQuery): BattleResult {
        const attacker = this.formationOf(query.attacker, query.defender.stats);
        const defender = this.formationOf(query.defender, query.attacker.stats);

        const longer = attacker.stats.range >= defender.stats.range ? attacker : defender;
        const shorter = longer === attacker ? defender : attacker;
        const closingSpeed = this.config.combat.closingSpeed(longer.stats, shorter.stats);

        let distance = longer.stats.range;
        let seconds = 0;
        while (seconds < MAX_SECONDS && attacker.pool > 0 && defender.pool > 0) {
            if (distance > shorter.stats.range) {
                distance = Math.max(shorter.stats.range, distance - closingSpeed * TICK);
            }

            const toDefender = this.output(attacker, defender, distance) * TICK;
            const toAttacker = this.output(defender, attacker, distance) * TICK;
            defender.pool -= toDefender;
            attacker.pool -= toAttacker;
            seconds += TICK;
        }

        return {
            attacker: this.sideOf(attacker),
            defender: this.sideOf(defender),
            seconds,
        };
    }

    private formationOf(army: Army, enemy: UnitStats): Formation {
        const fielded = this.config.armyValue / Math.max(1, army.value);

        return {
            stats: army.stats,
            fielded,
            pool: fielded * army.stats.hp,
            dps: this.config.combat.dps(army.stats, enemy),
        };
    }

    /**
     * Damage per second a whole army deals at the current distance.
     *
     * A ranged army shoots over its own front line, so every unit counts; a melee army only
     * fights with the units that can reach the edge of the enemy formation.
     */
    private output(source: Formation, target: Formation, distance: number): number {
        if (distance > source.stats.range || distance < source.stats.minRange) return 0;

        const alive = Math.max(0, source.pool / source.stats.hp);
        const targets = Math.max(0, target.pool / target.stats.hp);
        const striking = source.stats.isRanged()
            ? alive
            : Math.min(alive, this.config.meleeFrontage * Math.sqrt(targets));

        return striking * source.dps;
    }

    private sideOf(formation: Formation): BattleSide {
        const remaining = Math.max(0, formation.pool) / formation.stats.hp;

        return { fielded: formation.fielded, lost: formation.fielded - remaining };
    }
}
