import { expect, test, type Locator } from '@playwright/test';
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
    test('keeps the longest attack name whole and its damage seal inside its card', async ({ page }) => {
        await page.goto('es/unit/mangonel');

        const card = page.getByRole('listitem', { name: 'Ataque principal' });
        const edge = await box(card);
        const seal = await box(card.locator('.attack-card__emblem'));
        const name = card.locator('.attack-badge__name');

        expect(right(seal)).toBeLessThanOrEqual(right(edge));
        expect(await name.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    });

    test('runs the body on right under the band, the damage seal hanging over it clear of the targets', async ({ page }) => {
        await page.goto('en/unit/lou-chuan');

        const card = page.getByRole('listitem', { name: 'Main attack' });
        const band = await box(card.locator('.attack-badge'));
        const seal = await box(card.locator('.attack-card__emblem'));
        const targets = await box(card.locator('.attack-targets'));
        const buildings = await box(card.locator('.target-seal__disc').last());

        expect([Math.abs(targets.y - bottom(band)) < 1, bottom(seal) > targets.y, overlaps(seal, buildings)]).toEqual([
            true,
            true,
            false,
        ]);
    });

    test('hangs the missiles of a charged volley inside the charged card', async ({ page }) => {
        await page.goto('en/unit/xianbei-raider');

        const charged = await box(page.getByRole('listitem', { name: 'Charged attack' }));
        const rider = await box(page.locator('.attack-rider'));

        await expect(page.getByRole('listitem', { name: 'Extra projectiles' })).toHaveCount(0);
        expect([rider.y > charged.y, bottom(rider) <= bottom(charged)]).toEqual([true, true]);
    });

    test('keeps the maximum range label on one line on the narrowest phone', async ({ page, isMobile }) => {
        test.skip(!isMobile, 'The phone layout only.');
        await page.setViewportSize({ width: 360, height: 800 });
        await page.goto('pt-br/unit/mangonel');

        const label = page.locator('.attack-fact[data-stat="range"] .stat__name');
        const lines = await label.evaluate((element) => {
            const range = document.createRange();
            range.selectNodeContents(element);

            return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
        });

        await expect(label).toHaveText('Alcance máx.');
        expect(lines).toBe(1);
    });

    test('counts the extra projectiles of every shot beside their damage inside the main card', async ({ page }) => {
        await page.goto('pt-br/unit/chu-ko-nu');

        const rider = page.getByRole('listitem', { name: 'Ataque principal' }).locator('.attack-rider');
        const damage = await box(rider.locator('.attack-fact[data-stat="damage"]'));
        const count = await box(rider.locator('.attack-fact[data-stat="count"]'));

        await expect(page.getByRole('listitem', { name: 'Projéteis extras' })).toHaveCount(0);
        expect([count.y < bottom(damage), count.x >= right(damage)]).toEqual([true, true]);
    });

    test('splits the Lou Chuan between its trebuchet shot and its arrows, each naming its targets', async ({ page }) => {
        await page.goto('en/unit/lou-chuan');

        const main = page.getByRole('listitem', { name: 'Main attack' });
        const charged = page.getByRole('listitem', { name: 'Charged attack' });

        const lit = (card: Locator) =>
            card.locator('.target-seal[data-hit="true"]').evaluateAll((seals) => seals.map((seal) => seal.getAttribute('title')));

        await expect(main.getByRole('group', { name: 'Targets' })).toBeVisible();
        expect(await lit(main)).toEqual(['Siege weapons', 'Buildings']);
        await expect(main.locator('.attack-fact[data-stat="range"] .stat__value')).toHaveText('13');
        expect(await lit(charged)).toEqual(['Land units', 'Ships']);
        await expect(charged.locator('.attack-fact[data-stat="count"] .visually-hidden')).toHaveText('10 missiles per shot');
        await expect(charged.locator('.attack-fact[data-stat="range"] .stat__value')).toHaveText('10');
    });

    test('keeps the four target seals and their longest caption on one line inside the card on the narrowest phone', async ({
        page,
        isMobile,
    }) => {
        test.skip(!isMobile, 'The phone layout only.');
        await page.setViewportSize({ width: 360, height: 800 });
        await page.goto('de/unit/lou-chuan');

        const card = page.getByRole('listitem', { name: 'Hauptangriff' });
        const edge = await box(card);
        const row = await box(card.getByRole('group', { name: 'Ziele' }));
        const names = card.locator('.target-seal__name');
        const lines = await names.evaluateAll((elements) =>
            elements.map((element) => {
                const range = document.createRange();
                range.selectNodeContents(element);

                return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
            }),
        );

        expect(right(row)).toBeLessThanOrEqual(right(edge));
        expect(lines).toEqual([1, 1, 1, 1]);
    });

    test('keeps the longest ability name whole inside its card on the narrowest phone',async ({ page, isMobile }) => {
        test.skip(!isMobile, 'The phone layout only.');
        await page.setViewportSize({ width: 360, height: 800 });
        await page.goto('de/unit/coustillier');

        const card = page.getByRole('listitem', { name: 'Aufgeladener Hieb' });
        const edge = await box(card);
        const note = await box(card.locator('.attack-note'));
        const name = card.locator('.attack-badge__name');

        expect(right(note)).toBeLessThanOrEqual(right(edge));
        expect(await name.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    });

    test('starts the figures of every card on the same line on a phone', async ({ page, isMobile }) => {
        test.skip(!isMobile, 'The phone layout only.');
        await page.goto('es/unit/hearth-troop');

        const reload = await box(page.locator('.attack-fact[data-stat="reload"]'));
        const recharge = await box(page.locator('.attack-fact[data-stat="recharge"]'));

        expect(Math.abs(reload.x - recharge.x)).toBeLessThan(1);
    });
});
