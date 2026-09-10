"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

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
  localIndexAvailable = true,
  onBack,
  onSelectLocation,
}: Module2Props) => {
  const [searchTerm, setSearchTerm] = useState(boundSearchQuery(initialQuery));
  const [outcome, setOutcome] = useState<SearchQueryOutcome>(() =>
    resolveSearchQuery(initialQuery, {
      ...DEMO_SEARCH_INDEX,
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
          available: localIndexAvailable,
        }),
      );
    },
    [localIndexAvailable],
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
    handleResolution(resolveSearchSelection({ type: "select_result", item }));
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
      className="flex h-full w-full flex-col overflow-hidden bg-[#F6F8FA] font-sans"
      onKeyDown={handleKeyDown}
    >
      <header className="px-4 pt-5 pb-3">
        <div className="mb-2 px-1 text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase">
          PILIH {contextLabel}
        </div>
        <div className="flex min-h-[52px] w-full items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
          <button
            type="button"
            onClick={() => (pending ? setPending(null) : onBack())}
            className="mr-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-95"
            aria-label={pending ? "Kembali ke hasil pencarian" : "Kembali"}
          >
            <svg
              className="h-5 w-5 stroke-[2.4]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <label className="sr-only" htmlFor="location-search-input">
            Cari {contextLabel}
          </label>
          <input
            id="location-search-input"
            ref={inputRef}
            type="search"
            value={searchTerm}
            onChange={(event) => runSearch(event.target.value)}
            placeholder="Cari halte, rute, atau tempat…"
            maxLength={MAX_QUERY_LENGTH}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-slate-900 caret-emerald-600 outline-none placeholder:font-medium placeholder:text-slate-400"
            autoFocus
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => runSearch("")}
              className="ml-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              aria-label="Hapus pencarian"
            >
              <span aria-hidden="true" className="text-xl leading-none">
                ×
              </span>
            </button>
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
        <div className="rounded-[24px] border border-slate-100/90 bg-white shadow-[0_10px_30px_-4px_rgba(0,0,0,0.08),0_4px_12px_-2px_rgba(0,0,0,0.04)]">
          <div className="border-b border-slate-100 px-4 py-3">
            <p
              className="text-xs leading-5 text-slate-600"
              role="status"
              aria-live="polite"
            >
              {getOutcomeMessage(outcome, pending, selectionMessage)}
            </p>
          </div>

          {pending ? (
            <ConfirmationPanel
              pending={pending}
              onCancel={() => {
                setPending(null);
                setSelectionMessage(null);
              }}
              onResolve={handleResolution}
            />
          ) : (
            <SearchOutcomePanel
              outcome={outcome}
              onRetry={() => runSearch(searchTerm)}
              onSelect={handleSelectItem}
            />
          )}
        </div>
      </main>
    </div>
  );
};
