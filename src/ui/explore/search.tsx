"use client";

import React, { useState } from "react";
import { type SearchResultItem, type VerificationStatus } from "~/core/search/search.types";
import { searchLocations } from "~/core/search/searchAdapter";

interface Module2Props {
  onBack: () => void;
  onSelectResult: (item: SearchResultItem) => void;
  initialQuery?: string;
  children?: React.ReactNode;
}

export const Module2Search: React.FC<Module2Props> = ({
  onBack,
  onSelectResult,
  initialQuery = "",
  children,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [ambiguousItem, setAmbiguousItem] = useState<SearchResultItem | null>(null);

  React.useEffect(() => {
    if (initialQuery.trim()) {
      void runSearch(initialQuery);
    }
  }, [initialQuery]);

  const runSearch = async (val: string) => {
    setSearchTerm(val);
    setAmbiguousItem(null);
    if (val.trim().length > 0) {
      setHasSearched(true);
      const res = await searchLocations(val);
      setResults(res);
    } else {
      setHasSearched(false);
      setResults([]);
    }
  };

  const handleSelectItem = (item: SearchResultItem) => {
    if (item.requiresPlatformChoice && item.platforms && item.platforms.length > 0) {
      setAmbiguousItem(item);
      return;
    }
    onSelectResult(item);
  };

  const handlePlatformSelect = (baseItem: SearchResultItem, platformLabel: string) => {
    const resolvedItem: SearchResultItem = {
      ...baseItem,
      title: `${baseItem.title} (${platformLabel.split(" • ")[1] ?? platformLabel})`,
      requiresPlatformChoice: false,
    };
    onSelectResult(resolvedItem);
  };

  // Subtitle & icon: "Jenis • Rute"
  const getTransitMeta = (stop: SearchResultItem) => {
    const rawRoutes = stop.routes ?? [];
    const title = stop.title.toLowerCase();
    const subtitle = (stop.subtitle ?? "").toLowerCase();

    // Filter rute Mikrotrans (mockup)
    const jakRoutes = rawRoutes
      .filter((r) => r.toUpperCase().includes("JAK"))
      .map((r) => r.trim().toUpperCase());

    const isMikro =
      subtitle.includes("mikrotrans") ||
      jakRoutes.length > 0 ||
      title.includes("mikrotrans");

    if (isMikro) {
      const formattedJak =
        jakRoutes.length > 0
          ? jakRoutes
              .map((j) => (j.startsWith("JAK-") ? j : j.replace(/JAK\s*/i, "JAK-")))
              .join(", ")
          : "JAK-10";

      return {
        subtitle: `Mikrotrans • Rute ${formattedJak}`,
        themeClass: "bg-[#EBF5FB] text-[#0085CA]",
      };
    }

    // Filter Non-BRT (mockup)
    const nonBrtCodeList = ["1P", "1R", "2Q", "6B", "6H", "7A", "9D", "5M"];
    const isNonBRT =
      subtitle.includes("non-brt") ||
      subtitle.includes("non brt") ||
      rawRoutes.some((r) =>
        nonBrtCodeList.some((code) => r.toUpperCase().includes(code))
      );

    if (isNonBRT) {
      const cleanedRoutes = rawRoutes
        .map((r) => r.replace(/rute\s*/i, "").trim())
        .filter((r) => !r.toLowerCase().includes("koridor"))
        .join(", ");

      return {
        subtitle: `Non-BRT • Rute ${cleanedRoutes || "1P, 1R, 2Q"}`,
        themeClass: "bg-[#E8F7EE] text-[#00A651]",
      };
    }

    // Halte BRT (mockup)
    const cleanedCorridors = rawRoutes
      .map((r) => r.replace(/koridor\s*/i, "").trim())
      .filter(Boolean)
      .join(", ");

    return {
      subtitle: `Halte BRT • Koridor ${cleanedCorridors || "1, 2"}`,
      themeClass: "bg-[#FDECEE] text-[#E11931]",
    };
  };

  const filteredTransit = results.filter((item) => item.type === "stop_or_route");
  const filteredLandmarks = results.filter((item) => item.type === "place_or_address");

  return (
    <div className="relative flex h-full w-full select-none flex-col overflow-hidden bg-[#F6F8FA] font-sans">
      {/* Background Canvas Map */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
        {children}
      </div>

      {/* Top Floating Search Bar */}
      <section className="relative z-30 px-4 pb-3 pt-6">
        <div className="flex h-[52px] w-full items-center rounded-full border border-slate-100 bg-white px-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={() => {
              if (ambiguousItem) {
                setAmbiguousItem(null);
              } else {
                onBack();
              }
            }}
            className="mr-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 active:scale-95"
            aria-label="Kembali"
          >
            <svg className="h-5 w-5 stroke-[2.4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => void runSearch(e.target.value)}
            placeholder="Cari halte atau rute TransJakarta..."
            className="flex-1 bg-transparent text-[15px] font-semibold text-slate-900 caret-emerald-600 outline-none placeholder:font-medium placeholder:text-slate-400"
            autoFocus
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => void runSearch("")}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:text-slate-600"
              aria-label="Hapus pencarian"
            >
              <svg className="h-3 w-3 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </section>

      {/* Autocomplete Card Container */}
      <section className="relative z-30 flex-1 overflow-y-auto px-4 pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col overflow-hidden rounded-[24px] border border-slate-100/90 bg-white shadow-[0_10px_30px_-4px_rgba(0,0,0,0.08),0_4px_12px_-2px_rgba(0,0,0,0.04)]">
          {ambiguousItem ? (
            /* Opsi Peron */
            <div className="p-4">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  PILIH ARAH PERON
                </span>
                <h3 className="mt-0.5 text-[15px] font-bold text-slate-900">
                  {ambiguousItem.title}
                </h3>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {ambiguousItem.platforms?.map((plat) => (
                  <button
                    key={plat.id}
                    type="button"
                    onClick={() => handlePlatformSelect(ambiguousItem, plat.label)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-left transition hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-xs">
                        <svg className="h-4 w-4 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-[11px] font-medium text-slate-500">
                          {plat.label.split(" • ")[0]}
                        </div>
                        <div className="text-[13.5px] font-bold text-slate-900">
                          {plat.label.split(" • ")[1] ?? plat.label}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 && hasSearched ? (
            <div className="px-4 py-8 text-center text-xs text-slate-400">
              Halte atau lokasi tidak ditemukan.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100/80">
              {/* HALTE TRANSJAKARTA */}
              {filteredTransit.length > 0 && (
                <div className="pt-4 pb-1">
                  <div className="px-5 pb-2.5">
                    <h2 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      HALTE TRANSJAKARTA
                    </h2>
                  </div>

                  {filteredTransit.map((stop, idx, arr) => {
                    const meta = getTransitMeta(stop);
                    return (
                      <article
                        key={stop.id}
                        onClick={() => handleSelectItem(stop)}
                        className="relative flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50/80"
                      >
                        {/* Frame Icon Transportasi */}
                        <div className={`mr-2.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${meta.themeClass}`}>
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h.01M16 17h.01M4 11V6a2 2 0 012-2h12a2 2 0 012 2v5M4 11h16M4 11v6a2 2 0 002 2h1v1a1 1 0 001 1h1a1 1 0 001-1v-1h4v1a1 1 0 001 1h1a1 1 0 001-1v-1h1a2 2 0 002-2v-6M8 8h8" />
                          </svg>
                        </div>

                        {/* Nama Halte & Rute */}
                        <div className="flex-1 pr-1.5">
                          <h3 className="whitespace-nowrap text-[12.5px] font-semibold leading-tight text-slate-800">
                            {stop.title}
                          </h3>
                          <p className="mt-1 whitespace-nowrap text-[10.5px] text-slate-400">
                            {meta.subtitle}
                          </p>
                        </div>

                        {/* Jarak & Truth Badge */}
                        <div className="flex shrink-0 items-center gap-1.5">
                          {stop.walkDistanceMeters && (
                            <span className="whitespace-nowrap text-[11px] text-slate-400">
                              {stop.walkDistanceMeters} m
                            </span>
                          )}
                          <TruthBadge status={stop.verification} />
                        </div>

                        {/* Garis Pembatas Baris */}
                        {idx < arr.length - 1 && (
                          <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-[#E2E8F0]" />
                        )}
                      </article>
                    );
                  })}
                </div>
              )}

              {/* TEMPAT & LANDMARK */}
              {filteredLandmarks.length > 0 && (
                <div className="pt-3 pb-1">
                  <div className="px-5 pb-2.5">
                    <h2 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      TEMPAT & LANDMARK
                    </h2>
                  </div>

                  {filteredLandmarks.map((landmark, idx, arr) => (
                    <article
                      key={landmark.id}
                      onClick={() => handleSelectItem(landmark)}
                      className="relative flex cursor-pointer items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50/80"
                    >
                      {/* Pin Icon + Teks */}
                      <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
                          <svg className="h-4 w-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-[13px] font-semibold leading-tight text-slate-800">
                            {landmark.title}
                          </h3>
                          <p className="mt-1 truncate text-[11px] text-slate-400">
                            {landmark.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Jarak & Chevron */}
                      <div className="flex shrink-0 items-center gap-1.5 text-slate-400">
                        {landmark.walkDistanceMeters && (
                          <span className="text-[11px]">{landmark.walkDistanceMeters} m</span>
                        )}
                        <svg className="h-3.5 w-3.5 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>

                      {/* Garis Pembatas Baris */}
                      {idx < arr.length - 1 && (
                        <div className="absolute bottom-0 left-5 right-5 h-[1px] bg-[#E2E8F0]" />
                      )}
                    </article>
                  ))}
                </div>
              )}

              {/* Action Footer */}
              <footer className="bg-white p-4">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-[13.5px] font-semibold text-emerald-600 transition-colors hover:text-emerald-700 active:bg-emerald-50/50"
                >
                  <svg className="h-4 w-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.314c-.317-.159-.69-.159-1.006 0L3.622 5.75c-.381.19-.622.58-.622 1.006v11.494c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                  </svg>
                  <span>Pilih lokasi langsung di peta</span>
                </button>
              </footer>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

function TruthBadge({ status }: { status: VerificationStatus }) {
  if (status === "Terverifikasi") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500 bg-emerald-50/40 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-emerald-600">
        <svg className="h-2.5 w-2.5 shrink-0 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        <span>Terverifikasi</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md border border-slate-400 bg-slate-50/50 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-500">
      <span>Data terbatas</span>
    </span>
  );
}