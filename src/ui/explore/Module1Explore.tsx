"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  ArrowUpDown,
  ChevronRight,
  Landmark,
  RotateCcw,
  Search,
  ShoppingBag,
  Trophy,
  X,
} from "lucide-react";

import type {
  CurrentLocationReading,
  RoutableLocation,
  SearchContext,
} from "~/core/search/search.types";
import type { PlannerPlanSuccess } from "~/core/planner/plannerTypes";
import type { DepartAtInput, FareStatus } from "~/core/timing/tripTiming";
import { LocationButton } from "~/ui/map/LocationButton";
import type { LocationRequestFailure } from "~/ui/map/locationReader";
import { RouteSummarySheet } from "./RouteSummarySheet";

export type DestinationItem = {
  id: string;
  name: string;
  icon: ReactNode;
  query: string;
};

export const POPULAR_DESTINATIONS: readonly DestinationItem[] = [
  {
    id: "monas",
    name: "Monas",
    icon: <Landmark className="h-3.5 w-3.5 text-slate-700" />,
    query: "Monas",
  },
  {
    id: "gi",
    name: "Grand Indonesia",
    icon: <ShoppingBag className="h-3.5 w-3.5 text-slate-700" />,
    query: "Grand Indonesia",
  },
  {
    id: "gbk",
    name: "GBK",
    icon: <Trophy className="h-3.5 w-3.5 text-slate-700" />,
    query: "GBK",
  },
];

type Module1Props = {
  activeContext: SearchContext;
  destination?: RoutableLocation | null;
  locationMessage?: string;
  onDismissLocationMessage?: () => void;
  onLocateUser?: (
    context: SearchContext,
    reading: CurrentLocationReading,
  ) => void;
  onLocationError?: (
    context: SearchContext,
    failure: LocationRequestFailure,
  ) => void;
  locationRequestKey?: string;
  onOpenSearch: (context: SearchContext) => void;
  onSelectDestination: (query: string) => void;
  onPlan?: () => void;
  onReset?: () => void;
  onSwap?: () => void;
  origin?: RoutableLocation | null;
  planEnabled?: boolean;
  timingControls?: ReactNode;
  children?: ReactNode;
  route?: PlannerPlanSuccess | null;
  departAt?: DepartAtInput | null;
  fare?: FareStatus;
  stepsOpen?: boolean;
  onStepsToggle?: (open: boolean) => void;
  mapNotice?: string;
  onMapRetry?: () => void;
};

export const Module1Explore = ({
  activeContext,
  destination,
  locationMessage,
  onDismissLocationMessage,
  onLocateUser,
  onLocationError,
  locationRequestKey,
  onOpenSearch,
  onSelectDestination,
  onPlan: _onPlan,
  onReset,
  onSwap,
  origin,
  planEnabled = false,
  timingControls,
  children,
  route,
  departAt,
  fare,
  stepsOpen,
  onStepsToggle,
  mapNotice,
  onMapRetry,
}: Module1Props) => {
  const [localExpanded, setLocalExpanded] = useState(planEnabled);
  const isExpanded = stepsOpen ?? localExpanded;
  const dragStartYRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);
  const sheetContentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (planEnabled) {
      setLocalExpanded(true);
    }
  }, [planEnabled]);

  const handleToggle = (open?: boolean) => {
    const next = open ?? !isExpanded;
    if (!next && sheetContentRef.current) {
      sheetContentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    setLocalExpanded(next);
    onStepsToggle?.(next);
  };

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    dragStartYRef.current = e.clientY;
    dragMovedRef.current = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (dragStartYRef.current === null) return;
    const deltaY = e.clientY - dragStartYRef.current;
    if (Math.abs(deltaY) > 8) {
      dragMovedRef.current = true;
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (dragStartYRef.current === null) return;
    const deltaY = e.clientY - dragStartYRef.current;
    dragStartYRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (deltaY > 20) {
      handleToggle(false);
    } else if (deltaY < -20) {
      handleToggle(true);
    }

    if (dragMovedRef.current) {
      setTimeout(() => {
        dragMovedRef.current = false;
      }, 50);
    }
  };

  const handleClick = () => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    handleToggle();
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100 font-sans">
      <div className="absolute inset-0 z-0 h-full w-full">{children}</div>

      <header className="absolute top-4 right-0 left-0 z-20 px-4 sm:top-8">
        <div className="mx-auto max-w-lg">
          {!origin && !destination ? (
            <div className="relative">
              <span className="sr-only">RENCANA PERJALANAN</span>
              <button
                type="button"
                onClick={() => onOpenSearch("destination")}
                className="group flex min-h-[54px] w-full cursor-pointer items-center gap-3.5 rounded-full border border-slate-200/90 bg-white/95 px-4.5 py-2 text-left shadow-lg shadow-slate-900/5 backdrop-blur-md transition-all hover:border-emerald-300 hover:bg-white hover:shadow-xl active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                aria-label="Cari tujuan rute"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-105 group-hover:bg-emerald-100">
                  <Search className="h-4.5 w-4.5 stroke-[2.2]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-800 transition-colors group-hover:text-emerald-950">
                    Mau ke mana hari ini?
                  </span>
                  <span className="block text-xs text-slate-400 transition-colors group-hover:text-slate-500 truncate">
                    Ketik halte, stasiun, atau destinasi tujuan…
                  </span>
                </span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-600">
                  <ChevronRight className="h-4 w-4 stroke-[2.2]" />
                </span>
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-3.5 shadow-lg shadow-slate-900/5 backdrop-blur-md">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                  RENCANA PERJALANAN
                </span>
                {onReset && (origin || destination) ? (
                  <button
                    type="button"
                    onClick={onReset}
                    className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:scale-95"
                    title="Reset pilihan asal dan tujuan"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </button>
                ) : null}
              </div>
              <div className="relative grid gap-2">
                <div className="relative">
                  <EndpointField
                    context="origin"
                    location={origin}
                    active={activeContext === "origin"}
                    onClick={() => onOpenSearch("origin")}
                  />
                  {onSwap && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSwap();
                      }}
                      disabled={!origin && !destination}
                      aria-label="Tukar asal dan tujuan"
                      title="Tukar asal dan tujuan"
                      className="group absolute left-[28px] top-full z-10 mt-1 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-sm active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none after:absolute after:-inset-1.5 after:content-['']"
                    >
                      <ArrowUpDown className="h-3 w-3 transition-transform duration-300 group-hover:rotate-180" />
                    </button>
                  )}
                </div>
                <div>
                  <EndpointField
                    context="destination"
                    location={destination}
                    active={activeContext === "destination"}
                    onClick={() => onOpenSearch("destination")}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <div
        id="explore-bottom-sheet-container"
        className={`absolute right-0 bottom-0 left-0 z-30 flex flex-col transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[calc(100%-236px)]" : "max-h-[220px]"
        }`}
      >
        <div className="relative w-full">
          <div className="absolute right-4 -top-14 z-30">
            <LocationButton
              context={activeContext}
              requestKey={locationRequestKey}
              onLocationResolved={onLocateUser}
              onLocationError={onLocationError}
            />
          </div>
        </div>

        <section
          ref={sheetContentRef}
          id="explore-bottom-sheet"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-t-[32px] border-t border-slate-100 bg-white px-5 pt-2.5 pb-6 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] [scrollbar-width:none] [-ms-overflow-style:none] sm:pb-8 [&::-webkit-scrollbar]:hidden"
        >
          <button
            type="button"
            id="explore-bottom-sheet-handle"
            aria-expanded={isExpanded}
            aria-controls="explore-bottom-sheet"
            aria-label={
              isExpanded
                ? "Tutup rencana perjalanan"
                : "Buka rencana perjalanan"
            }
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={handleClick}
            className="group mx-auto -mt-1 mb-2.5 flex h-7 w-full cursor-grab touch-none items-center justify-center rounded-full active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <span className="h-1.5 w-12 rounded-full bg-slate-300 transition-colors group-hover:bg-slate-400 group-active:bg-slate-500" />
          </button>

          {route ? (
            <RouteSummarySheet
              route={route}
              departAt={departAt}
              fare={fare}
              stepsOpen={isExpanded}
              onStepsToggle={handleToggle}
              mapNotice={mapNotice}
              onMapRetry={onMapRetry}
            />
          ) : (
            <>
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
                    className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-xs transition-all hover:border-emerald-300 hover:bg-emerald-50/40 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-95"
                  >
                    <span aria-hidden="true">{destinationItem.icon}</span>
                    <span>{destinationItem.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {locationMessage && (
            <div
              className="mb-3 flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 text-amber-900 transition-all"
              role="status"
              aria-live="polite"
            >
              <span className="mt-0.5 shrink-0" aria-hidden="true">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </span>
              <p className="min-w-0 flex-1 text-xs leading-5 font-medium">
                {locationMessage}
              </p>
              {onDismissLocationMessage && (
                <button
                  type="button"
                  onClick={onDismissLocationMessage}
                  className="shrink-0 -mr-1 -mt-0.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-700 active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                  aria-label="Tutup pesan"
                >
                  <X className="h-3.5 w-3.5 stroke-[2.2]" />
                </button>
              )}
            </div>
          )}

          <div
            className={`grid transition-all duration-300 ease-in-out ${
              isExpanded
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0 pointer-events-none"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              {timingControls && !route ? (
                <div className="mt-1">{timingControls}</div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
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
      id={`planner-${context}-field`}
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${location?.name ?? placeholder}`}
      className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${active ? "border-emerald-400 bg-emerald-50/60" : "border-slate-200 bg-white hover:border-emerald-200"}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${context === "origin" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
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
        {!location && (
          <span className="block text-[11px] leading-4 text-slate-400">
            Cari halte, rute, atau tempat
          </span>
        )}
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-slate-400"
        aria-hidden="true"
      />
    </button>
  );
};
