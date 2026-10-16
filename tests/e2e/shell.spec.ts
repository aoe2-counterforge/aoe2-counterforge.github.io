import { expect, test } from '@playwright/test';
import { box, right } from './layout.ts';

test.describe('the header on a phone', () => {
    test.skip(({ isMobile }) => !isMobile, 'The phone layout only.');

    test('gives the search all the room between the crest and the menu', async ({ page }) => {
        await page.goto('en/');

        const search = await box(page.getByRole('button', { name: /Search a unit or civilization/ }).first());
        const menu = await box(page.getByRole('button', { name: 'Settings' }));
        const viewport = page.viewportSize();

        expect(viewport).not.toBeNull();
        expect(search.width).toBeGreaterThan((viewport?.width ?? 0) / 2);
        expect(menu.x - right(search)).toBeLessThanOrEqual(12);
    });

    test('opens the settings over the whole screen and closes them from the X', async ({ page }) => {
        await page.goto('en/');

        await page.getByRole('button', { name: 'Settings' }).click();
        const sheet = page.getByRole('dialog', { name: 'Settings' });
        await expect(sheet).toBeVisible();
        const panel = await box(sheet);
        const viewport = page.viewportSize();

        expect(Math.round(panel.width)).toBe(viewport?.width);
        expect(Math.round(panel.height)).toBe(viewport?.height);
        await expect(sheet.getByRole('button', { name: 'All civilizations' })).toBeVisible();

        await sheet.getByRole('button', { name: 'Close' }).click();

        await expect(sheet).toBeHidden();
        await expect(page.getByRole('button', { name: 'Settings' })).toBeFocused();
    });

    test('switches the language from the settings without reloading or closing them', async ({ page }) => {
        await page.goto('en/');
        await page.getByRole('button', { name: 'Settings' }).click();
        const sheet = page.getByRole('dialog', { name: 'Settings' });
        // A reload would start from a fresh window, so a mark set now vanishes with it.
        await page.evaluate(() => {
            (window as unknown as { stillHere?: boolean }).stillHere = true;
        });

        await sheet.getByRole('button', { name: 'English' }).click();
        await sheet.getByRole('option', { name: 'Portuguese' }).click();

        await expect(page).toHaveURL(/\/pt-br\/$/);
        await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeVisible();
        expect(await page.evaluate(() => (window as unknown as { stillHere?: boolean }).stillHere)).toBe(true);
    });

    test('opens a civilization list inside the settings without clipping it', async ({ page }) => {
        await page.goto('en/');
        await page.getByRole('button', { name: 'Settings' }).click();
        const sheet = page.getByRole('dialog', { name: 'Settings' });

        await sheet.getByRole('button', { name: 'All civilizations' }).click();

        const listbox = sheet.getByRole('listbox', { name: 'Use this civilization' });
        await expect(listbox).toBeVisible();
        await expect(listbox.getByRole('option', { name: 'Britons' })).toBeInViewport();
    });
});

test.describe('the header on a desktop', () => {
    test.skip(({ isMobile }) => isMobile, 'The wide layout only.');

    test('keeps the three choices in the header and drops the menu button', async ({ page }) => {
        await page.goto('en/');

        await expect(page.getByRole('button', { name: /^Language:/ })).toBeVisible();
        await expect(page.getByRole('button', { name: /^Theme:/ })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Settings' })).toBeHidden();
    });
});

test('finds a unit from the search and lands on its page', async ({ page }) => {
    await page.goto('en/');

    await page.getByRole('button', { name: /Search a unit or civilization/ }).first().click();
    const palette = page.getByRole('dialog', { name: 'Search a unit or civilization' });
    await palette.getByRole('searchbox').fill('halb');
    // Scoped to the dialog: the home page behind it lists a Halberdier of its own.
    await palette.getByRole('link', { name: /^Halberdier/ }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Halberdier' })).toBeVisible();
    await expect(page).toHaveURL(/\/en\/unit\/halberdier$/);
});

test('opens a search result in a new tab on Ctrl+click and keeps the search open', async ({ page, context }) => {
    await page.goto('en/');
    await page.getByRole('button', { name: /Search a unit or civilization/ }).first().click();
    const palette = page.getByRole('dialog', { name: 'Search a unit or civilization' });
    await palette.getByRole('searchbox').fill('halb');

    const [tab] = await Promise.all([
        context.waitForEvent('page'),
        palette.getByRole('link', { name: /^Halberdier/ }).click({ modifiers: ['ControlOrMeta'] }),
    ]);

    await expect(tab).toHaveURL(/\/en\/unit\/halberdier$/);
    await expect(palette).toBeVisible();
});

test('opens the highlighted search result in a new tab on Ctrl+Enter and keeps the search open', async ({
    page,
    context,
}) => {
    await page.goto('en/');
    await page.getByRole('button', { name: /Search a unit or civilization/ }).first().click();
    const palette = page.getByRole('dialog', { name: 'Search a unit or civilization' });
    const search = palette.getByRole('searchbox');
    await search.fill('halb');
    await expect(palette.getByRole('link').first()).toHaveAccessibleName(/^Halberdier/);

    const [tab] = await Promise.all([context.waitForEvent('page'), search.press('ControlOrMeta+Enter')]);

    await expect(tab).toHaveURL(/\/en\/unit\/halberdier$/);
    await expect(palette).toBeVisible();
});

test('closes the search from its X', async ({ page }) => {
    await page.goto('en/');
    await page.getByRole('button', { name: /Search a unit or civilization/ }).first().click();
    const palette = page.getByRole('dialog', { name: 'Search a unit or civilization' });
    await expect(palette).toBeVisible();

    await palette.getByRole('button', { name: 'Close' }).click();

    await expect(palette).toBeHidden();
});
