import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, StaticRouter } from 'react-router';
import { correctedPath, routerBasename } from '../i18n/locale-path.ts';
import type { SupportedLocale } from '../i18n/index.ts';
import { AppShell } from './components/app-shell.tsx';
import { ScrollToTop } from './components/scroll-to-top.tsx';
import { CivilizationPage } from './pages/civilization-page.tsx';
import { CivilizationsPage } from './pages/civilizations-page.tsx';
import { ComparePage } from './pages/compare-page.tsx';
import { HomePage } from './pages/home-page.tsx';
import { NotFoundPage } from './pages/not-found-page.tsx';
import { TechnologiesPage } from './pages/technologies-page.tsx';
import { TechnologyPage } from './pages/technology-page.tsx';
import { UnitPage } from './pages/unit-page.tsx';
import { UnitsPage } from './pages/units-page.tsx';
import { CommandPaletteProvider } from './providers/command-palette-provider.tsx';
import { PreferencesProvider } from './providers/preferences-provider.tsx';
import { RouterLocaleContext } from './providers/router-locale-context.ts';
import { ServicesProvider } from './providers/services-provider.tsx';

export interface AppProps {
    /** Language the page opens in, which decides the folder every route sits under until the reader picks another. */
    locale: SupportedLocale;
    /** Address to render outside a browser, for a page written ahead of time; a live page follows the address bar. */
    location?: string;
}

/** Application root: providers first, then the routed shell. */
export function App({ locale: opening, location }: AppProps) {
    const [locale, setLocale] = useState(opening);
    const basename = routerBasename(locale);

    useEffect(() => {
        if (location !== undefined) return undefined;

        // A step back can land on a page still addressed in the language the reader has since left.
        // It is moved to the current one, the way such an address is on arrival. The router may
        // already have read the old address on this same event, so it is told to read it again; the
        // listener lives here, above the router, because the router unmounts whatever it holds the
        // moment it reads an address outside its folder.
        const onPop = () => {
            const corrected = correctedPath(window.location, locale);
            if (!corrected) return;

            const state: unknown = window.history.state;
            window.history.replaceState(state, '', corrected);
            window.dispatchEvent(new PopStateEvent('popstate', { state }));
        };

        window.addEventListener('popstate', onPop);

        return () => {
            window.removeEventListener('popstate', onPop);
        };
    }, [locale, location]);

    const routes = (
        <>
            <ScrollToTop />
            <Routes>
                <Route element={<AppShell />}>
                    <Route index element={<HomePage />} />
                    <Route path="units" element={<UnitsPage />} />
                    <Route path="compare" element={<ComparePage />} />
                    <Route path="unit/:key" element={<UnitPage />} />
                    <Route path="civs" element={<CivilizationsPage />} />
                    <Route path="civ/:key" element={<CivilizationPage />} />
                    <Route path="techs" element={<TechnologiesPage />} />
                    <Route path="tech/:key" element={<TechnologyPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </>
    );

    return (
        <ServicesProvider>
            <PreferencesProvider>
                <CommandPaletteProvider>
                    <RouterLocaleContext value={setLocale}>
                        {location === undefined ? (
                            <BrowserRouter basename={basename}>{routes}</BrowserRouter>
                        ) : (
                            <StaticRouter location={location} basename={basename}>
                                {routes}
                            </StaticRouter>
                        )}
                    </RouterLocaleContext>
                </CommandPaletteProvider>
            </PreferencesProvider>
        </ServicesProvider>
    );
}
