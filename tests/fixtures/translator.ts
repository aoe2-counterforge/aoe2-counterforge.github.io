import type { TFunction } from 'i18next';
import english from '../../src/i18n/locales/en.json' with { type: 'json' };

type Bundle = Record<string, unknown>;

/** Values i18next is asked to interpolate are always printable. */
type Values = Record<string, string | number>;

/**
 * A translator backed by the shipped English strings.
 *
 * Asserting on the words a reader actually sees is the point: a stub that echoes keys would pass
 * while the sentence around the number is wrong.
 *
 * @returns A function with the shape components expect from i18next.
 */
export function translator(): TFunction {
    const translate = (key: string, values: Values = {}): string => {
        const find = (path: string): unknown =>
            path.split('.').reduce<unknown>((node, part) => (node as Bundle | undefined)?.[part], english);
        // A count picks the singular or plural form the way i18next does for English.
        const plural = typeof values.count === 'number' ? (values.count === 1 ? '_one' : '_other') : '';
        const template = find(`${key}${plural}`) ?? find(key);
        if (typeof template !== 'string') return key;

        return template.replaceAll(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name] ?? ''));
    };

    return translate as unknown as TFunction;
}
