/**
 * Which installed browser Playwright drives on this machine.
 *
 * The end-to-end suite and the README pictures have to agree on it, so both ask here. Windows
 * ships Edge, the same engine Playwright would download, so nothing has to be fetched there, and
 * an application control policy may refuse a downloaded build anyway. Everywhere else, and in CI,
 * the Chromium `npx playwright install chromium` leaves behind is used.
 *
 * Two settings override that, read from the environment or from `.env`: PLAYWRIGHT_BROWSER is the
 * executable of any Chromium-based browser, such as Brave, and PLAYWRIGHT_CHANNEL names one that
 * Playwright can find on its own, such as `chrome` or `msedge`.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface LocalBrowser {
    /** A browser Playwright locates by name. */
    channel?: string;
    /** The executable of a browser Playwright is pointed at. */
    executablePath?: string;
}

const ENV_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env');

/** The machine's choices live in .env; the guard keeps a missing file from being an error. */
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

/**
 * Chooses the browser to launch, from the environment first and from the platform otherwise.
 *
 * @returns An executable, a channel, or neither when Playwright's own Chromium is the one to run.
 */
export function localBrowser(): LocalBrowser {
    const executablePath = process.env.PLAYWRIGHT_BROWSER;
    if (executablePath) {
        if (!existsSync(executablePath)) {
            throw new Error(`PLAYWRIGHT_BROWSER points at ${executablePath}, and there is no such file.`);
        }

        return { executablePath };
    }

    const channel =
        process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === 'win32' && !process.env.CI ? 'msedge' : undefined);

    return channel === undefined ? {} : { channel };
}
