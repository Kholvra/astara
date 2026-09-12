"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { ArrowLeft, Search, X } from "lucide-react";

import {
  boundSearchQuery,
  DEMO_SEARCH_INDEX,
  MAX_QUERY_LENGTH,
  resolveSearchQuery,
} from "~/core/search/searchAdapter";
import type {
  RoutableLocation,
  SearchContext,
  SearchQueryOutcome,
  SearchResolutionOutcome,
  SearchResultItem,
} from "~/core/search/search.types";
import {
  ConfirmationPanel,
  getOutcomeMessage,
  SearchOutcomePanel,
  type PendingSearchResolution,
} from "./SearchPanels";
import { resolveSearchSelection } from "./searchSelectionController";

type Module2Props = {
  context: SearchContext;
  initialQuery?: string;
  searchItems?: readonly SearchResultItem[];
  localIndexAvailable?: boolean;
  onBack: () => void;
  onSelectLocation: (
    context: SearchContext,
    location: RoutableLocation,
  ) => void;
};

export const Module2Search = ({
  context,
  initialQuery = "",
  searchItems = DEMO_SEARCH_INDEX.items,
  localIndexAvailable = true,
  onBack,
  onSelectLocation,
}: Module2Props) => {
  const [searchTerm, setSearchTerm] = useState(boundSearchQuery(initialQuery));
  const [outcome, setOutcome] = useState<SearchQueryOutcome>(() =>
    resolveSearchQuery(initialQuery, {
      ...DEMO_SEARCH_INDEX,
      items: searchItems,
      fallbackItems: searchItems,
      available: localIndexAvailable,
    }),
  );
  const [pending, setPending] = useState<PendingSearchResolution | null>(null);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(
    (value: string) => {
      const boundedValue = boundSearchQuery(value);
      setSearchTerm(boundedValue);
      setPending(null);
      setSelectionMessage(null);
      setOutcome(
        resolveSearchQuery(boundedValue, {
          ...DEMO_SEARCH_INDEX,
          items: searchItems,
          fallbackItems: searchItems,
          available: localIndexAvailable,
        }),
      );
    },
    [localIndexAvailable, searchItems],
  );

  useEffect(() => {
    runSearch(initialQuery);
  }, [initialQuery, runSearch]);

  useEffect(() => {
    if (!pending) inputRef.current?.focus();
  }, [pending]);

  const handleResolution = (resolution: SearchResolutionOutcome) => {
    if (resolution.state === "selected") {
      onSelectLocation(context, resolution.location);
      return;
    }

    if (resolution.state === "not_routable") {
      setPending(null);
      setSelectionMessage(resolution.message);
      return;
    }

    setSelectionMessage(null);
    setPending(resolution);
  };

  const handleSelectItem = (item: SearchResultItem) => {
    handleResolution(
      resolveSearchSelection({ type: "select_result", item }, searchItems),
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;

    event.preventDefault();
    if (pending) {
      setPending(null);
      setSelectionMessage(null);
    } else {
      onBack();
    }
  };

  const contextLabel = context === "origin" ? "asal" : "tujuan";

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-white font-sans"
      onKeyDown={handleKeyDown}
    >
      <header className="border-b border-slate-100 bg-white px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => (pending ? setPending(null) : onBack())}
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:scale-95"
            aria-label={pending ? "Kembali ke hasil pencarian" : "Kembali"}
          >
            <ArrowLeft className="h-6 w-6 stroke-[2.2]" aria-hidden="true" />
          </button>
          <div className="flex min-h-[50px] min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 transition-all focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20">
            <Search
              className="h-5 w-5 shrink-0 text-slate-400"
              aria-hidden="true"
            />
            <label className="sr-only" htmlFor="location-search-input">
              Cari {contextLabel}
            </label>
            <input
              id="location-search-input"
              ref={inputRef}
              type="search"
              value={searchTerm}
              onChange={(event) => runSearch(event.target.value)}
              placeholder={
                context === "origin"
                  ? "Cari halte atau lokasi asal…"
                  : "Mau ke mana? Ketik halte tujuan…"
              }
              maxLength={MAX_QUERY_LENGTH}
              className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 caret-emerald-600 outline-none placeholder:text-slate-400"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => runSearch("")}
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-200 text-slate-600 transition-colors hover:bg-slate-300 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="Hapus pencarian"
              >
                <X className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto pb-6">
        {selectionMessage && (
          <div className="mx-4 mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 text-amber-900">
            <p className="min-w-0 flex-1 text-xs leading-5 font-medium">
              {selectionMessage}
            </p>
          </div>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {getOutcomeMessage(outcome, pending, selectionMessage)}
        </p>

        {pending ? (
          <div className="px-4 py-2">
            <ConfirmationPanel
              pending={pending}
              catalog={searchItems}
              onCancel={() => {
                setPending(null);
                setSelectionMessage(null);
              }}
              onResolve={handleResolution}
            />
          </div>
        ) : (
          <SearchOutcomePanel
            outcome={outcome}
            onRetry={() => runSearch(searchTerm)}
            onSelect={handleSelectItem}
            onQuickSelect={(query) => runSearch(query)}
          />
        )}
      </main>
    </div>
  );
};
