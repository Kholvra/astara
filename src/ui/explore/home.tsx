"use client";

import React from "react";
import { type SearchResultItem, type VerificationStatus } from "~/core/search/search.types";
import { LocationButton } from "~/ui/map/LocationButton";

export interface DestinationItem {
  id: string;
  name: string;
  icon: string;
  query: string;
}

export const POPULAR_DESTINATIONS: DestinationItem[] = [
  { id: "monas", name: "Monas", icon: "🏛️", query: "Monas" },
  { id: "gi", name: "Grand Indonesia", icon: "🛍️", query: "Grand Indonesia" },
  { id: "gbk", name: "GBK", icon: "🏟️", query: "GBK" },
];

interface Module1Props {
  onOpenSearch: () => void;
  onSelectDestination: (destName: string) => void;
  onViewRoute?: (stop?: SearchResultItem) => void;
  selectedStop?: SearchResultItem | null;
  onLocateUser?: (coords: [number, number]) => void;
  children?: React.ReactNode; // Tempat inject komponen MapLibre
}

export const Module1Explore: React.FC<Module1Props> = ({
  onOpenSearch,
  onSelectDestination,
  onViewRoute,
  selectedStop,
  onLocateUser,
  children,
}) => {
  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-slate-100 font-sans">
      {/* 1. Map Canvas Body */}
      <div className="absolute inset-0 z-0 h-full w-full">
        {children}
      </div>

      {/* 2. Top Floating Search Bar Trigger */}
      <header className="absolute left-0 right-0 top-11 z-20 px-4">
        <button
          id="btn-search-trigger"
          type="button"
          onClick={onOpenSearch}
          className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-full border border-slate-100/90 bg-white/95 px-4 text-left shadow-lg backdrop-blur-md transition-all hover:bg-white active:scale-[0.99]"
        >
          <svg className="h-5 w-5 shrink-0 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <span className="truncate text-[13.5px] font-medium text-slate-500">
            Cari halte atau rute TransJakarta...
          </span>
        </button>
      </header>

      {/* 3. Floating GPS Locate Button Container */}
      <div className="absolute bottom-[232px] right-4 z-20">
        <LocationButton onLocationResolved={onLocateUser} />
      </div>

      {/* 4. Explore Bottom Sheet Card */}
      <section
        id="explore-bottom-sheet"
        className="absolute bottom-0 left-0 right-0 z-30 rounded-t-[32px] border-t border-slate-100 bg-white px-5 pb-4 pt-2.5 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]"
      >
        {/* Handle Bar */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />

        {/* TUJUAN POPULER Header */}
        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          TUJUAN POPULER
        </div>

        {/* Popular Destination Chips */}
        <div className="no-scrollbar flex items-center gap-2.5 overflow-x-auto pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {POPULAR_DESTINATIONS.map((dest) => (
            <button
              key={dest.id}
              id={`chip-${dest.id}`}
              type="button"
              onClick={() => onSelectDestination(dest.query)}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-xs transition-all hover:bg-slate-50 active:scale-95"
            >
              <span>{dest.icon}</span>
              <span>{dest.name}</span>
            </button>
          ))}
        </div>

        {/* Nearest Selected Stop Card */}
        {selectedStop && (
          <article
            id="card-selected-stop"
            onClick={() => onViewRoute?.(selectedStop)}
            className="mb-1 flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 transition-all hover:border-emerald-300 hover:shadow-xs active:scale-[0.99]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h.01M16 17h.01M4 11V6a2 2 0 012-2h12a2 2 0 012 2v5M4 11h16M4 11v6a2 2 0 002 2h1v1a1 1 0 001 1h1a1 1 0 001-1v-1h4v1a1 1 0 001 1h1a1 1 0 001-1v-1h1a2 2 0 002-2v-6M8 8h8" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-bold leading-snug text-slate-900">
                  {selectedStop.title}
                </div>
                <div className="truncate text-[11.5px] font-medium text-slate-500">
                  {selectedStop.walkTimeMinutes && selectedStop.walkDistanceMeters
                    ? `Jalan ${selectedStop.walkTimeMinutes} mnt (${selectedStop.walkDistanceMeters} m) • `
                    : ""}
                  {selectedStop.routes?.join(", ") ?? "Koridor 1, 10H"}
                </div>
              </div>
            </div>

            <TruthBadge status={selectedStop.verification} />
          </article>
        )}

        {/* Mobile Home Indicator */}
        <div className="mx-auto mt-3 h-1 w-32 rounded-full bg-slate-900/25" />
      </section>
    </div>
  );
};

function TruthBadge({ status }: { status: VerificationStatus }) {
  if (status === "Terverifikasi") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-500 bg-emerald-50/50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        <svg className="h-3 w-3 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Terverifikasi
      </span>
    );
  }

  if (status === "Perlu dicek") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-lg border border-amber-500 bg-amber-50/50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
        ! Perlu dicek
      </span>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
      Data terbatas
    </span>
  );
}