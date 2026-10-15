/**
 * Renders the square icons browsers and search engines ask for from the brand shield.
 *
 * The shield is taller than wide and search results only take a square raster icon, so every size
 * centres it on a square canvas. Run after changing public/brand.svg; the output is committed.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { icoFile } from './brand-icons/ico-file.ts';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SHIELD = readFileSync(join(PUBLIC, 'brand.svg'), 'utf8');

const FAVICON_SIZES = [16, 32, 48];
const PAGE_ICON_SIZE = 192;
const TOUCH_ICON_SIZE = 180;

/** Home screens fill a transparent icon with black, so the touch icon carries its own forge glow. */
const TOUCH_BACKDROP = `<defs><radialGradient id="glow" cx="0.5" cy="0.55" r="0.65">
<stop offset="0" stop-color="#3a2410"/><stop offset="0.6" stop-color="#1a130c"/><stop offset="1" stop-color="#0e0b08"/>
</radialGradient></defs><rect width="100%" height="100%" fill="url(#glow)"/>`;
const TOUCH_SHIELD_SHARE = 0.7;

function shieldAspect(): number {
    const viewBox = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(SHIELD);
    if (!viewBox) throw new Error('The brand shield has lost its viewBox.');

    return Number(viewBox[1]) / Number(viewBox[2]);
}

async function squareIcon(size: number, shieldShare = 1, backdrop = ''): Promise<Buffer> {
    const height = size * shieldShare;
    const width = height * shieldAspect();
    const placed = SHIELD.replace(
        '<svg ',
        `<svg x="${String((size - width) / 2)}" y="${String((size - height) / 2)}" width="${String(width)}" height="${String(height)}" `,
    );
    const canvas = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(size)}" height="${String(size)}">${backdrop}${placed}</svg>`;

    return sharp(Buffer.from(canvas)).png().toBuffer();
}

const favicons = await Promise.all(FAVICON_SIZES.map(async (size) => ({ size, png: await squareIcon(size) })));
writeFileSync(join(PUBLIC, 'favicon.ico'), icoFile(favicons));
writeFileSync(join(PUBLIC, `icon-${String(PAGE_ICON_SIZE)}.png`), await squareIcon(PAGE_ICON_SIZE));
writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), await squareIcon(TOUCH_ICON_SIZE, TOUCH_SHIELD_SHARE, TOUCH_BACKDROP));

process.stdout.write('brand-icons: favicon.ico, icon-192.png and apple-touch-icon.png written to public/\n');
