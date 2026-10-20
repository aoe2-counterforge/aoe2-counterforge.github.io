import { groupTargets, type ChargeTarget, type TargetGroup } from '../enums/charge-target.ts';
import type { ProjectileRole } from '../enums/projectile-role.ts';
import type { AttackProfile } from './attack-profile.ts';
import type { ClassAmount } from './class-amount.ts';

/** How a charged attack fills up again once it is spent. */
export interface ChargeConfig {
    /** How much charge the unit holds; zero until a technology hands it one. */
    capacity: number;
    /** Charge regained per second. */
    rechargeRate: number;
    /** What the charged attack fires: its own missile as often as it can, or one with a volley behind. */
    kind?: 'missiles' | 'volley' | null;
    /** The kinds of target the charge is used against, or null when it is used against every one. */
    targets?: readonly ChargeTarget[] | null;
}

/** How a missile slows what it hits. */
export interface Slow {
    /** The share of its speed the target loses. */
    share: number;
    seconds: number;
}

export interface SpecialAttackConfig {
    role: ProjectileRole;
    /** The missile's id in the game file. */
    projectile: number;
    attack: AttackProfile;
    range: number;
    /** For secondary missiles, how many fly with each shot; for a charged attack, how many charged missiles it fires. */
    count: number | null;
    /** For secondary missiles, the most that fly in one volley, charged or not; null for any other role. */
    maxCount?: number | null;
    /** For a charged attack, how it fills up again; null for any other role. */
    charge: ChargeConfig | null;
    /** Whether the attack throws the damage of the unit's own attack rather than a list of its own. */
    replicatesMain?: boolean;
    /** How the missile slows what it hits, when it does. */
    slows?: Slow | null;
}

/** What a set of technologies does to a special attack. */
export interface SpecialAttackPatch {
    attack?: readonly ClassAmount[];
    attackMultipliers?: readonly ClassAmount[];
    range?: number;
    /** Missiles added to the most a charged attack, or the volley it carries, fires at once. */
    missiles?: number;
}

/**
 * An attack a unit makes with a missile whose damage is not the unit's own.
 *
 * The Kipchak's extra arrows and the Hearth Troop's javelin each come out of a missile of their
 * own, with a damage list the game writes on that missile; the unit's stat line says nothing about
 * them, and they are kept apart from it so nothing counts them twice.
 */
export class SpecialAttack {
    private readonly config: SpecialAttackConfig;

    constructor(config: SpecialAttackConfig) {
        this.config = config;
    }

    public get role(): ProjectileRole {
        return this.config.role;
    }

    public get projectile(): number {
        return this.config.projectile;
    }

    public get attack(): AttackProfile {
        return this.config.attack;
    }

    public get range(): number {
        return this.config.range;
    }

    public get count(): number | null {
        return this.config.count;
    }

    public get maxCount(): number | null {
        return this.config.maxCount ?? null;
    }

    public get charge(): ChargeConfig | null {
        return this.config.charge;
    }

    /** Whether its damage is the unit's own attack, thrown from the missile. */
    public get replicatesMain(): boolean {
        return this.config.replicatesMain === true;
    }

    /** How its missile slows what it hits, or null when it does not. */
    public get slows(): Slow | null {
        return this.config.slows ?? null;
    }

    /**
     * Whether its missiles fly only inside a charged volley rather than with the ordinary shot.
     *
     * The Xianbei Raider fires no secondary arrow with a plain shot and five behind its charged one.
     *
     * @returns True for secondary missiles a volley can carry beyond what each shot does.
     */
    public fliesOnlyInVolley(): boolean {
        return this.config.role === 'secondary' && (this.config.maxCount ?? 0) > (this.config.count ?? 0);
    }

    /**
     * The groups of target a charged attack is used against and the ones it leaves to the unit's
     * own attack.
     *
     * @returns Both lists, or null when the charge is used against every target or the game's
     *          list of targets splits a group, which no group name could then describe.
     */
    public targetGroups(): { within: TargetGroup[]; without: TargetGroup[] } | null {
        const targets = this.config.charge?.targets;
        if (!targets) return null;

        const groups = groupTargets(targets);

        return groups && groups.without.length > 0 ? groups : null;
    }

    /**
     * Seconds a spent charge takes to fill up again.
     *
     * @returns The time, which is near zero for a charge the game refills at once, or null when
     *          the attack has no charge or holds none yet.
     */
    public rechargeTime(): number | null {
        const charge = this.config.charge;
        if (charge === null || charge.capacity <= 0 || charge.rechargeRate <= 0) return null;

        return charge.capacity / charge.rechargeRate;
    }

    /**
     * Gives a charged attack the unit's own damage when the game wrote none for its missile.
     *
     * The Jomsviking's torch has an empty damage list in the file, and the blows measured in the
     * game show it dealing exactly the unit's melee attack: every bonus class, reduced by melee
     * armour, following Forging and the Elite upgrade. An attack that has a list of its own is
     * returned as it is, and one that already replicates takes the new damage, so the same attack
     * can be given the upgraded stat line afterwards.
     *
     * @param main - The unit's own attack, with whatever technologies have been applied to it.
     * @returns A new attack carrying the unit's damage, or the receiver when it has damage of its own.
     */
    public replicating(main: AttackProfile): SpecialAttack {
        if (this.config.role !== 'charge') return this;
        if (!this.replicatesMain && !this.config.attack.isEmpty()) return this;

        return new SpecialAttack({ ...this.config, attack: main, replicatesMain: true });
    }

    /**
     * Applies what a set of technologies does to the attack.
     *
     * An attack that replicates the unit's damage ignores the damage changes: the unit's own
     * stat line already carries them, and counting them here as well would add them twice.
     *
     * @param patch - Damage added and scaled per class, and the change in reach.
     * @returns A new special attack; the receiver is left untouched.
     */
    public patched(patch: SpecialAttackPatch): SpecialAttack {
        const missiles = patch.missiles ?? 0;
        const charged = this.config.role === 'charge' && this.config.count !== null;
        const volley = this.config.role === 'secondary' && this.config.maxCount !== undefined && this.config.maxCount !== null;

        return new SpecialAttack({
            ...this.config,
            attack: this.replicatesMain
                ? this.config.attack
                : this.config.attack.scaled(patch.attackMultipliers ?? []).plus(patch.attack ?? []),
            range: this.config.range + (patch.range ?? 0),
            count: charged ? (this.config.count ?? 0) + missiles : this.config.count,
            maxCount: volley ? (this.config.maxCount ?? 0) + missiles : this.config.maxCount,
        });
    }
}
