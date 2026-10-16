/** Raw record shapes emitted by the extraction scripts. */

export interface CostRecord {
    food: number;
    wood: number;
    gold: number;
    stone: number;
}

export interface ClassAmountRecord {
    class: string;
    amount: number;
}

/**
 * Which of a unit's missiles something is about.
 *
 * The game gives a unit up to three: the main shot, the secondary missiles that fly with it, and
 * the one a charged attack fires. Each is a unit of its own in the file, with its own damage.
 */
export type ProjectileRoleRecord = 'main' | 'secondary' | 'charge';

/** How a charged attack fills up again once it is spent. */
export interface ChargeRecord {
    /** How much charge the unit holds; zero until a technology hands it one. */
    capacity: number;
    /** Charge regained per second. */
    rechargeRate: number;
}

/** An attack a unit makes with a missile whose damage is not the unit's own. */
export interface SpecialAttackRecord {
    role: ProjectileRoleRecord;
    /** The missile's id in the game file, which is what a technology aimed at it names. */
    projectile: number;
    attacks: ClassAmountRecord[];
    /** How far it reaches, which for a charged attack is offset from the unit's own range. */
    range: number;
    /**
     * For secondary missiles, how many fly with each ordinary shot.
     *
     * Zero when something else puts them in the air: a technology such as Bolt Magazine, or a
     * charged volley such as the Xianbei Raider's.
     */
    count?: number;
    /** For secondary missiles, the most that can fly in one volley, charged or not. */
    maxCount?: number;
    charge?: ChargeRecord;
}

export interface UnitRecord {
    id: number;
    key: string;
    /** Class the game files the unit under; technologies target these, not our categories. */
    classId: number;
    icon: number | null;
    category: string;
    tags: string[];
    age: number;
    /** Civilizations that reach the unit in another age than most, with the age each reaches it in. */
    ageByCiv: Record<string, number>;
    buildings: string[];
    upgradeTechId: number | null;
    upgradeCost: CostRecord | null;
    upgradeResearchTime: number | null;
    cost: CostRecord;
    trainTime: number;
    hp: number;
    /** Stands in for any damage class the defender does not carry. */
    baseArmour: number;
    /** Fraction of the damage from bonus classes the unit does not take. */
    bonusDamageResistance: number;
    /** Missiles a single shot puts in the air beyond the first. */
    extraProjectiles: number;
    /** What each of those extra missiles hits with, which is not what the shooter hits with. */
    secondaryAttacks: ClassAmountRecord[];
    /** Attacks made with a missile of its own: secondary missiles and charged attacks. */
    specialAttacks: SpecialAttackRecord[];
    /** Whether the unit's attacks go through melee and pierce armour. */
    ignoresArmour: boolean;
    /** Whether the unit's armour holds against attacks that go through it. */
    resistsArmourIgnore: boolean;
    attacks: ClassAmountRecord[];
    armours: ClassAmountRecord[];
    range: number;
    minRange: number;
    reloadTime: number;
    accuracy: number;
    blastWidth: number;
    speed: number;
    lineOfSight: number;
    civs: string[];
    uniqueTo: string | null;
    upgradesFrom: string | null;
    upgradesTo: string[];
    line: string;
    /** False for a unit the game can produce that no civilization's tech tree lists. */
    inTechTree: boolean;
}

/** One change a technology makes, exactly as the game's own effect table states it. */
export interface TechEffectRecord {
    mode: 'set' | 'add' | 'multiply';
    /** The one unit it applies to, or null when it applies to a whole class. */
    unit: number | null;
    /** The class it applies to, or null when it names a single unit. */
    unitClass: number | null;
    attribute: string;
    value: number;
    /** For attack and armour, which damage class the value belongs to. */
    damageClass?: string;
    /** Age the change arrives in, for a bonus the game hands out once per age. */
    age?: number;
    /** For a training place, the building the unit becomes trainable at. */
    building?: string;
    /** For a gathering rate, the resource it speeds up, or the kind of ship that gathers it. */
    resource?: string;
    /** The building the change is about, when the unit it names is one the guide has no page for. */
    target?: string;
    /** The missile of the unit the change lands on, when the game wrote it on a missile. */
    projectile?: ProjectileRoleRecord;
}

export interface TechnologyRecord {
    id: number;
    key: string;
    icon: number | null;
    age: number;
    building: string;
    cost: CostRecord;
    researchTime: number;
    civs: string[];
    effects: TechEffectRecord[];
}

/** A technology that speeds up the gathering itself, for one kind of work. */
export interface GatherUpgradeRecord {
    tech: string;
    /** Resource the work produces, and for food the source it comes from. */
    resource: string;
    foodSource?: string;
    multiplier: number;
}

/** A technology that changes how much a villager carries, or how fast it walks back. */
export interface CarryUpgradeRecord {
    tech: string;
    /** Fraction of the base capacity added. */
    carryPercent?: number;
    carryFlat?: number;
    speedMultiplier?: number;
    /** Kinds of work it reaches; absent means every villager. */
    resources?: string[];
    foodSources?: string[];
}

/** A technology that puts more food into a farm before it has to be rebuilt. */
export interface FarmUpgradeRecord {
    tech: string;
    extraFood: number;
}

/** The numbers behind the villager planner, read from the game rather than written by hand. */
/** One kind of villager work, with the two numbers the game states about it. */
export interface VillagerJobRecord {
    resource: string;
    foodSource?: string;
    /** Resources per second at the resource itself, before any walking. */
    gatherRate: number;
    /** How much the villager carries before walking back. */
    carryCapacity: number;
}

export interface EconomyRecord {
    jobs: VillagerJobRecord[];
    villagerWalkSpeed: number;
    farmFood: number;
    farmWoodCost: number;
    gatherUpgrades: GatherUpgradeRecord[];
    carryUpgrades: CarryUpgradeRecord[];
    farmUpgrades: FarmUpgradeRecord[];
}

export interface CivilizationRecord {
    key: string;
    icon: string;
    era: string;
    uniqueUnits: string[];
    uniqueTechs: string[];
    /** What the civilization is simply given, with no technology to research. */
    bonusEffects: TechEffectRecord[];
    /** What it gives its allies, and itself, for being in the game. */
    teamBonusEffects: TechEffectRecord[];
}

export interface UnitTextRecord {
    name: string;
    role: string;
    strongVs: string;
    weakVs: string;
    upgradesHint: string;
}

export interface TechnologyTextRecord {
    name: string;
    description: string;
}

export interface CivilizationSectionRecord {
    title: string;
    items: string[];
}

export interface CivilizationTextRecord {
    name: string;
    intro: string;
    bonuses: string[];
    sections: CivilizationSectionRecord[];
}

export interface GameStringBundle {
    units: Record<string, UnitTextRecord>;
    techs: Record<string, TechnologyTextRecord>;
    civs: Record<string, CivilizationTextRecord>;
}
