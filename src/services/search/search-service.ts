import { normalize, type FuzzyMatch, type FuzzyMatcher } from './fuzzy-matcher.ts';
import type { SearchDocument, SearchIndexBuilder, SearchKind } from './search-index-builder.ts';

export interface SearchServiceConfig {
    indexBuilder: SearchIndexBuilder;
    matcher: FuzzyMatcher;
}

export interface SearchQuery {
    text: string;
    locale: string;
    kinds?: readonly SearchKind[];
    civ?: string | null;
    limit?: number;
}

/** A name from another language the query matched, with the characters it matched. */
export interface MatchedAlias {
    text: string;
    positions: readonly number[];
}

export interface SearchHit {
    document: SearchDocument;
    score: number;
    /** Characters of the title the query matched. */
    positions: readonly number[];
    /** Set when the query matched the item's name in another language rather than its title. */
    alias: MatchedAlias | null;
}

/** One name an item goes by: its title, or what another language calls it. */
interface Name {
    text: string;
    normalized: string;
    weight: number;
    isTitle: boolean;
}

/** How well the whole query reads as one of the item's names. */
interface NameMatch {
    name: Name;
    score: number;
    positions: number[];
}

export interface SearchOutcome {
    hits: SearchHit[];
    /** Civilization inferred from the query, so the interface can show it as an active filter. */
    civScope: SearchDocument | null;
}

const DEFAULT_LIMIT = 12;
const MIN_CIV_TOKEN = 3;

/**
 * A word must be this long before another language's civilization name may scope the query, or
 * "war" in "war galley" reads as the start of Waräger, the German name for the Varangians.
 */
const MIN_ALIAS_CIV_TOKEN = 4;

/**
 * Another language's name counts half as much as the title. Any more and a few typed letters start
 * pulling in names from Spanish or Italian ahead of the title the reader was typing in their own.
 */
const ALIAS_WEIGHT = 0.5;

/** Words the title does not show, such as the owning civilization, count well below the title. */
const KEYWORD_WEIGHT = 0.3;

/** Shorter words must appear as typed: scattered, two letters such as "at" fit almost any name. */
const MIN_SCATTERED_TERM = 3;
const KIND_ORDER: Record<SearchKind, number> = { unit: 0, civilization: 1, technology: 2 };

/** Ranks the catalog against a free-text query, including "unit + civilization" phrasing. */
export class SearchService {
    private readonly config: SearchServiceConfig;
    private readonly indices = new Map<string, SearchDocument[]>();

    constructor(config: SearchServiceConfig) {
        this.config = config;
    }

    /**
     * Ranks documents against a typed query.
     *
     * @param query - Raw text plus the locale and any active filters.
     * @returns The best hits and the civilization the query narrowed itself to, if any.
     */
    public search(query: SearchQuery): SearchOutcome {
        const documents = this.documents(query.locale);
        const tokens = normalize(query.text).split(/\s+/).filter(Boolean);
        const scope = this.civScopeFrom(documents, tokens, query.civ ?? null);
        const terms = tokens.filter((token) => token !== scope.token);
        const limit = query.limit ?? DEFAULT_LIMIT;

        const pool = documents
            .filter((document) => !query.kinds || query.kinds.includes(document.kind))
            .filter((document) => !scope.civ || document.civs.includes(scope.civ.key) || document.id === scope.civ.id);

        const hits = terms.length === 0 ? this.defaultHits(pool, scope.civ) : this.rank(pool, terms);

        return { civScope: scope.civ, hits: hits.slice(0, limit) };
    }

    /**
     * The indexed documents for a locale, built on first use and cached afterwards.
     *
     * @param locale - Locale to index.
     * @returns Every searchable document.
     */
    public documents(locale: string): SearchDocument[] {
        const cached = this.indices.get(locale);
        if (cached) return cached;

        const built = this.config.indexBuilder.build(locale);
        this.indices.set(locale, built);

        return built;
    }

    private rank(pool: readonly SearchDocument[], terms: readonly string[]): SearchHit[] {
        const hits: SearchHit[] = [];

        for (const document of pool) {
            const match = this.bestName(document, terms);
            if (!match) continue;

            const positions = [...new Set(match.positions)].sort((a, b) => a - b);
            hits.push({
                document,
                score: match.score * document.weight,
                positions: match.name.isTitle ? positions : [],
                alias: match.name.isTitle ? null : { text: match.name.text, positions },
            });
        }

        return hits.sort(
            (left, right) =>
                right.score - left.score ||
                KIND_ORDER[left.document.kind] - KIND_ORDER[right.document.kind] ||
                left.document.title.localeCompare(right.document.title),
        );
    }

    /**
     * The name the whole query reads best as.
     *
     * Every word has to land on that one name or, at a much lower weight, on a keyword, so a query
     * never stitches a match together from pieces of different languages.
     */
    private bestName(document: SearchDocument, terms: readonly string[]): NameMatch | null {
        const names: Name[] = [
            { text: document.title, normalized: document.normalizedTitle, weight: 1, isTitle: true },
            ...document.aliases.map((alias) => ({ ...alias, weight: ALIAS_WEIGHT, isTitle: false })),
        ];
        const onKeywords = terms.map((term) => this.keywordScore(document, term));
        let best: NameMatch | null = null;

        for (const name of names) {
            let score = 0;
            const positions: number[] = [];
            let matchedAll = true;

            for (const [index, term] of terms.entries()) {
                const onName = this.matchTerm(term, name.normalized);
                const named = onName ? onName.score * name.weight : null;
                const onKeyword = onKeywords[index];

                if (onName && named !== null && (onKeyword === null || named >= onKeyword)) {
                    score += named;
                    positions.push(...onName.positions);
                } else if (onKeyword !== null) {
                    score += onKeyword;
                } else {
                    matchedAll = false;
                    break;
                }
            }

            if (matchedAll && (!best || score > best.score)) best = { name, score, positions };
        }

        return best;
    }

    private matchTerm(term: string, text: string): FuzzyMatch | null {
        const match = this.config.matcher.match(term, text);
        if (!match || term.length >= MIN_SCATTERED_TERM) return match;

        const isTogether = (match.positions.at(-1) ?? 0) - (match.positions[0] ?? 0) === term.length - 1;

        return isTogether ? match : null;
    }

    private keywordScore(document: SearchDocument, term: string): number | null {
        let best: number | null = null;
        for (const keyword of document.keywords) {
            const match = this.matchTerm(term, keyword);
            if (match && (best === null || match.score > best)) best = match.score;
        }

        return best === null ? null : best * KEYWORD_WEIGHT;
    }

    private defaultHits(pool: readonly SearchDocument[], civ: SearchDocument | null): SearchHit[] {
        return pool
            .filter((document) => (civ ? document.id !== civ.id : true))
            .map((document) => ({ document, score: document.weight, positions: [], alias: null }))
            .sort(
                (left, right) =>
                    KIND_ORDER[left.document.kind] - KIND_ORDER[right.document.kind] ||
                    right.score - left.score ||
                    left.document.title.localeCompare(right.document.title),
            );
    }

    /**
     * Finds the civilization a multi-word query is scoped to.
     *
     * A single word is never treated as a filter, otherwise typing a civilization name would hide
     * the civilization itself behind its own roster.
     */
    private civScopeFrom(
        documents: readonly SearchDocument[],
        tokens: readonly string[],
        explicit: string | null,
    ): { civ: SearchDocument | null; token: string | null } {
        if (explicit) {
            const forced = documents.find((document) => document.kind === 'civilization' && document.key === explicit);
            if (forced) return { civ: forced, token: null };
        }

        if (tokens.length < 2) return { civ: null, token: null };

        for (const token of tokens) {
            if (token.length < MIN_CIV_TOKEN) continue;

            const civ = documents.find(
                (document) =>
                    document.kind === 'civilization' &&
                    (document.normalizedTitle.startsWith(token) ||
                        (token.length >= MIN_ALIAS_CIV_TOKEN &&
                            document.aliases.some((alias) => alias.normalized.startsWith(token))) ||
                        document.keywords.some((keyword) => keyword.startsWith(token))),
            );
            if (civ) return { civ, token };
        }

        return { civ: null, token: null };
    }
}
