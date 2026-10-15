/** A square PNG and the edge it was drawn at. */
export interface IcoImage {
    size: number;
    png: Buffer;
}

const HEADER_BYTES = 6;
const ENTRY_BYTES = 16;
const ICON_TYPE = 1;
const COLOUR_PLANES = 1;
const BITS_PER_PIXEL = 32;

/** The format stores an edge in one byte, where 0 stands for 256. */
const LARGEST_EDGE = 256;

/**
 * Packs square PNGs into one ICO file.
 *
 * @param images - The sizes to carry, each at most 256 pixels on an edge.
 * @returns The file contents, ready to be written to disk.
 * @throws Error when an image is larger than the format can describe.
 */
export function icoFile(images: readonly IcoImage[]): Buffer {
    const header = Buffer.alloc(HEADER_BYTES);
    header.writeUInt16LE(ICON_TYPE, 2);
    header.writeUInt16LE(images.length, 4);

    let offset = HEADER_BYTES + ENTRY_BYTES * images.length;
    const entries = images.map(({ size, png }) => {
        if (size > LARGEST_EDGE) throw new Error(`An ICO image is at most ${String(LARGEST_EDGE)} pixels, not ${String(size)}.`);

        const entry = Buffer.alloc(ENTRY_BYTES);
        entry.writeUInt8(size % LARGEST_EDGE, 0);
        entry.writeUInt8(size % LARGEST_EDGE, 1);
        entry.writeUInt16LE(COLOUR_PLANES, 4);
        entry.writeUInt16LE(BITS_PER_PIXEL, 6);
        entry.writeUInt32LE(png.length, 8);
        entry.writeUInt32LE(offset, 12);
        offset += png.length;

        return entry;
    });

    return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}
