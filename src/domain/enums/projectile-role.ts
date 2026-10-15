/**
 * Which of a unit's missiles something is about.
 *
 * The main shot hits with the unit's own attack; secondary missiles fly with it and a charged
 * attack fires its own, each with damage of its own.
 */
export const PROJECTILE_ROLES = ['main', 'secondary', 'charge'] as const;

export type ProjectileRole = (typeof PROJECTILE_ROLES)[number];

/** The roles a special attack can have; the main shot is the unit's own stat line. */
export const SPECIAL_ROLES: readonly ProjectileRole[] = ['secondary', 'charge'];

const KNOWN = new Set<string>(PROJECTILE_ROLES);

/**
 * Narrows an arbitrary string to a known projectile role.
 *
 * @param value - Raw role identifier coming from the generated dataset.
 * @returns True when the value is one of the three roles.
 */
export function isProjectileRole(value: string): value is ProjectileRole {
    return KNOWN.has(value);
}
