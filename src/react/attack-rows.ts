import type { ProjectileRole } from '../domain/enums/projectile-role.ts';
import type { SpecialAttack } from '../domain/values/special-attack.ts';

/** A charge that refills in less than this reads as ready again at once. */
const INSTANT = 0.05;

/** How often an extra attack comes off, in the words the reader sees. */
export type Cadence =
    | { kind: 'recharge'; seconds: number }
    | { kind: 'eachAttack' }
    | { kind: 'eachShot' };

/** The extra missiles a charged volley adds to its main one, shown in the same row. */
export interface VolleyExtra {
    attack: SpecialAttack;
    /** The same missiles before technologies, which is what an upgraded one is compared with. */
    before: SpecialAttack | undefined;
    /** The most of them that fly in one volley. */
    most: number;
}

/** One row of the extra attacks table. */
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
 * Lays the special attacks of a unit out as table rows.
 *
 * Extra missiles that only fly inside the charged volley, such as the Xianbei Raider's, share the
 * charged attack's row: they have no cadence of their own, and a reader asks what the volley
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
