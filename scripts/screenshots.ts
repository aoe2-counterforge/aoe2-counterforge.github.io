/**
 * Takes the pictures the README shows, from a dev server the script starts for itself.
 *
 * The pictures are the project's shop window, so they are taken the same way every time: the same
 * pages at the same sizes, in the theme each one is meant to show, written over the files the README
 * already points at. Run it after a change to the interface and commit what changed.
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from '@playwright/test';
import { createServer } from 'vite';
import { localBrowser } from './browser/local-browser.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'screenshots');

/** Off the port `npm run dev` uses, so a server already running is left alone. */
const PORT = 4193;

/** How long a picture waits for the images in view before it is taken anyway. */
const SETTLE_LIMIT = 5000;

interface Shot {
    file: string;
    /** The address under the English site, without a leading slash. */
    path: string;
    scheme: 'dark' | 'light';
    viewport: { width: number; height: number };
    /** What to do on the page before the picture, such as opening the search. */
    prepare?: (page: Page) => Promise<void>;
}

const DESKTOP = { width: 1120, height: 777 };

const SHOTS: readonly Shot[] = [
    { file: 'unit-dark.png', path: 'en/unit/knight', scheme: 'dark', viewport: DESKTOP },
    { file: 'counters-light.png', path: 'en/unit/knight?tab=counters', scheme: 'light', viewport: DESKTOP },
    {
        file: 'search-dark.png',
        path: 'en/',
        scheme: 'dark',
        viewport: { ...DESKTOP, height: 686 },
        // One query that lands a unit, a civilization and a technology on the first screen.
        prepare: async (page) => {
            await page.getByRole('button', { name: /Search a unit or civilization/ }).first().click();
            await page.getByRole('searchbox').fill('hun');
        },
    },
    { file: 'technology-dark.png', path: 'en/tech/bloodlines', scheme: 'dark', viewport: { ...DESKTOP, height: 632 } },
    {
        file: 'economy-dark.png',
        path: 'en/unit/archer?tab=economy',
        scheme: 'dark',
        // The calculator ends the page, so scrolling to the end at this height leaves the tab row just
        // under the header and the whole calculator above the floating tab bar.
        viewport: { ...DESKTOP, height: 880 },
        prepare: async (page) => {
            await page.evaluate(() => {
                window.scrollTo(0, document.documentElement.scrollHeight);
            });
        },
    },
];

/**
 * Waits until what the picture depends on has arrived: the display font and the images in view.
 *
 * Images below the fold load lazily and never would, so only the ones on screen are waited for,
 * and no longer than a page could reasonably take.
 *
 * @param page - The page about to be photographed.
 */
async function settle(page: Page): Promise<void> {
    await page.evaluate(async (limit) => {
        await document.fonts.ready;

        const pending = Array.from(document.images)
            .filter((image) => {
                const rect = image.getBoundingClientRect();

                return !image.complete && rect.bottom > 0 && rect.top < window.innerHeight;
            })
            .map(
                (image) =>
                    new Promise<void>((resolve) => {
                        image.addEventListener('load', () => { resolve(); }, { once: true });
                        image.addEventListener('error', () => { resolve(); }, { once: true });
                    }),
            );

        await Promise.race([Promise.all(pending), new Promise((resolve) => setTimeout(resolve, limit))]);
    }, SETTLE_LIMIT);
    // The portraits fade in and the embers need a frame or two to spread across the banner.
    await page.waitForTimeout(400);
}

/**
 * Photographs one page as the README wants it.
 *
 * @param origin - The address the dev server answers at, base path included.
 * @param shot - What to open, how big, and in which theme.
 */
async function take(origin: string, shot: Shot): Promise<void> {
    const context = await browser.newContext({
        viewport: shot.viewport,
        deviceScaleFactor: 1,
        colorScheme: shot.scheme,
    });
    const page = await context.newPage();

    try {
        await page.goto(new URL(shot.path, origin).href);
        await settle(page);
        if (shot.prepare) {
            await shot.prepare(page);
            await settle(page);
        }
        await page.screenshot({ path: join(OUT, shot.file) });
    } finally {
        await context.close();
    }
}

const server = await createServer({
    root: ROOT,
    configFile: join(ROOT, 'vite.config.ts'),
    logLevel: 'silent',
    server: { port: PORT, strictPort: true, host: 'localhost' },
});
await server.listen();

const origin = server.resolvedUrls?.local[0];
if (!origin) throw new Error('The dev server did not say where it listens.');

const browser = await chromium.launch(localBrowser());
mkdirSync(OUT, { recursive: true });

try {
    for (const shot of SHOTS) await take(origin, shot);
} finally {
    await browser.close();
    await server.close();
}

process.stdout.write(`screenshots: ${String(SHOTS.length)} pictures in ${OUT}\n`);
