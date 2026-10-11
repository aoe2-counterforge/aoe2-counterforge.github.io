const COMBINING_MARKS = /[\u0300-\u036f]/g;
const MARKUP = /<[^>]*>/g;
const BULLET = /^[•·-]\s*/;

/**
 * A sentence ends at a period followed by a capital letter, unless that period closes "vs.".
 *
 * Without the exception the English "Strong vs. Infantry" would be cut in two and the verdict
 * would lose the classes it introduces. A translation occasionally forgets the period in front
 * of a verdict, so a capitalised word followed by the locale's "versus" word opens a sentence
 * too; a role sentence cut that way is joined back unchanged.
 */
const SENTENCE_BREAK = /(?<=\.)(?<!\bvs\.)\s+(?=[A-ZÀ-Þ])|\s+(?=[A-ZÀ-Þ]\S*\s+(?:vs\.|contra|contro|contre|gegen)\s)/;

/** The adverb a designer sometimes puts in front of a verdict ("Exceptionally strong vs."). */
const INTENSIFIER =
    '(?:\\p{L}+mente?|exceptionally|extremely|very|muy|molto|sehr|extrem|äußerst|besonders|außerordentlich|außergewöhnlich)\\s+';

/** The translations inflect the verdict for a unit trained in pairs ("Fortes contra"), so each opener accepts both numbers. */
const STRONG_OPENERS = 'strong|fortes?|forti|fuertes?|efficaces?|stark|wirksam|effektiv';

/**
 * French opens a role sentence with the same adjectives ("Puissante cavalerie lourde"), so there
 * they only count as a verdict when they lead straight to the versus word.
 */
const STRONG_OPENERS_FRENCH = '(?:puissant(?:es?|s)?|forts?)(?=\\s+(?:contre|face|en)\\b)';

const WEAK_OPENERS = 'weak|fracos?|fracas?|d[eé]bil(?:es)?|debol[ei]|faibles?|vulnérables?|schwach';

/** Sentence openers the game uses to introduce a matchup verdict, per shipped locale. */
const MATCHUP_MARKERS = {
    strong: new RegExp(`^(?:${INTENSIFIER})?(?:${STRONG_OPENERS}|${STRONG_OPENERS_FRENCH})\\b`, 'iu'),
    weak: new RegExp(`^(?:${INTENSIFIER})?(?:${WEAK_OPENERS})\\b`, 'iu'),
};

export interface UnitHelp {
    role: string;
    strongVs: string;
    weakVs: string;
    upgradesHint: string;
}

export interface CivilizationSection {
    title: string;
    items: string[];
}

export interface CivilizationHelp {
    intro: string;
    bonuses: string[];
    sections: CivilizationSection[];
}

/**
 * Turns a name into the stable identifier the application keys everything on.
 *
 * @param value - Display name in any language.
 * @returns A lowercase, accent-free, hyphenated slug.
 */
export function slug(value: string): string {
    return value
        .normalize('NFD')
        .replace(COMBINING_MARKS, '')
        .replace(MARKUP, ' ')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Strips the game's markup and collapses whitespace.
 *
 * @param value - Raw string straight from the game's string table.
 * @returns Plain readable text.
 */
export function cleanText(value: string): string {
    return value.replace(MARKUP, '').replace(/\s+/g, ' ').trim();
}

/**
 * Splits a help blob into the sentences the interface shows separately.
 *
 * The first line only repeats the unit name and its cost placeholder, and the last one is a row
 * of stat placeholders, so both are dropped. The line carrying the italic marker is the upgrade
 * hint the game writes for every unit.
 *
 * @param raw - Raw help string, still carrying markup and escaped newlines.
 * @returns The role sentence, both matchup verdicts and the upgrade hint.
 */
export function parseUnitHelp(raw: string): UnitHelp {
    const lines = raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    let description = '';
    let upgradesHint = '';

    for (const [index, line] of lines.entries()) {
        const text = cleanText(line);
        if (!text) continue;
        if (line.includes('<i>')) {
            upgradesHint = text;
            continue;
        }
        if (index === 0) continue;
        if (!description) description = text;
    }

    return { ...splitMatchupSentences(description), upgradesHint };
}

/**
 * Pulls the designer-written matchup verdicts out of a unit description.
 *
 * @param description - The plain description sentence block.
 * @returns The role text plus the verdicts of each kind, empty when the unit has none.
 */
export function splitMatchupSentences(description: string): Omit<UnitHelp, 'upgradesHint'> {
    const sentences = description
        .split(SENTENCE_BREAK)
        .map((sentence) => sentence.trim())
        .filter(Boolean);

    const role: string[] = [];
    const strongVs: string[] = [];
    const weakVs: string[] = [];

    for (const sentence of sentences) {
        if (MATCHUP_MARKERS.strong.test(sentence)) strongVs.push(sentence);
        else if (MATCHUP_MARKERS.weak.test(sentence)) weakVs.push(sentence);
        else role.push(sentence);
    }

    return { role: role.join(' '), strongVs: strongVs.join(' '), weakVs: weakVs.join(' ') };
}

/**
 * Splits a civilization help blob into its intro, its plain bonuses and its titled sections.
 *
 * Sections are recognised by the bold marker rather than by their wording, which is what keeps
 * this working in every language the game ships.
 *
 * @param raw - Raw help string, still carrying markup and escaped newlines.
 * @returns The civilization summary in structured form.
 */
export function parseCivilizationHelp(raw: string): CivilizationHelp {
    const lines = raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const result: CivilizationHelp = { intro: '', bonuses: [], sections: [] };
    let current: CivilizationSection | null = null;

    for (const line of lines) {
        const isHeading = line.includes('<b>');
        const text = cleanText(line);
        if (!text) continue;

        if (isHeading) {
            const [title, ...rest] = text.split(':');
            current = { title: title.trim(), items: [] };
            result.sections.push(current);

            const inline = rest.join(':').trim();
            if (inline) current.items.push(inline);
            continue;
        }

        const bulleted = BULLET.test(text);
        const item = text.replace(BULLET, '').trim();
        if (!item) continue;

        const list = current ? current.items : result.bonuses;
        const previous = list.at(-1);

        // The game wraps a long age list by hand, mid-list. A bullet can never end on the slash,
        // which tells that wrap apart from a translation that merely forgot the next bullet.
        if (!bulleted && previous?.endsWith('/')) {
            list[list.length - 1] = `${previous}${item}`;
            continue;
        }

        if (!current && !result.intro) result.intro = item;
        else list.push(item);
    }

    return result;
}
