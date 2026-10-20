import type { AgeId } from '../enums/age.ts';
import type { ProjectileRole } from '../enums/projectile-role.ts';
import type { UnitCategory } from '../enums/unit-category.ts';
import type { ChargeAbility } from '../values/charge-ability.ts';
import type { ResourceCost } from '../values/resource-cost.ts';
import type { SpecialAttack } from '../values/special-attack.ts';
import type { UnitStats } from '../values/unit-stats.ts';

export interface UnitUpgradeInfo {
    readonly techId: number;
    readonly cost: ResourceCost;
    readonly researchTime: number;
}

export interface UnitConfig {
    id: number;
    /** Class the game files the unit under; its own technologies target these. */
    classId: number;
    key: string;
    icon: number | null;
    category: UnitCategory;
    tags: readonly string[];
    age: AgeId;
    /** The age a civilization reaches the unit in, for the few a bonus moves it for. */
    ageByCiv: Readonly<Record<string, AgeId>>;
    buildings: readonly string[];
    cost: ResourceCost;
    trainTime: number;
    stats: UnitStats;
    /** Secondary missiles and charged attacks, each with damage of its own. */
    specialAttacks: readonly SpecialAttack[];
    /** A charge the unit spends on its own blows or its own defence, when it has one. */
    chargeAbility?: ChargeAbility | null;
    line: string;
    upgradesFrom: string | null;
    upgradesTo: readonly string[];
    /** False for a unit the game can produce that no civilization's tech tree lists. */
    inTechTree: boolean;
    upgrade: UnitUpgradeInfo | null;
    civs: readonly string[];
    uniqueTo: string | null;
}

/** A trainable unit: who can build it, what it costs and how it fights. */
export class Unit {
    private readonly config: UnitConfig;
    private readonly civSet: ReadonlySet<string>;
    private readonly tagSet: ReadonlySet<string>;

    constructor(config: UnitConfig) {
        this.config = config;
        this.civSet = new Set(config.civs);
        this.tagSet = new Set(config.tags);
    }

    public get id(): number {
        return this.config.id;
    }

    /** Class the game files the unit under, which is what its technologies name. */
    public get classId(): number {
        return this.config.classId;
    }

    public get key(): string {
        return this.config.key;
    }

    public get icon(): number | null {
        return this.config.icon;
    }

    public get category(): UnitCategory {
        return this.config.category;
    }

    public get tags(): readonly string[] {
        return this.config.tags;
    }

    public get age(): AgeId {
        return this.config.age;
    }

    /**
     * The age a civilization reaches the unit in.
     *
     * @param civKey - Civilization slug, or null for the age most civilizations share.
     * @returns That civilization's age for the unit, which only a bonus moves off the common one.
     */
    public ageFor(civKey: string | null): AgeId {
        if (civKey !== null && Object.hasOwn(this.config.ageByCiv, civKey)) return this.config.ageByCiv[civKey];

        return this.config.age;
    }

    public get buildings(): readonly string[] {
        return this.config.buildings;
    }

    public get cost(): ResourceCost {
        return this.config.cost;
    }

    public get trainTime(): number {
        return this.config.trainTime;
    }

    public get stats(): UnitStats {
        return this.config.stats;
    }

    public get specialAttacks(): readonly SpecialAttack[] {
        return this.config.specialAttacks;
    }

    /** A charge the unit spends on its own blows or its own defence, or null when it has none. */
    public get chargeAbility(): ChargeAbility | null {
        return this.config.chargeAbility ?? null;
    }

    /**
     * The special attack a missile role carries.
     *
     * @param role - Which of the unit's missiles to look for.
     * @returns The attack, or null when the unit makes none with that missile.
     */
    public specialAttack(role: ProjectileRole): SpecialAttack | null {
        return this.config.specialAttacks.find((attack) => attack.role === role) ?? null;
    }

    /**
     * The special attacks that actually fire.
     *
     * The game gives every archer, skirmisher and galley a secondary missile it never uses until a
     * technology or a bonus raises the missile count, and a fire ship a charge it only holds after
     * Siphons; listing those would tell a reader the plain unit does something it does not. A
     * secondary counts when it flies with the ordinary shot or with the unit's charged volley.
     *
     * @returns The charged attack and the secondary missiles the unit fires as it stands, a charge
     *          whose missile carries no damage already holding the unit's own.
     */
    public get activeSpecialAttacks(): readonly SpecialAttack[] {
        return this.config.specialAttacks
            .filter((attack) => this.fires(attack))
            .map((attack) => attack.replicating(this.config.stats.attack));
    }

    /**
     * The special attack a missile role carries, when that attack really fires.
     *
     * @param role - Which of the unit's missiles to look for.
     * @returns The attack, or null when the unit makes none with that missile or never fires it.
     */
    public activeSpecialAttack(role: ProjectileRole): SpecialAttack | null {
        return this.activeSpecialAttacks.find((attack) => attack.role === role) ?? null;
    }

    private fires(attack: SpecialAttack): boolean {
        if (attack.role === 'charge') return (attack.charge?.capacity ?? 0) > 0;
        if (attack.role !== 'secondary') return false;
        if ((attack.count ?? 0) > 0) return true;

        const volley = this.specialAttack('charge');

        return volley !== null && this.fires(volley) && attack.fliesOnlyInVolley();
    }

    public get line(): string {
        return this.config.line;
    }

    public get upgradesFrom(): string | null {
        return this.config.upgradesFrom;
    }

    public get upgradesTo(): readonly string[] {
        return this.config.upgradesTo;
    }

    /** Whether any civilization's tech tree names it, which is what a menu can promise. */
    public get inTechTree(): boolean {
        return this.config.inTechTree;
    }

    public get upgrade(): UnitUpgradeInfo | null {
        return this.config.upgrade;
    }

    public get civs(): readonly string[] {
        return this.config.civs;
    }

    public get uniqueTo(): string | null {
        return this.config.uniqueTo;
    }

    /**
     * Tells whether a civilization can train this unit.
     *
     * @param civKey - Civilization slug, or null for the civilization-agnostic view.
     * @returns True when the unit is in that civilization's tech tree.
     */
    public availableTo(civKey: string | null): boolean {
        return civKey === null || this.civSet.has(civKey);
    }

    /**
     * Tells whether the unit carries a dataset tag such as gunpowder or unique-unit.
     *
     * @param tag - Tag to look for.
     * @returns True when the tag is present.
     */
    public hasTag(tag: string): boolean {
        return this.tagSet.has(tag);
    }

    /**
     * Replaces the stat line, typically with an upgraded one.
     *
     * @param stats - Stat line to attach.
     * @returns A new unit; the receiver is left untouched.
     */
    public withStats(stats: UnitStats): Unit {
        return new Unit({ ...this.config, stats });
    }
}
