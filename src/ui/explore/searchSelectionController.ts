import { MOCK_SEARCH_ITEMS } from "~/core/search/mockSearchData";
import {
  resolveSearchResult,
  type SearchResolutionOptions,
} from "~/core/search/searchResolution";
import type {
  SearchResolutionOutcome,
  SearchResultItem,
} from "~/core/search/search.types";

export type SearchSelectionAction =
  | { type: "select_result"; item: SearchResultItem }
  | { type: "select_platform"; item: SearchResultItem; platformId: string }
  | {
      type: "confirm_place_conversion";
      item: SearchResultItem;
      stopId: string;
    }
  | { type: "confirm_low_confidence"; item: SearchResultItem };

export function resolveSearchSelection(
  action: SearchSelectionAction,
  catalog: readonly SearchResultItem[] = MOCK_SEARCH_ITEMS,
): SearchResolutionOutcome {
  const options: SearchResolutionOptions = { catalog };

  switch (action.type) {
    case "select_result":
      return resolveSearchResult(action.item, options);
    case "select_platform":
      return resolveSearchResult(action.item, {
        ...options,
        platformId: action.platformId,
      });
    case "confirm_place_conversion":
      return resolveSearchResult(action.item, {
        ...options,
        conversionStopId: action.stopId,
      });
    case "confirm_low_confidence":
      return resolveSearchResult(action.item, {
        ...options,
        confirmLowConfidence: true,
      });
  }
}
