import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import { localBrowser } from './scripts/browser/local-browser.ts';

/**
 * The dev server the suite drives.
 *
 * It stays off 5173 so a running `npm run dev` is left alone, and off 4173 because a `vite preview`
 * of an old build answers there and would be reused in its place.
 */
const PORT = 5273;

/**
 * The folder the site is served from, read from the same place the build reads it.
 *
 * Every address in a test is written relative to it, without a leading slash: `page.goto('en/')`,
 * because a leading slash would throw the base path away.
 */
const BASE_PATH = new URL((JSON.parse(readFileSync('package.json', 'utf8')) as { homepage: string }).homepage)
    .pathname;

const ORIGIN = `http://localhost:${String(PORT)}`;

/** The browser this machine runs the suite in; see the resolver for how it is chosen. */
const browser = localBrowser();

export default defineConfig({
    testDir: 'tests/e2e',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `${ORIGIN}${BASE_PATH}`,
        channel: browser.channel,
        launchOptions: { executablePath: browser.executablePath },
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    // The guide promises a phone layout first, so every test runs on a phone and on a desktop.
    projects: [
        { name: 'phone', use: { ...devices['Pixel 7'] } },
        { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
        command: `npm run dev -- --port ${String(PORT)} --strictPort`,
        url: `${ORIGIN}${BASE_PATH}en/`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
    },
});
