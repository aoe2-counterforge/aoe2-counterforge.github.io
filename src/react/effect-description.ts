import type { TFunction } from 'i18next';
import { SPECIAL_ROLES } from '../domain/enums/projectile-role.ts';
import type { ClassAmount } from '../domain/values/class-amount.ts';
import type { SpecialDeltas, StatDelta } from '../services/upgrade/tech-effect.ts';
import type { WorkRate } from '../services/upgrade/upgrade-service.ts';
import { delta, percentDelta, preciseDelta, short } from './format.ts';

/** Above this many classes, a shared factor is stated once instead of class by class. */
const BROAD_ENOUGH = 3;

/**
 * Words one kind of work a technology speeds up.
 *
 * @param rate - The kind of work, the resource when it is gathering, and the factor.
 * @param t - Translator bound to the active interface language.
 * @returns A sentence saying what gets faster and by how much.
 */
export function describeRate(rate: WorkRate, t: TFunction): string {
    const value = short((rate.factor - 1) * 100);
    if (rate.kind !== 'gatherRate') return t(`tech.rate.${rate.kind}`, { value });

    const resource = rate.resource ?? '';
    const ship = resource.startsWith('ship-');
    const name = t(`resources.${resource.replace('ship-', '')}`).toLocaleLowerCase();

    return t(ship ? 'tech.rate.gatherShip' : 'tech.rate.gatherRate', { resource: name, value });
}

/**
 * Turns a technology's stat delta into short human-readable chips.
 *
 * @param change - The numeric effect declared for the technology.
 * @param t - Translator bound to the active interface language.
 * @returns One label per measurable change, empty when the effect is qualitative.
 */
export function describeEffect(
    change: StatDelta,
    t: TFunction,
    unitName: (key: string) => string = (key) => key,
): string[] {
    const ages = change.perAge ?? 1;
    if (ages > 1) {
        return describeEffect({ ...divided(change, ages), perAge: undefined }, t, unitName).map((effect) =>
            t('upgrades.effect.perAge', { effect }),
        );
    }

    const labels: string[] = [];
    const against = (armourClass: string) => againstOf(armourClass, t);

    if (change.hp !== undefined) labels.push(t('upgrades.effect.hp', { value: delta(change.hp) }));
    if (change.hpMultiplier && change.hpMultiplier !== 1) {
        labels.push(t('upgrades.effect.hpPercent', { value: percentDelta(change.hpMultiplier) }));
    }
    if (change.range !== undefined) labels.push(t('upgrades.effect.range', { value: delta(change.range) }));
    if (change.lineOfSight !== undefined) {
        labels.push(t('upgrades.effect.lineOfSight', { value: delta(change.lineOfSight) }));
    }
    if (change.lineOfSightFloor !== undefined) {
        labels.push(t('upgrades.effect.lineOfSight', { value: short(change.lineOfSightFloor) }));
    }
    if (change.accuracy !== undefined) labels.push(t('upgrades.effect.accuracy', { value: 100 }));
    if (change.accuracyFloor !== undefined) {
        labels.push(t('upgrades.effect.accuracyFloor', { value: short(change.accuracyFloor) }));
    }
    if (change.speed !== undefined) labels.push(t('upgrades.effect.speedFlat', { value: delta(change.speed) }));
    if (change.reloadTime !== undefined) {
        labels.push(t('upgrades.effect.reload', { value: preciseDelta(change.reloadTime) }));
    }
    if (change.speedMultiplier && change.speedMultiplier !== 1) {
        labels.push(t('upgrades.effect.speed', { value: percentDelta(change.speedMultiplier) }));
    }
    if (change.reloadTimeMultiplier && change.reloadTimeMultiplier !== 1) {
        labels.push(t('upgrades.effect.attackSpeed', { value: percentDelta(1 / change.reloadTimeMultiplier) }));
    }
    if (change.projectiles !== undefined) {
        labels.push(
            t('upgrades.effect.projectiles', { value: delta(change.projectiles), count: Math.abs(change.projectiles) }),
        );
    }
    if (change.blastWidth !== undefined) {
        labels.push(t('upgrades.effect.blast', { value: delta(change.blastWidth) }));
    }
    if (change.regeneration !== undefined) {
        labels.push(t('upgrades.effect.regeneration', { value: short(change.regeneration) }));
    }
    if (change.ballistics) labels.push(t('upgrades.effect.ballistics'));
    if (change.ignoresArmour) labels.push(t('upgrades.effect.ignoresArmour'));
    if (change.charge) labels.push(t('upgrades.effect.charge'));
    if (change.passThrough) labels.push(t('upgrades.effect.passThrough'));
    if (change.blastMultiplier !== undefined && change.blastMultiplier !== 1) {
        labels.push(t('upgrades.effect.blastPercent', { value: percentDelta(change.blastMultiplier) }));
    }
    for (const carry of change.carry ?? []) {
        const resource = carry.resource === undefined ? '' : t(`resources.${carry.resource}`).toLocaleLowerCase();
        if (carry.mode === 'set') continue;

        const value = carry.mode === 'add' ? delta(carry.value) : percentDelta(carry.value);
        const kind = carry.mode === 'add' ? 'carryFlat' : 'carryPercent';
        labels.push(t(`upgrades.effect.${kind}${carry.resource === undefined ? '' : 'Resource'}`, { value, resource }));
    }
    for (const price of change.costChanges ?? []) {
        const resource = t(`resources.${price.resource}`).toLocaleLowerCase();
        labels.push(
            price.mode === 'add'
                ? t('upgrades.effect.costAdd', { value: delta(price.value), resource })
                : t('upgrades.effect.costSet', { value: short(price.value), resource }),
        );
    }
    for (const rate of change.workRates ?? []) labels.push(describeRate(rate, t));
    for (const key of change.upgradesTo ?? []) {
        labels.push(t('upgrades.effect.upgradesTo', { unit: unitName(key) }));
    }
    if (change.spawns !== undefined) labels.push(t('upgrades.effect.spawns', { count: short(change.spawns) }));
    for (const building of change.trainableAt ?? []) {
        labels.push(t('upgrades.effect.trainableAt', { building: t(`buildings.${building}`, building) }));
    }
    if (change.newMissile) labels.push(t('upgrades.effect.newMissile'));
    if (change.chargeBlast) labels.push(t('upgrades.effect.chargeBlast'));
    if (change.aftereffect) labels.push(t('upgrades.effect.aftereffect'));
    if (change.population !== undefined) {
        labels.push(t('upgrades.effect.population', { value: delta(change.population) }));
    }
    if (change.faithMultiplier !== undefined && change.faithMultiplier !== 1) {
        labels.push(t('upgrades.effect.faith', { value: short((change.faithMultiplier - 1) * 100) }));
    }
    if (change.populationMultiplier !== undefined && change.populationMultiplier !== 1) {
        labels.push(t('upgrades.effect.populationPercent', { value: percentDelta(change.populationMultiplier) }));
    }
    if (change.damageReflection !== undefined) {
        labels.push(t('upgrades.effect.damageReflection', { value: short(change.damageReflection * 100) }));
    }
    if (change.minRangeCeiling !== undefined) {
        labels.push(t('upgrades.effect.minRange', { value: short(change.minRangeCeiling) }));
    }
    if (change.bonusDamageResistance !== undefined) {
        labels.push(t('upgrades.effect.bonusResistance', { value: short(change.bonusDamageResistance * 100) }));
    }

    for (const [resource, factor] of Object.entries(change.costMultipliers ?? {})) {
        if (factor === 1) continue;

        const value = short((factor - 1) * 100);
        labels.push(
            resource === 'all'
                ? t('upgrades.effect.cost', { value })
                : t('upgrades.effect.costResource', { value, resource: t(`resources.${resource}`) }),
        );
    }
    if (change.trainTimeMultiplier && change.trainTimeMultiplier !== 1) {
        labels.push(t('upgrades.effect.trainSpeed', { value: short((1 / change.trainTimeMultiplier - 1) * 100) }));
    }

    labels.push(...scaledLabels(change.attackMultipliers, 'upgrades.effect.attackPercent', t));
    labels.push(...scaledLabels(change.armourMultipliers, 'upgrades.effect.armourPercent', t));
    labels.push(...addedLabels(change.attack, 'upgrades.effect.attack', t));
    for (const entry of change.armour ?? []) {
        if (entry.amount === 0) continue;
        if (entry.armourClass === 'base-melee' || entry.armourClass === 'base-pierce') {
            const stat = entry.armourClass === 'base-melee' ? 'stats.meleeArmour' : 'stats.pierceArmour';
            labels.push(`${delta(entry.amount)} ${t(stat).toLocaleLowerCase()}`);
            continue;
        }
        labels.push(
            t('upgrades.effect.armour', { value: delta(entry.amount), against: against(entry.armourClass) }),
        );
    }

    labels.push(...describeSpecial(change.special, t));

    return labels;
}

/**
 * Words what a technology does to a unit's special attacks, each kept apart from the unit.
 *
 * The Fire Archer gets +1 attack and its charged arrows another +1; two chips, one per attack,
 * so neither reads as a +2 that no stat shows.
 *
 * @param special - The change per missile role, as the upgrade service reports it.
 * @param t - Translator bound to the active interface language.
 * @returns One label per measurable change, charged attack first.
 */
export function describeSpecial(special: SpecialDeltas | undefined, t: TFunction): string[] {
    const labels: string[] = [];

    for (const role of SPECIAL_ROLES) {
        const change = special?.[role];
        if (change === undefined) continue;

        const base = `upgrades.effect.special.${role}`;
        labels.push(...scaledLabels(change.attackMultipliers, `${base}.attackPercent`, t));
        labels.push(...addedLabels(change.attack, `${base}.attack`, t));
        if (change.range !== undefined) labels.push(t(`${base}.range`, { value: delta(change.range) }));
        if (change.aftereffect) labels.push(t(`${base}.aftereffect`));
    }

    return labels;
}

/** The phrase that says which armour class a bonus is against, empty for the two base damage types. */
function againstOf(armourClass: string, t: TFunction): string {
    return armourClass === 'base-melee' || armourClass === 'base-pierce'
        ? ''
        : t('upgrades.effect.against', { class: t(`armourClasses.${armourClass}`) });
}

/** Factors on a damage list, one chip per factor, or one for them all when the factor is broad. */
function scaledLabels(entries: readonly ClassAmount[] | undefined, key: string, t: TFunction): string[] {
    const labels: string[] = [];
    for (const [factor, classes] of byFactor(entries ?? [])) {
        const broad = classes.length >= BROAD_ENOUGH;
        for (const armourClass of broad ? [null] : classes) {
            labels.push(
                t(key, { value: percentDelta(factor), against: armourClass === null ? '' : againstOf(armourClass, t) }),
            );
        }
    }

    return labels;
}

/** Points added to a damage list, one chip per class. */
function addedLabels(entries: readonly ClassAmount[] | undefined, key: string, t: TFunction): string[] {
    return (entries ?? [])
        .filter((entry) => entry.amount !== 0)
        .map((entry) => t(key, { value: delta(entry.amount), against: againstOf(entry.armourClass, t) }));
}

/** One age's worth of a bonus the game hands out once per age. */
function divided(change: StatDelta, ages: number): StatDelta {
    const share = (value: number | undefined) => (value === undefined ? undefined : value / ages);
    const shares = (entries: readonly ClassAmount[] | undefined) =>
        entries?.map((entry) => ({ ...entry, amount: entry.amount / ages }));

    return {
        ...change,
        hp: share(change.hp),
        range: share(change.range),
        lineOfSight: share(change.lineOfSight),
        speed: share(change.speed),
        projectiles: share(change.projectiles),
        blastWidth: share(change.blastWidth),
        regeneration: share(change.regeneration),
        reloadTime: share(change.reloadTime),
        attack: shares(change.attack),
        armour: shares(change.armour),
        special: change.special && {
            charge: change.special.charge && divided(change.special.charge, ages),
            secondary: change.special.secondary && divided(change.special.secondary, ages),
        },
    };
}

/** Groups the classes that share a factor, so a blanket multiplier reads as one statement. */
function byFactor(entries: readonly ClassAmount[]): Map<number, string[]> {
    const groups = new Map<number, string[]>();
    for (const entry of entries) {
        if (entry.amount === 1) continue;
        groups.set(entry.amount, [...(groups.get(entry.amount) ?? []), entry.armourClass]);
    }

    return groups;
}
