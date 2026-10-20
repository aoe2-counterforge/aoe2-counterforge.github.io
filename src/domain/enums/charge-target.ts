/**
 * A kind of target the game tells a charge to be used against.
 *
 * The first six are the land units: infantry, cavalry, archers, cavalry archers, monks, and
 * villagers with the trade carts.
 */
export const CHARGE_TARGETS = [
    'infantry',
    'cavalry',
    'archer',
    'cavalry-archer',
    'monk',
    'villager',
    'ship',
    'siege',
    'building',
] as const;

export type ChargeTarget = (typeof CHARGE_TARGETS)[number];

/** The groups a reader names targets by, in the order they are listed. */
export const TARGET_GROUPS = ['land', 'ship', 'siege', 'building'] as const;

export type TargetGroup = (typeof TARGET_GROUPS)[number];

/** Which kinds of target each group stands for; a group is only named when every one of them is in. */
const GROUP_MEMBERS: Record<TargetGroup, readonly ChargeTarget[]> = {
    land: ['infantry', 'cavalry', 'archer', 'cavalry-archer', 'monk', 'villager'],
    ship: ['ship'],
    siege: ['siege'],
    building: ['building'],
};

const KNOWN = new Set<string>(CHARGE_TARGETS);

/**
 * Lists the kinds of target a group stands for.
 *
 * @param group - A group a reader names targets by.
 * @returns Its kinds, so a group of several can be drawn as the parts it holds.
 */
export function membersOf(group: TargetGroup): readonly ChargeTarget[] {
    return GROUP_MEMBERS[group];
}

/**
 * Narrows an arbitrary string to a known kind of target.
 *
 * @param value - Raw target identifier coming from the generated dataset.
 * @returns True when the value is one of the nine kinds.
 */
export function isChargeTarget(value: string): value is ChargeTarget {
    return KNOWN.has(value);
}

/**
 * Splits a set of targets into the groups it takes in whole and the groups it leaves out whole.
 *
 * @param targets - The kinds of target something is used against.
 * @returns Both lists of groups, or null when a group is only partly in, which no group name describes.
 */
export function groupTargets(targets: readonly ChargeTarget[]): { within: TargetGroup[]; without: TargetGroup[] } | null {
    const within: TargetGroup[] = [];
    const without: TargetGroup[] = [];

    for (const group of TARGET_GROUPS) {
        const inside = GROUP_MEMBERS[group].filter((member) => targets.includes(member)).length;
        if (inside === GROUP_MEMBERS[group].length) within.push(group);
        else if (inside === 0) without.push(group);
        else return null;
    }

    return { within, without };
}
