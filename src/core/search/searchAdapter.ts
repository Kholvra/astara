import { MOCK_SEARCH_ITEMS } from "./mockSearchData";
import {
  type RankedSearchResult,
  type SearchIndex,
  type SearchMatchKind,
  type SearchQueryOutcome,
  type SearchResultItem,
} from "./search.types";

export const MAX_QUERY_LENGTH = 120;
export const MAX_SEARCH_RESULTS = 8;
export const MAX_SEARCH_ALTERNATIVES = 3;

export const DEMO_SEARCH_INDEX: SearchIndex = {
  available: true,
  items: MOCK_SEARCH_ITEMS,
  fallbackItems: MOCK_SEARCH_ITEMS,
};

const MATCH_RANK: Record<SearchMatchKind, number> = {
  title_exact: 0,
  alias_exact: 1,
  route_exact: 2,
  title_prefix: 3,
  alias_prefix: 4,
  route_prefix: 5,
  text_contains: 6,
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function searchLocations(
  query: string,
  items: readonly SearchResultItem[] = MOCK_SEARCH_ITEMS,
): RankedSearchResult[] {
  const normalizedQuery = normalizeSearchText(boundSearchQuery(query));
  if (!normalizedQuery) return [];

  return items
    .map((item) => {
      const matchKind = getMatchKind(item, normalizedQuery);
      return matchKind ? { item, matchKind } : null;
    })
    .filter(
      (candidate): candidate is NonNullable<typeof candidate> =>
        candidate !== null,
    )
    .sort((left, right) => compareCandidates(left, right))
    .slice(0, MAX_SEARCH_RESULTS)
    .map(({ item, matchKind }) => ({ ...item, matchKind }));
}

export function resolveSearchQuery(
  query: string,
  index: SearchIndex = DEMO_SEARCH_INDEX,
): SearchQueryOutcome {
  const boundedQuery = boundSearchQuery(query);
  if (!boundedQuery.trim()) {
    return { state: "idle", query: "", results: [] };
  }

  if (!index.available) {
    return {
      state: "index_unavailable",
      query: boundedQuery,
      alternatives: getAlternatives(index.fallbackItems ?? index.items),
    };
  }

  const results = searchLocations(boundedQuery, index.items);
  if (results.length > 0) {
    return { state: "results", query: boundedQuery, results };
  }

  return {
    state: "no_result",
    query: boundedQuery,
    alternatives: getAlternatives(index.items),
  };
}

function getMatchKind(
  item: SearchResultItem,
  query: string,
): SearchMatchKind | undefined {
  const title = normalizeSearchText(item.title);
  const aliases = (item.aliases ?? []).map(normalizeSearchText);
  const routes = (item.routes ?? []).map(normalizeSearchText);
  const subtitle = normalizeSearchText(item.subtitle ?? "");

  if (title === query) return "title_exact";
  if (aliases.some((alias) => alias === query)) return "alias_exact";
  if (routes.some((route) => route === query)) return "route_exact";
  if (title.startsWith(query)) return "title_prefix";
  if (aliases.some((alias) => alias.startsWith(query))) return "alias_prefix";
  if (routes.some((route) => route.startsWith(query))) return "route_prefix";
  if (
    title.includes(query) ||
    aliases.some((alias) => alias.includes(query)) ||
    routes.some((route) => route.includes(query)) ||
    subtitle.includes(query)
  ) {
    return "text_contains";
  }

  return undefined;
}

function compareCandidates(
  left: { item: SearchResultItem; matchKind: SearchMatchKind },
  right: { item: SearchResultItem; matchKind: SearchMatchKind },
): number {
  return (
    MATCH_RANK[left.matchKind] - MATCH_RANK[right.matchKind] ||
    sourceRank(left.item) - sourceRank(right.item) ||
    typeRank(left.item) - typeRank(right.item) ||
    left.item.id.localeCompare(right.item.id)
  );
}

function getAlternatives(
  items: readonly SearchResultItem[],
): readonly SearchResultItem[] {
  return [...items]
    .filter((item) => item.type === "stop_or_route")
    .sort(
      (left, right) =>
        sourceRank(left) - sourceRank(right) ||
        typeRank(left) - typeRank(right) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, MAX_SEARCH_ALTERNATIVES);
}

function sourceRank(item: SearchResultItem): number {
  return item.source === "gtfs_local" ? 0 : 1;
}

function typeRank(item: SearchResultItem): number {
  return item.type === "stop_or_route" ? 0 : 1;
}

export function boundSearchQuery(value: string): string {
  return Array.from(value).slice(0, MAX_QUERY_LENGTH).join("");
}
