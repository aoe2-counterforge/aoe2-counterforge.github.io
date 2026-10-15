import type { ProjectileRole } from '../../domain/enums/projectile-role.ts';
import type { ClassAmount } from '../../domain/values/class-amount.ts';

/** The stat changes a technology applies, expressed the same way the game applies them. */
export interface StatDelta {
    /**
     * Number of ages that each grant the change, when the game repeats the same one per age.
     *
     * The values above are the total, as they are everywhere else; this only says the total was
     * reached in equal steps, which is how the game itself words those bonuses.
     */
    perAge?: number;
    hp?: number;
    hpMultiplier?: number;
    /** Value the accuracy is raised to, for effects that set it outright. */
    accuracyFloor?: number;
    /** Value the line of sight is raised to, for effects that set it outright. */
    lineOfSightFloor?: number;
    range?: number;
    accuracy?: number;
    lineOfSight?: number;
    speed?: number;
    speedMultiplier?: number;
    reloadTime?: number;
    reloadTimeMultiplier?: number;
    trainTimeMultiplier?: number;
    blastWidth?: number;
    projectiles?: number;
    /** Hit points the unit gets back on its own, as the game counts them. */
    regeneration?: number;
    /**
     * Whether the unit's shots start leading a moving target.
     *
     * The game stores Ballistics as a flag rather than a number: the projectile aims where the
     * target is going instead of where it stands, which is worth saying even though no stat moves.
     */
    ballistics?: boolean;
    /** Population the unit takes up, which a technology can lower to nothing. */
    population?: number;
    /** How many times faster a monk regains its faith after a conversion. */
    faithMultiplier?: number;
    /** The share of its population space the unit keeps, when a technology scales it. */
    populationMultiplier?: number;
    /** Fraction of a melee hit the unit sends back to whoever landed it. */
    damageReflection?: number;
    /** Value the minimum range is brought down to, for an effect that sets it outright. */
    minRangeCeiling?: number;
    /** True once a technology has given the unit a charge it can spend, such as the fire ship's explosive one. */
    charge?: boolean;
    /** Work the technology speeds up for this unit: what kind, which resource, and by what factor. */
    workRates?: readonly { kind: string; resource?: string; factor: number }[];
    /** What a technology does to how much the unit carries, with the resource when the task says it. */
    carry?: readonly { mode: 'add' | 'multiply' | 'set'; value: number; resource?: string }[];
    /** Prices a technology adds to or sets outright, one resource at a time. */
    costChanges?: readonly { mode: 'add' | 'set'; resource: string; value: number }[];
    /** The factor the unit's blast radius is scaled by. */
    blastMultiplier?: number;
    /** True once the unit's shots hit everything along their path. */
    passThrough?: boolean;
    /** Slugs of the units this one turns into once the technology is researched. */
    upgradesTo?: readonly string[];
    /** How many of this unit the technology hands over for free. */
    spawns?: number;
    /** Slugs of the buildings the technology makes this unit trainable at. */
    trainableAt?: readonly string[];
    /** True once its shots are a different missile, with the damage that missile carries. */
    newMissile?: boolean;
    /** True once the explosion its charge makes is a different one. */
    chargeBlast?: boolean;
    /** True once its hits leave a lingering effect on the target, such as poison. */
    aftereffect?: boolean;
    /** True once a technology has taught the unit's attacks to go through armour. */
    ignoresArmour?: boolean;
    /** Fraction of the damage from bonus classes the unit stops taking. */
    bonusDamageResistance?: number;
    /** What each resource of the price is multiplied by, keyed by resource or 'all'. */
    costMultipliers?: Readonly<Record<string, number>>;
    attack?: readonly ClassAmount[];
    attackMultipliers?: readonly ClassAmount[];
    armour?: readonly ClassAmount[];
    armourMultipliers?: readonly ClassAmount[];
    /**
     * What the technology does to each of the unit's special attacks, kept apart from the unit.
     *
     * Fletching gives the Fire Archer one point of attack and its charged arrows another; the two
     * are different attacks, so each says +1 rather than the unit saying +2. A charged attack's
     * range is the change in how far it reaches; a secondary missile flies as far as the unit.
     */
    special?: SpecialDeltas;
}

/** Changes to special attacks, keyed by the missile that carries each. */
export type SpecialDeltas = Partial<Record<ProjectileRole, StatDelta>>;
