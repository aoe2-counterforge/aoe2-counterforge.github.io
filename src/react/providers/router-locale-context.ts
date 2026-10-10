import { createContext } from 'react';
import type { SupportedLocale } from '../../i18n/index.ts';

/**
 * Moves the router to the folder of another language.
 *
 * The application root owns the folder the router mounts in; a page written ahead of time never
 * switches language, so outside a live root this does nothing.
 */
export const RouterLocaleContext = createContext<(locale: SupportedLocale) => void>(() => undefined);
