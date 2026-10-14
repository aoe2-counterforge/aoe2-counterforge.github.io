import { afterEach, describe, expect, it } from 'vitest';
import { setNumberLocale } from '../../../src/i18n/number-locale.ts';
import { precise, short } from '../../../src/react/format.ts';

describe('number locale', () => {
    afterEach(() => {
        setNumberLocale('en');
    });

    it('writes numbers the way the interface language does', () => {
        setNumberLocale('de');

        const written = [short(3.92), precise(0.5)];

        expect(written).toEqual(['3,9', '0,5']);
    });

    it('keeps the decimal point on an English page whatever the machine prefers', () => {
        setNumberLocale('en');

        const written = [short(3.92), precise(0.5)];

        expect(written).toEqual(['3.9', '0.5']);
    });
});
