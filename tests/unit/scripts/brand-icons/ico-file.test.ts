import { describe, expect, it } from 'vitest';
import { icoFile } from '../../../../scripts/brand-icons/ico-file.ts';

const SMALL = Buffer.from('small-png');
const LARGE = Buffer.from('a-larger-png');

describe('icoFile', () => {
    it('counts the images in the header', () => {
        const ico = icoFile([{ size: 16, png: SMALL }, { size: 32, png: LARGE }]);

        expect(ico.readUInt16LE(0)).toBe(0);
        expect(ico.readUInt16LE(2)).toBe(1);
        expect(ico.readUInt16LE(4)).toBe(2);
    });

    it('points each entry at its own image after the directory', () => {
        const ico = icoFile([{ size: 16, png: SMALL }, { size: 32, png: LARGE }]);

        expect(ico[6]).toBe(16);
        expect(ico.readUInt32LE(6 + 8)).toBe(SMALL.length);
        expect(ico.subarray(ico.readUInt32LE(6 + 12), ico.readUInt32LE(6 + 12) + SMALL.length)).toEqual(SMALL);
        expect(ico[22]).toBe(32);
        expect(ico.subarray(ico.readUInt32LE(22 + 12))).toEqual(LARGE);
    });

    it('writes a 256 pixel edge as zero', () => {
        const ico = icoFile([{ size: 256, png: SMALL }]);

        expect(ico[6]).toBe(0);
        expect(ico[7]).toBe(0);
    });

    it('refuses an image the format cannot describe', () => {
        const pack = (): Buffer => icoFile([{ size: 512, png: SMALL }]);

        expect(pack).toThrow('at most 256 pixels');
    });
});
