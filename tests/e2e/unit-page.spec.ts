import { expect, test } from '@playwright/test';
import { bottom, box, overlaps, right } from './layout.ts';

test.describe('the banner of a unit', () => {
    test('keeps the name clear of the age shield', async ({ page }) => {
        await page.goto('en/unit/halberdier');

        const name = await box(page.getByRole('heading', { level: 1, name: 'Halberdier' }));
        const shield = await box(page.locator('.forge__shield'));

        expect(overlaps(name, shield)).toBe(false);
    });

    test('lays the upgrade line out under the portrait on a phone', async ({ page, isMobile }) => {
        test.skip(!isMobile, 'The phone layout only.');
        await page.goto('en/unit/halberdier');

        const portrait = await box(page.locator('.slot'));
        const line = await box(page.locator('.forge__line'));
        const badges = await box(page.locator('.forge__meta'));

        expect(line.x).toBeLessThanOrEqual(portrait.x + 1);
        expect(line.y).toBeGreaterThanOrEqual(bottom(portrait) - 1);
        expect(badges.y).toBeGreaterThanOrEqual(bottom(line));
    });

    test('keeps a long upgrade line on one row on a phone', async ({ page, isMobile }) => {
        test.skip(!isMobile, 'The phone layout only.');
        await page.goto('en/unit/champion');

        const line = await box(page.locator('.forge__line'));
        const steps = page.locator('.forge__step');

        expect(line.height).toBeLessThan(56);
        await expect(steps).toHaveCount(6);
        await expect(page.locator('.forge__step[data-here]')).toBeInViewport();
    });

    test('keeps the upgrade line beside the portrait on a desktop', async ({ page, isMobile }) => {
        test.skip(isMobile, 'The wide layout only.');
        await page.goto('en/unit/halberdier');

        const portrait = await box(page.locator('.slot'));
        const line = await box(page.locator('.forge__line'));
        const shield = await box(page.locator('.forge__shield'));
        const banner = await box(page.locator('.forge'));

        expect(line.x).toBeGreaterThan(right(portrait));
        expect(right(shield)).toBeGreaterThan(right(banner) - 32);
    });

    test('follows the upgrade line to the next unit', async ({ page }) => {
        await page.goto('en/unit/pikeman');

        await page.locator('.forge__line').getByRole('link', { name: 'Halberdier' }).click();

        await expect(page.getByRole('heading', { level: 1, name: 'Halberdier' })).toBeVisible();
    });
});

test.describe('the attack cards of a unit', () => {
    test('keeps the longest badge, name and damage type whole, inside its card', async ({ page }) => {
        await page.goto('es/unit/mangonel');

        const card = page.getByRole('listitem', { name: 'Ataque principal' });
        const edge = await box(card);
        const type = await box(card.locator('.attack-badge__type'));
        const name = card.locator('.attack-badge__name');

        expect(right(type)).toBeLessThanOrEqual(right(edge));
        expect(await name.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    });

    test('hangs the missiles of a charged volley inside the charged card', async ({ page }) => {
        await page.goto('en/unit/xianbei-raider');

        const charged = await box(page.getByRole('listitem', { name: 'Charged attack' }));
        const rider = await box(page.locator('.attack-rider'));

        await expect(page.getByRole('listitem', { name: 'Extra projectiles' })).toHaveCount(0);
        expect([rider.y > charged.y, bottom(rider) <= bottom(charged)]).toEqual([true, true]);
    });
});
