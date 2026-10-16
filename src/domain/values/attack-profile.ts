import { BASE_MELEE, BASE_PIERCE, type ArmourClass } from '../enums/armour-class.ts';
import type { ClassAmount } from './class-amount.ts';

export interface AttackProfileConfig {
    entries: readonly ClassAmount[];
}

/** The attack side of the damage equation: a base damage type plus per-class bonuses. */
export class AttackProfile {
    private readonly byClass: ReadonlyMap<ArmourClass, number>;

    constructor(config: AttackProfileConfig) {
        this.byClass = new Map(config.entries.map((entry) => [entry.armourClass, entry.amount]));
    }

    public get melee(): number {
        return this.valueFor(BASE_MELEE);
    }

    public get pierce(): number {
        return this.valueFor(BASE_PIERCE);
    }

    /** The headline attack number the game UI shows. */
    public get displayValue(): number {
        return Math.max(this.melee, this.pierce);
    }

    /**
     * Damage this attack contributes against one class before armour is subtracted.
     *
     * @param armourClass - Class carried by the defender.
     * @returns The attack value, or zero when the class is not targeted.
     */
    public valueFor(armourClass: ArmourClass): number {
        return this.byClass.get(armourClass) ?? 0;
    }

    /**
     * The bonus-damage entries, excluding the two base damage types.
     *
     * @returns Non-zero bonuses sorted from the largest to the smallest.
     */
    public bonuses(): ClassAmount[] {
        return [...this.byClass]
            .filter(([armourClass, amount]) => amount > 0 && armourClass !== BASE_MELEE && armourClass !== BASE_PIERCE)
            .map(([armourClass, amount]) => ({ armourClass, amount }))
            .sort((left, right) => right.amount - left.amount);
    }

    /**
     * Whether the attack deals no damage at all, which is how the game writes a missile that
     * borrows the damage of whoever throws it.
     *
     * @returns True when every class is absent or zero.
     */
    public isEmpty(): boolean {
        return [...this.byClass.values()].every((amount) => amount === 0);
    }

    /**
     * Which armour the base damage goes through.
     *
     * @returns Melee or pierce, whichever the attack carries more of, or null when it carries neither.
     */
    public damageType(): 'melee' | 'pierce' | null {
        if (this.melee === 0 && this.pierce === 0) return null;

        return this.melee > this.pierce ? 'melee' : 'pierce';
    }

    /**
     * Every damage class the attack raises or lowers, apart from the two base damage types.
     *
     * Unlike `bonuses`, it keeps the negative entries, which a reader needs to see: the Xianbei
     * Raider's arrows lose three against mounted units.
     *
     * @returns Non-zero entries, the largest bonus first and the penalties last.
     */
    public modifiers(): ClassAmount[] {
        return [...this.byClass]
            .filter(
                ([armourClass, amount]) =>
                    amount !== 0 &&
                    armourClass !== BASE_MELEE &&
                    armourClass !== BASE_PIERCE &&
                    !armourClass.startsWith('unused-'),
            )
            .map(([armourClass, amount]) => ({ armourClass, amount }))
            .sort((left, right) => right.amount - left.amount);
    }

    /**
     * Scales single classes by a factor.
     *
     * @param factors - One factor per class, as a multiplier of the value already there.
     * @returns A new profile; the receiver is left untouched.
     */
    public scaled(factors: readonly ClassAmount[]): AttackProfile {
        const merged = new Map(this.byClass);
        for (const factor of factors) {
            const current = merged.get(factor.armourClass);
            if (current !== undefined) merged.set(factor.armourClass, current * factor.amount);
        }

        return new AttackProfile({ entries: [...merged].map(([armourClass, amount]) => ({ armourClass, amount })) });
    }

    /**
     * Adds attack points on top of the current values.
     *
     * @param deltas - Amounts to add per class; unknown classes are appended.
     * @returns A new profile; the receiver is left untouched.
     */
    public plus(deltas: readonly ClassAmount[]): AttackProfile {
        const merged = new Map(this.byClass);
        for (const delta of deltas) {
            merged.set(delta.armourClass, (merged.get(delta.armourClass) ?? 0) + delta.amount);
        }

        return new AttackProfile({ entries: [...merged].map(([armourClass, amount]) => ({ armourClass, amount })) });
    }

    /**
     * Exposes the table as a plain list.
     *
     * @returns A defensive copy safe to hand to the render layer.
     */
    public entries(): ClassAmount[] {
        return [...this.byClass].map(([armourClass, amount]) => ({ armourClass, amount }));
    }
}
