import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useReplaceParam } from './use-replace-param.ts';

/**
 * One query parameter held to a fixed set of values, the first of them its default.
 *
 * An address only says anything for the other values: choosing the default removes the
 * parameter, so the plain address and the default stay one and the same link.
 *
 * @param name - Parameter name in the address.
 * @param values - The accepted values, the first standing in when the address names none of them.
 * @returns The current value and a setter for it.
 */
export function useSearchParam<T extends string>(name: string, values: readonly T[]): [T, (next: T) => void] {
    const [params] = useSearchParams();
    const replace = useReplaceParam();
    const fallback = values[0];
    const asked = params.get(name);
    const value = values.find((candidate) => candidate === asked) ?? fallback;

    const set = useCallback(
        (next: T) => {
            replace(name, next === fallback ? null : next);
        },
        [replace, name, fallback],
    );

    return [value, set];
}
