import type { Locator } from '@playwright/test';

export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Where an element is drawn, as a box that is guaranteed to exist.
 *
 * @param locator - The element to measure; it has to be on screen.
 * @returns Its position and size in page pixels.
 */
export async function box(locator: Locator): Promise<Box> {
    const found = await locator.boundingBox();
    if (!found) throw new Error(`${String(locator)} is not drawn on the page`);

    return found;
}

/**
 * Whether two boxes share any pixel.
 *
 * @param one - A box.
 * @param other - Another box.
 * @returns True when they overlap, even by a sliver.
 */
export function overlaps(one: Box, other: Box): boolean {
    return (
        one.x < other.x + other.width &&
        other.x < one.x + one.width &&
        one.y < other.y + other.height &&
        other.y < one.y + one.height
    );
}

/** The right edge of a box. */
export function right(target: Box): number {
    return target.x + target.width;
}

/** The bottom edge of a box. */
export function bottom(target: Box): number {
    return target.y + target.height;
}
