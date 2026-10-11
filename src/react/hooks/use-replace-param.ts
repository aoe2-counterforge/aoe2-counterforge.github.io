import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * A setter for one query parameter that leaves the rest of the address alone.
 *
 * The change replaces the history entry rather than adding one, so the back button still leaves
 * the page instead of undoing a filter.
 *
 * @returns A function that sets the named parameter, or removes it when handed null.
 */
export function useReplaceParam(): (name: string, value: string | null) => void {
    const [params, setParams] = useSearchParams();

    return useCallback(
        (name: string, value: string | null) => {
            const next = new URLSearchParams(params);
            if (value === null) next.delete(name);
            else next.set(name, value);
            setParams(next, { replace: true });
        },
        [params, setParams],
    );
}
