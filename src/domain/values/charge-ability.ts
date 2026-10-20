/**
 * What a unit spends a charge on when it is not a missile.
 *
 * - `blow`: one hit deals the charge as extra damage.
 * - `blast`: the same, and the blow also lands on the units around the target.
 * - `dodge`: the unit dodges missiles, one per point of charge.
 * - `block`: the unit takes no damage from one melee blow.
 */
export type ChargeAbilityKind = 'blow' | 'blast' | 'dodge' | 'block';

/** How far around the target a charged blast reaches, and the share of the blow the units there take. */
export interface ChargeBlast {
    radius: number;
    share: number;
}

export interface ChargeAbilityConfig {
    kind: ChargeAbilityKind;
    /** The most charge the unit holds. */
    capacity: number;
    /** Charge regained per second. */
    rechargeRate: number;
    blast?: ChargeBlast | null;
}

/**
 * A charge a unit spends on its own blows or its own defence.
 *
 * The Coustillier's charged blow, the Urumi's sweeping one, the Shrivamsha's dodge and the Iron
 * Pagoda's block all fill up the same way: the unit holds so much charge and regains it at a
 * steady rate. What differs is what a point of it buys.
 */
export class ChargeAbility {
    private readonly config: ChargeAbilityConfig;

    constructor(config: ChargeAbilityConfig) {
        this.config = config;
    }

    public get kind(): ChargeAbilityKind {
        return this.config.kind;
    }

    /** The extra damage of a charged blow, or the most missiles a dodge holds; one for a block. */
    public get amount(): number {
        return this.config.capacity;
    }

    public get blast(): ChargeBlast | null {
        return this.config.blast ?? null;
    }

    /**
     * Seconds the ability takes to come back once used.
     *
     * A blow or a block spends the whole charge and waits for all of it; a dodge spends one point
     * per missile and has it back after one point's worth of time.
     *
     * @returns The time between two uses, or between two dodges regained.
     */
    public cycleTime(): number {
        const points = this.config.kind === 'dodge' ? 1 : this.config.capacity;

        return points / this.config.rechargeRate;
    }
}
