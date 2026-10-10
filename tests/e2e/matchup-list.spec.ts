import { expect, test, type Page } from '@playwright/test';

/**
 * How many of the rows the list has mounted start before the row above them ends.
 *
 * @param page - A unit page with its matchup list on screen.
 * @returns The number of overlapping neighbours among the mounted rows.
 */
async function overlappingRows(page: Page): Promise<number> {
    return page.locator('.virtual__row').evaluateAll((rows) => {
        const boxes = rows.map((row) => row.getBoundingClientRect()).sort((one, other) => one.top - other.top);

        return boxes.slice(1).filter((current, index) => current.top < boxes[index].bottom - 0.5).length;
    });
}

/**
 * Lets the list measure what it just mounted before it is inspected.
 *
 * @param page - The page holding the list.
 */
async function settle(page: Page): Promise<void> {
    await page.evaluate(
        () => new Promise<void>((resolve) => {
            requestAnimationFrame(() => { requestAnimationFrame(() => { resolve(); }); });
        }),
    );
}

test.describe('the matchup list of a unit', () => {
    test('keeps every row clear of the next after switching sides', async ({ page }) => {
        await page.goto('en/unit/archer?tab=counters');
        const sides = page.getByRole('group', { name: 'Which matchups to show' });
        const scroller = page.locator('.virtual');

        for (const side of ['All', 'Weak', 'Strong', 'All', 'Weak']) {
            await sides.getByRole('button', { name: new RegExp(`^${side}`) }).click();
            await settle(page);

            expect(await overlappingRows(page), `rows on the ${side} side`).toBe(0);

            await scroller.evaluate((element) => { element.scrollTop = element.scrollHeight / 2; });
            await settle(page);

            expect(await overlappingRows(page), `rows halfway down the ${side} side`).toBe(0);

            await scroller.evaluate((element) => { element.scrollTop = 0; });
        }
    });
});
