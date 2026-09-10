"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { MOCK_SEARCH_ITEMS } from "~/core/search/mockSearchData";
import { resolveCurrentLocation } from "~/core/search/searchResolution";
import {
  type CurrentLocationReading,
  type RoutableLocation,
  type SearchContext,
  type SearchEndpointState,
} from "~/core/search/search.types";
import { assignSearchEndpoint } from "~/core/search/searchEndpoints";
import {
  createDefaultDepartAt,
  DEFAULT_SERVICE_TIMEZONE,
  type DepartAtValidation,
} from "~/core/timing/tripTiming";
import { Module1Explore } from "~/ui/explore/Module1Explore";
import { Module2Search } from "~/ui/explore/Module2Search";
import type { LocationRequestFailure } from "~/ui/map/locationReader";
import { TripTimingControls } from "~/ui/planner/TripTimingControls";

const AstaraMap = dynamic(
  () => import("~/map/AstaraMap").then((module) => module.AstaraMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
        Memuat peta…
      </div>
    ),
  },
);

type AppScreen = "explore" | "search";

export default function HomePage() {
  const [screen, setScreen] = useState<AppScreen>("explore");
  const [activeContext, setActiveContext] = useState<SearchContext>("origin");
  const [endpoints, setEndpoints] = useState<SearchEndpointState>({
    origin: null,
    destination: null,
  });
  const [initialSearchQuery, setInitialSearchQuery] = useState("");
  const [locationMessage, setLocationMessage] = useState<string | undefined>();
  const [timingValidation, setTimingValidation] =
    useState<DepartAtValidation | null>(null);
  const mapStyleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL;

  useEffect(() => {
    setTimingValidation(
      createDefaultDepartAt({ timezone: DEFAULT_SERVICE_TIMEZONE }),
    );
  }, []);

  const openSearch = (context: SearchContext, query = "") => {
    setActiveContext(context);
    setInitialSearchQuery(query);
    setLocationMessage(undefined);
    setScreen("search");
  };

  const handleSelectLocation = (
    context: SearchContext,
    location: RoutableLocation,
  ) => {
    setEndpoints((current) => assignSearchEndpoint(current, context, location));
    setActiveContext(otherContext(context));
    setInitialSearchQuery("");
    setLocationMessage(undefined);
    setScreen("explore");
  };

  const handleLocationResolved = (
    context: SearchContext,
    reading: CurrentLocationReading,
  ) => {
    const resolution = resolveCurrentLocation(reading, MOCK_SEARCH_ITEMS);
    if (resolution.state !== "selected") {
      setLocationMessage(resolution.message);
      return;
    }

    setEndpoints((current) =>
      assignSearchEndpoint(current, context, resolution.location),
    );
    setActiveContext(otherContext(context));
    setLocationMessage(
      resolution.distanceBasis === "straight_line_only"
        ? "Lokasi dipakai untuk endpoint ini. Perkiraan garis lurus; jalur jalan kaki belum diverifikasi."
        : "Lokasi dipakai untuk endpoint ini dengan jarak jalan kaki dari data pendukung.",
    );
  };

  const handleLocationError = (
    _context: SearchContext,
    _failure: LocationRequestFailure,
  ) => {
    setLocationMessage(
      "Lokasi tidak tersedia atau kurang presisi. Cari halte secara manual.",
    );
  };

  const timingControls = timingValidation ? (
    <TripTimingControls
      validation={timingValidation}
      serviceTimezone={DEFAULT_SERVICE_TIMEZONE}
      onValidationChange={(nextValidation) =>
        setTimingValidation(nextValidation)
      }
      onUseNow={() =>
        setTimingValidation(
          createDefaultDepartAt({ timezone: DEFAULT_SERVICE_TIMEZONE }),
        )
      }
    />
  ) : null;

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#FAFAFA] p-0 selection:bg-teal-100 sm:p-6">
      <div className="relative flex h-screen w-full flex-col overflow-hidden bg-white shadow-none sm:h-[min(900px,94vh)] sm:w-[393px] sm:rounded-[48px] sm:border-[0px] sm:border-slate-800/10 sm:shadow-[0_25px_60px_-15px_rgba(15,23,42,0.12),0_10px_20px_-5px_rgba(15,23,42,0.04)] sm:ring-8 sm:ring-slate-200/50">
        {screen === "explore" && (
          <Module1Explore
            activeContext={activeContext}
            destination={endpoints.destination}
            locationMessage={locationMessage}
            onLocateUser={handleLocationResolved}
            onLocationError={handleLocationError}
            onOpenSearch={openSearch}
            onSelectDestination={(query) => openSearch("destination", query)}
            origin={endpoints.origin}
            timingControls={timingControls}
          >
            <AstaraMap styleUrl={mapStyleUrl} />
          </Module1Explore>
        )}

        {screen === "search" && (
          <Module2Search
            context={activeContext}
            initialQuery={initialSearchQuery}
            onBack={() => setScreen("explore")}
            onSelectLocation={handleSelectLocation}
          />
        )}
      </div>
    </main>
  );
}

function otherContext(context: SearchContext): SearchContext {
  return context === "origin" ? "destination" : "origin";
}
