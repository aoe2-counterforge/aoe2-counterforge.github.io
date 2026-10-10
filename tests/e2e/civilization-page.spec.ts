import { expect, test } from '@playwright/test';
import { box, right } from './layout.ts';

test.describe('the roster of a civilization', () => {
    test('shows the units as upgrade lines when asked, and remembers it in the address', async ({ page }) => {
        await page.goto('en/civ/aztecs');

        await page.getByRole('group', { name: 'Roster view' }).getByRole('button', { name: 'Lines' }).click();

        await expect(page).toHaveURL(/roster=lines/);
        const chain = page.locator('.chain').filter({ hasText: 'Militia' });
        await expect(chain.getByRole('link')).toHaveText(['Militia', 'Man-at-Arms', 'Long Swordsman', 'Two-Handed Swordsman', 'Champion']);
    });

    test('keeps a line the civilization never finishes, with the missing step faded', async ({ page }) => {
        await page.goto('en/civ/aztecs?roster=lines');

        const halberdier = page.getByRole('link', { name: /^Halberdier/ });

        await expect(halberdier).toHaveAttribute('data-missing', 'true');
        await expect(halberdier).toHaveAccessibleName(/Aztecs cannot train this unit/);
    });

    test('keeps every line inside the screen on a phone', async ({ page, isMobile }) => {
        test.skip(!isMobile, 'The phone layout only.');
        await page.goto('en/civ/aztecs?roster=lines');

        const viewport = page.viewportSize();
        const chains = page.locator('.chain');
        const count = await chains.count();
        for (let index = 0; index < count; index += 1) {
            const chain = await box(chains.nth(index));
            expect(right(chain)).toBeLessThanOrEqual(viewport?.width ?? 0);
        }
        const width = await page.evaluate(() => document.documentElement.scrollWidth);

        expect(count).toBeGreaterThan(0);
        expect(width).toBeLessThanOrEqual(viewport?.width ?? 0);
    });
});
