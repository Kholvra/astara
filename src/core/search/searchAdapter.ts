import { MOCK_SEARCH_ITEMS } from "./mockSearchData";
import { type SearchResultItem } from "./search.types";

export function searchLocations(query: string): SearchResultItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  return MOCK_SEARCH_ITEMS.filter((item) => {
    const matchTitle = item.title.toLowerCase().includes(trimmed);
    const matchSubtitle =
      item.subtitle?.toLowerCase().includes(trimmed) ?? false;
    const matchRoute =
      item.routes?.some((r) => r.toLowerCase().includes(trimmed)) ?? false;

    return matchTitle || matchSubtitle || matchRoute;
  });
}
