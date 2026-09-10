"use client";

import React from "react";

import type {
  CurrentLocationReading,
  RoutableLocation,
  SearchContext,
} from "~/core/search/search.types";
import { LocationButton } from "~/ui/map/LocationButton";
import { SearchTrustBlock } from "./SearchTrustBlock";
import type { LocationRequestFailure } from "~/ui/map/locationReader";

export type DestinationItem = {
  id: string;
  name: string;
  icon: string;
  query: string;
};

export const POPULAR_DESTINATIONS: readonly DestinationItem[] = [
  { id: "monas", name: "Monas", icon: "🏛️", query: "Monas" },
  {
    id: "gi",
    name: "Grand Indonesia",
    icon: "🛍️",
    query: "Grand Indonesia",
  },
  { id: "gbk", name: "GBK", icon: "🏟️", query: "GBK" },
];

type Module1Props = {
  activeContext: SearchContext;
  destination?: RoutableLocation | null;
  locationMessage?: string;
  onLocateUser?: (
    context: SearchContext,
    reading: CurrentLocationReading,
  ) => void;
  onLocationError?: (
    context: SearchContext,
    failure: LocationRequestFailure,
  ) => void;
  onOpenSearch: (context: SearchContext) => void;
  onSelectDestination: (query: string) => void;
  origin?: RoutableLocation | null;
  timingControls?: React.ReactNode;
  children?: React.ReactNode;
};

export const Module1Explore = ({
  activeContext,
  destination,
  locationMessage,
  onLocateUser,
  onLocationError,
  onOpenSearch,
  onSelectDestination,
  origin,
  timingControls,
  children,
}: Module1Props) => {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100 font-sans">
      <div className="absolute inset-0 z-0 h-full w-full">{children}</div>

      <header className="absolute top-6 right-0 left-0 z-20 px-4 sm:top-11">
        <div className="rounded-[28px] border border-slate-100/90 bg-white/95 p-3 shadow-lg backdrop-blur-md">
          <div className="mb-2 px-1 text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase">
            RENCANA PERJALANAN
          </div>
          <div className="grid gap-2">
            <EndpointField
              context="origin"
              location={origin}
              active={activeContext === "origin"}
              onClick={() => onOpenSearch("origin")}
            />
            <EndpointField
              context="destination"
              location={destination}
              active={activeContext === "destination"}
              onClick={() => onOpenSearch("destination")}
            />
          </div>
        </div>
      </header>

      <div className="absolute right-4 bottom-[232px] z-20">
        <LocationButton
          context={activeContext}
          onLocationResolved={onLocateUser}
          onLocationError={onLocationError}
        />
      </div>

      <section
        id="explore-bottom-sheet"
        className="absolute right-0 bottom-0 left-0 z-30 max-h-[78%] overflow-y-auto rounded-t-[32px] border-t border-slate-100 bg-white px-5 pt-2.5 pb-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />

        <div className="mb-2.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          TUJUAN POPULER
        </div>
        <div className="flex flex-wrap items-center gap-2.5 pb-3">
          {POPULAR_DESTINATIONS.map((destinationItem) => (
            <button
              key={destinationItem.id}
              id={`chip-${destinationItem.id}`}
              type="button"
              onClick={() => onSelectDestination(destinationItem.query)}
              className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-xs transition-all hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-95"
            >
              <span aria-hidden="true">{destinationItem.icon}</span>
              <span>{destinationItem.name}</span>
            </button>
          ))}
        </div>

        {locationMessage && (
          <p
            className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800"
            role="status"
            aria-live="polite"
          >
            {locationMessage}
          </p>
        )}

        {timingControls ? <div className="mt-3">{timingControls}</div> : null}

        <p className="text-[11px] leading-4 text-slate-500">
          {activeContext === "origin"
            ? "Pilih asal perjalanan, lalu tentukan tujuan."
            : "Pilih tujuan perjalanan dari hasil lokal yang tersedia."}
        </p>
        <div className="mx-auto mt-3 h-1 w-32 rounded-full bg-slate-900/25" />
      </section>
    </div>
  );
};

type EndpointFieldProps = {
  active: boolean;
  context: SearchContext;
  location?: RoutableLocation | null;
  onClick: () => void;
};

const EndpointField = ({
  active,
  context,
  location,
  onClick,
}: EndpointFieldProps) => {
  const label = context === "origin" ? "Dari" : "Ke";
  const placeholder =
    context === "origin" ? "Pilih lokasi asal" : "Pilih tujuan";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${location?.name ?? placeholder}`}
      className={`flex min-h-14 w-full items-start gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${active ? "border-emerald-400 bg-emerald-50/60" : "border-slate-200 bg-white hover:border-emerald-200"}`}
    >
      <span
        aria-hidden="true"
        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${context === "origin" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
      >
        {context === "origin" ? "A" : "T"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          {label}
        </span>
        <span className="block text-sm leading-5 font-semibold break-words text-slate-900">
          {location?.name ?? placeholder}
        </span>
        {location ? (
          <SearchTrustBlock
            source={location.source}
            confidence={location.confidence}
            verification={location.verification}
            distanceBasis={location.distanceBasis}
          />
        ) : (
          <span className="block text-[11px] leading-4 text-slate-400">
            Cari halte, rute, atau tempat
          </span>
        )}
      </span>
      <span className="mt-2 shrink-0 text-slate-400" aria-hidden="true">
        →
      </span>
    </button>
  );
};
