import { startTransition, useCallback, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { UNSAFE_NavigationContext, useLocation } from 'react-router';
import type { SupportedLocale } from '../../i18n/index.ts';
import { localizedPath } from '../../i18n/locale-path.ts';
import { rememberLocale } from '../../i18n/locale-preference.ts';
import { RouterLocaleContext } from '../providers/router-locale-context.ts';

/**
 * Moves the reader to the same page in another language without loading it again.
 *
 * Every string of every language ships in the bundle, so only the address has to change: the page,
 * its scroll and whatever is open on it stay as they are.
 *
 * @returns A function that switches the interface, and the address, to the given language.
 */
export function useSwitchLocale(): (locale: SupportedLocale) => void {
    const { i18n } = useTranslation();
    // The router's own history, because a navigation through the router is always kept inside the
    // language folder it mounts in, and this one has to leave it.
    const { navigator } = useContext(UNSAFE_NavigationContext);
    const { pathname, search, hash } = useLocation();
    const moveRouter = useContext(RouterLocaleContext);

    return useCallback(
        (locale: SupportedLocale) => {
            rememberLocale(locale);

            // The address and the folder the router mounts in change in the same render, so no frame
            // shows an address the routes cannot read.
            startTransition(() => {
                moveRouter(locale);
                navigator.replace(localizedPath(`${pathname}${search}${hash}`, locale));
                void i18n.changeLanguage(locale);
            });
        },
        [i18n, navigator, pathname, search, hash, moveRouter],
    );
}
