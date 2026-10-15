import { normalize, type FuzzyMatcher } from './fuzzy-matcher.ts';
import type { SearchAlias, SearchDocument, SearchIndexBuilder, SearchKind } from './search-index-builder.ts';

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

type TermMatch =
    | { field: 'title'; score: number; positions: readonly number[] }
    | { field: 'alias'; score: number; positions: readonly number[]; alias: SearchAlias }
    | { field: 'keyword'; score: number };

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
            let total = 0;
            const positions = new Set<number>();
            let alias: MatchedAlias | null = null;
            let matchedAll = true;

            for (const term of terms) {
                const match = this.bestMatch(document, term);
                if (!match) {
                    matchedAll = false;
                    break;
                }

                total += match.score;
                if (match.field === 'title') match.positions.forEach((position) => positions.add(position));
                if (match.field === 'alias' && !alias) alias = { text: match.alias.text, positions: match.positions };
            }

            if (matchedAll) {
                hits.push({ document, positions: [...positions].sort((a, b) => a - b), alias, score: total * document.weight });
            }
        }

        return hits.sort(
            (left, right) =>
                right.score - left.score ||
                KIND_ORDER[left.document.kind] - KIND_ORDER[right.document.kind] ||
                left.document.title.localeCompare(right.document.title),
        );
    }

    /** The strongest place one query word lands: the title, another language's name, or a keyword. */
    private bestMatch(document: SearchDocument, term: string): TermMatch | null {
        const { matcher } = this.config;
        const candidates: TermMatch[] = [];

        const onTitle = matcher.match(term, document.normalizedTitle);
        if (onTitle) candidates.push({ field: 'title', score: onTitle.score, positions: onTitle.positions });

        for (const alias of document.aliases) {
            const onAlias = matcher.match(term, alias.normalized);
            if (onAlias) candidates.push({ field: 'alias', alias, score: onAlias.score * ALIAS_WEIGHT, positions: onAlias.positions });
        }

        for (const keyword of document.keywords) {
            const onKeyword = matcher.match(term, keyword);
            if (onKeyword) candidates.push({ field: 'keyword', score: onKeyword.score * KEYWORD_WEIGHT });
        }

        return candidates.reduce<TermMatch | null>((best, candidate) => (!best || candidate.score > best.score ? candidate : best), null);
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
