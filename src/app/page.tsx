"use client";

import { useState } from "react";

import { MOCK_SEARCH_ITEMS } from "~/core/search/mockSearchData";
import { type SearchResultItem } from "~/core/search/search.types";
import { AstaraMap } from "~/map/AstaraMap";
import { Module1Explore } from "~/ui/explore/home";
import { Module2Search } from "~/ui/explore/search";

type AppScreen = "explore" | "search";

export default function HomePage() {
  const [screen, setScreen] = useState<AppScreen>("explore");
  const [selectedLocation, setSelectedLocation] = useState<SearchResultItem | null>(
    MOCK_SEARCH_ITEMS[0] ?? null,
  );
  const [initialSearchQuery, setInitialSearchQuery] = useState("");
  const mapStyleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL;

  const handleSelectFromSearch = (item: SearchResultItem) => {
    setSelectedLocation(item);
    setScreen("explore");
  };

  const handleDestinationChipClick = (query: string) => {
    setInitialSearchQuery(query);
    setScreen("search");
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#FAFAFA] p-0 selection:bg-teal-100 sm:p-6">
      <div className="relative flex h-screen w-full flex-col overflow-hidden bg-white shadow-none sm:h-[min(900px,94vh)] sm:w-[393px] sm:rounded-[48px] sm:border-[0px] sm:border-slate-800/10 sm:ring-8 sm:ring-slate-200/50 sm:shadow-[0_25px_60px_-15px_rgba(15,23,42,0.12),0_10px_20px_-5px_rgba(15,23,42,0.04)]">
        {screen === "explore" && (
          <Module1Explore
            onOpenSearch={() => {
              setInitialSearchQuery("");
              setScreen("search");
            }}
            onSelectDestination={handleDestinationChipClick}
            onViewRoute={() => setScreen("search")}
            selectedStop={selectedLocation}
          >
            <AstaraMap styleUrl={mapStyleUrl} />
          </Module1Explore>
        )}

        {screen === "search" && (
          <Module2Search
            onBack={() => setScreen("explore")}
            onSelectResult={handleSelectFromSearch}
            initialQuery={initialSearchQuery}
          >
            <AstaraMap styleUrl={mapStyleUrl} />
          </Module2Search>
        )}
      </div>
    </main>
  );
}
