import { MOCK_SEARCH_ITEMS } from "./mockSearchData";
import { type SearchResultItem } from "./search.types";

export async function searchLocations(query: string): Promise<SearchResultItem[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  await new Promise((resolve) => setTimeout(resolve, 150));

  return MOCK_SEARCH_ITEMS.filter((item) => {
    const matchTitle = item.title.toLowerCase().includes(trimmed);
    const matchSubtitle = (item.subtitle?.toLowerCase().includes(trimmed)) ?? false;
    const matchRoute = (item.routes?.some((r) => r.toLowerCase().includes(trimmed))) ?? false;

    return matchTitle || matchSubtitle || matchRoute;
  });
}