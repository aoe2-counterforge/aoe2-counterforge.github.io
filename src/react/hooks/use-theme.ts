import { useEffect } from 'react';
import type { ThemeChoice } from '../providers/preferences-context.ts';
import { usePreferences } from './use-preferences.ts';

export interface Theme {
    choice: ThemeChoice;
    set: (choice: ThemeChoice) => void;
}

/**
 * Applies the stored theme to the document.
 *
 * The document always names the theme it wears, light or dark: following the system means
 * writing down whichever it asks for and keeping up when that changes.
 *
 * @returns The current choice and a way to change it.
 */
export function useTheme(): Theme {
    const { preferences, update } = usePreferences();
    const choice = preferences.theme;

    useEffect(() => {
        const root = document.documentElement;
        if (choice !== 'system') {
            root.dataset.theme = choice;

            return;
        }

        const system = matchMedia('(prefers-color-scheme: dark)');
        const follow = () => {
            root.dataset.theme = system.matches ? 'dark' : 'light';
        };
        follow();
        system.addEventListener('change', follow);

        return () => {
            system.removeEventListener('change', follow);
        };
    }, [choice]);

    return {
        choice,
        set: (next) => {
            update({ theme: next });
        },
    };
}
