import type {
  RoutableLocation,
  SearchContext,
  SearchEndpointState,
} from "./search.types";

export function assignSearchEndpoint(
  endpoints: SearchEndpointState,
  context: SearchContext,
  location: RoutableLocation,
): SearchEndpointState {
  return {
    ...endpoints,
    [context]: location,
  };
}
