import type { ProjectileRole } from '../domain/enums/projectile-role.ts';
import type { AttackProfile } from '../domain/values/attack-profile.ts';
import type { SpecialAttack } from '../domain/values/special-attack.ts';
import type { UnitStats } from '../domain/values/unit-stats.ts';

/** A charge that refills in less than this reads as ready again at once. */
const INSTANT = 0.05;

/** How often an extra attack comes off, in the words the reader sees. */
export type Cadence =
    | { kind: 'recharge'; seconds: number }
    | { kind: 'eachAttack' }
    | { kind: 'eachShot' };

/** The extra missiles a charged volley adds to its main one, shown with it. */
export interface VolleyExtra {
    attack: SpecialAttack;
    /** The same missiles before technologies, which is what an upgraded one is compared with. */
    before: SpecialAttack | undefined;
    /** The most of them that fly in one volley. */
    most: number;
}

/** One extra attack that is fired on its own. */
export interface AttackRow {
    role: ProjectileRole;
    attack: SpecialAttack;
    /** The attack before technologies, when the row shows an upgraded one. */
    before: SpecialAttack | undefined;
    volley: VolleyExtra | null;
}

/**
 * Says how often an extra attack is made.
 *
 * A charged attack is told by how long it takes to come back, except when the game refills it at
 * once, which means it goes off with every attack the unit makes. Extra projectiles have no
 * rhythm of their own: they fly with each shot.
 *
 * @param attack - The extra attack.
 * @returns Its cadence, or null for a charge that holds no charge to refill.
 */
export function cadenceOf(attack: SpecialAttack): Cadence | null {
    if (attack.role !== 'charge') return { kind: 'eachShot' };

    const seconds = attack.rechargeTime();
    if (seconds === null) return null;

    return seconds < INSTANT ? { kind: 'eachAttack' } : { kind: 'recharge', seconds };
}

/**
 * Groups the special attacks of a unit into the ones fired on their own.
 *
 * Extra missiles that only fly inside the charged volley, such as the Xianbei Raider's, share the
 * charged attack: they have no cadence of their own, and a reader asks what the volley
 * does, not what each arrow does.
 *
 * @param base - The attacks the unit fires as it stands.
 * @param upgraded - The same attacks with technologies applied, when the reader asked for them.
 * @returns One row per attack that is fired on its own, in the order the unit lists them.
 */
export function attackRows(base: readonly SpecialAttack[], upgraded?: readonly SpecialAttack[]): AttackRow[] {
    const shown = upgraded ?? base;
    const earlier = (attack: SpecialAttack) =>
        upgraded ? base.find((entry) => entry.role === attack.role) : undefined;
    const hasCharge = shown.some((attack) => attack.role === 'charge');
    const inVolley = (attack: SpecialAttack) => hasCharge && attack.role === 'secondary' && (attack.count ?? 0) === 0;
    const extra = shown.find(inVolley);

    return shown
        .filter((attack) => !inVolley(attack))
        .map((attack) => ({
            role: attack.role,
            attack,
            before: earlier(attack),
            volley:
                attack.role === 'charge' && extra
                    ? { attack: extra, before: earlier(extra), most: extra.maxCount ?? extra.count ?? 0 }
                    : null,
        }));
}

/** How many missiles one line of damage stands for. */
export interface MissileCount {
    /** So many with each shot, or as many as a volley may carry at most. */
    kind: 'perShot' | 'upTo';
    amount: number;
}

/** The damage of one attack or missile, with the classes it hits harder or softer. */
export interface Strike {
    attack: AttackProfile;
    /** The same damage before technologies, when the card shows an upgraded one. */
    before: AttackProfile | undefined;
    count: MissileCount | null;
}

/** How often an attack card's attack comes off, the main one's reload included. */
export type CardCadence = Cadence | { kind: 'reload'; seconds: number; before: number | undefined };

/** Everything one attack card shows. */
export interface AttackCard {
    role: ProjectileRole;
    /** The blow or missile the attack is named for. */
    strike: Strike;
    /** The extra missiles that only fly along with this attack, which belong to it rather than stand apart. */
    rider: Strike | null;
    cadence: CardCadence | null;
    /** Zero for a blow that needs no reach, which the card then leaves out. */
    range: number;
    rangeBefore: number | undefined;
    /** Whether the attack cannot reach closer in either, so its range is the far end of a band. */
    hasMinimumRange: boolean;
}

export interface AttackCardsInput {
    /** The unit's stat line, base or upgraded. */
    stats: UnitStats;
    /** The stat line before technologies, when the reader is looking at an upgraded one. */
    compareWith?: UnitStats;
    /** The special attacks the unit fires as it stands. */
    base: readonly SpecialAttack[];
    /** The same attacks with technologies applied, when the reader asked for them. */
    upgraded?: readonly SpecialAttack[];
}

function strikeOf(row: AttackRow): Strike {
    const perShot = row.attack.count ?? 0;

    return {
        attack: row.attack.attack,
        before: row.before?.attack,
        count: row.role === 'secondary' && perShot > 0 ? { kind: 'perShot', amount: perShot } : null,
    };
}

function riderOf({ volley }: AttackRow): Strike | null {
    if (!volley) return null;

    return { attack: volley.attack.attack, before: volley.before?.attack, count: { kind: 'upTo', amount: volley.most } };
}

/**
 * Lays every attack of a unit out as cards of one shape: the main attack first, then each charged
 * attack and any extra projectiles left without a shot to fly with.
 *
 * Giving the main attack the same card as the others is what lets a reader compare them at a
 * glance; a unit that cannot attack gets no main card. Extra missiles ride on the card of the shot
 * they leave with: the ones every shot carries on the main attack, the ones only a charged volley
 * carries on the charged attack, so each card is one shot.
 *
 * @param input - The stat line and special attacks to lay out, base or upgraded.
 * @returns The cards, in the order they are shown.
 */
export function attackCards({ stats, compareWith, base, upgraded }: AttackCardsInput): AttackCard[] {
    const rows = attackRows(base, upgraded);
    const hasMain = stats.attack.displayValue > 0;
    // The file fires a unit's missiles per shot: the first with the shooter's own attack, the rest as its secondary missile.
    const everyShot = hasMain ? rows.find((row) => row.role === 'secondary' && (row.attack.count ?? 0) > 0) : undefined;
    const main: AttackCard[] = hasMain
        ? [
              {
                  role: 'main',
                  strike: { attack: stats.attack, before: compareWith?.attack, count: null },
                  rider: everyShot ? strikeOf(everyShot) : null,
                  cadence:
                      stats.reloadTime > 0
                          ? { kind: 'reload', seconds: stats.reloadTime, before: compareWith?.reloadTime }
                          : null,
                  range: stats.range,
                  rangeBefore: compareWith?.range,
                  hasMinimumRange: stats.minRange > 0,
              },
          ]
        : [];

    return [
        ...main,
        ...rows
            .filter((row) => row !== everyShot)
            .map((row) => ({
                role: row.role,
                strike: strikeOf(row),
                rider: riderOf(row),
                cadence: cadenceOf(row.attack),
                range: row.attack.range,
                rangeBefore: row.before?.range,
                hasMinimumRange: false,
            })),
    ];
}
