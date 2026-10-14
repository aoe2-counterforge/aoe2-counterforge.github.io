/** The language numbers are written in, which is the one the page is shown in. */
let active: string | undefined;

/**
 * Records the language the interface is in so that numbers follow it.
 *
 * Without it a number takes the machine's own habits: an English page built on a Portuguese
 * computer would print 3,9 where the words around it expect 3.9.
 *
 * @param locale - Language tag of the page being shown.
 */
export function setNumberLocale(locale: string): void {
    active = locale;
}

/** The language tag numbers are written in, or undefined before the interface has one. */
export function numberLocale(): string | undefined {
    return active;
}
