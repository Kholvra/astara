"use client";

import {
  BusFront,
  ChevronRight,
  Compass,
  Landmark,
  MapPin,
  Search,
  Trophy,
} from "lucide-react";

import { resolveSearchSelection } from "./searchSelectionController";
import { SearchTrustBlock } from "./SearchTrustBlock";
import type {
  RankedSearchResult,
  SearchQueryOutcome,
  SearchResolutionOutcome,
  SearchResultItem,
} from "~/core/search/search.types";

export type PendingSearchResolution = Extract<
  SearchResolutionOutcome,
  | { state: "platform_confirmation" }
  | { state: "place_conversion_required" }
  | { state: "low_confidence_confirmation" }
>;

export type SearchOutcomePanelProps = {
  outcome: SearchQueryOutcome;
  onRetry: () => void;
  onSelect: (item: SearchResultItem) => void;
  onQuickSelect?: (query: string) => void;
};

const QUICK_SUGGESTIONS = [
  {
    id: "monas",
    name: "Monas",
    query: "Monas",
    subtitle: "Halte BRT Koridor 1 & 2",
    icon: <Landmark className="h-4 w-4 text-emerald-700" />,
  },
  {
    id: "blok-m",
    name: "Blok M",
    query: "Blok M",
    subtitle: "Terminal & Integrasi MRT",
    icon: <BusFront className="h-4 w-4 text-emerald-700" />,
  },
  {
    id: "bundaran-hi",
    name: "Bundaran HI",
    query: "Bundaran HI",
    subtitle: "Halte Ikonik Koridor 1",
    icon: <Compass className="h-4 w-4 text-emerald-700" />,
  },
  {
    id: "gbk",
    name: "Gelora Bung Karno",
    query: "GBK",
    subtitle: "Halte Koridor 1",
    icon: <Trophy className="h-4 w-4 text-emerald-700" />,
  },
] as const;

export const SearchOutcomePanel = ({
  outcome,
  onRetry,
  onSelect,
  onQuickSelect,
}: SearchOutcomePanelProps) => {
  if (outcome.state === "idle") {
    return (
      <div className="px-4 pt-4 pb-6">
        <div className="mb-2.5 px-1 text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
          PILIHAN CEPAT
        </div>
        <div className="grid gap-2">
          {QUICK_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => onQuickSelect?.(suggestion.query)}
              className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200/60 bg-white"
              >
                {suggestion.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-5 font-bold text-slate-900">
                  {suggestion.name}
                </span>
                <span className="block text-xs leading-4 text-slate-500">
                  {suggestion.subtitle}
                </span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-slate-400"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 text-center">
          <p className="text-xs leading-5 text-slate-500">
            Ketik nama halte, rute, atau tempat. Astara mencari langsung dari data TransJakarta lokal.
          </p>
        </div>
      </div>
    );
  }

  if (outcome.state === "index_unavailable") {
    return (
      <div className="pb-6">
        <div className="space-y-3 px-4 py-6 text-center">
          <p className="text-sm font-semibold text-slate-800">
            Pencarian halte sedang tidak tersedia
          </p>
          <p className="text-xs text-slate-500">
            Coba lagi atau pilih halte dari daftar alternatif di bawah.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Coba lagi
          </button>
        </div>
        <AlternativeList
          alternatives={outcome.alternatives}
          onSelect={onSelect}
        />
      </div>
    );
  }

  if (outcome.state === "no_result") {
    return (
      <div className="pb-6">
        <div className="px-4 py-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Search className="h-5 w-5 stroke-[2.2]" />
          </div>
          <p className="text-sm font-bold text-slate-800">
            Tidak menemukan “{outcome.query}”
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Coba gunakan nama halte atau nomor koridor lain di sekitar.
          </p>
        </div>
        <AlternativeList
          alternatives={outcome.alternatives}
          onSelect={onSelect}
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {outcome.results.map((result) => (
        <SearchResultButton
          key={result.id}
          result={result}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

type AlternativeListProps = {
  alternatives: readonly SearchResultItem[];
  onSelect: (item: SearchResultItem) => void;
};

const AlternativeList = ({ alternatives, onSelect }: AlternativeListProps) => {
  if (alternatives.length === 0) return null;

  return (
    <div className="pt-2">
      <div className="border-y border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
        HALTE YANG BISA DIPILIH
      </div>
      <div className="divide-y divide-slate-100">
        {alternatives.map((item) => (
          <SearchResultButton key={item.id} result={item} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
};

type SearchResultButtonProps = {
  result: SearchResultItem | RankedSearchResult;
  onSelect: (item: SearchResultItem) => void;
};

const SearchResultButton = ({ result, onSelect }: SearchResultButtonProps) => {
  const isPlace = result.type === "place_or_address";

  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-emerald-50 focus-visible:outline-none"
      aria-label={`Pilih ${result.title}`}
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"
      >
        {isPlace ? (
          <MapPin className="h-4 w-4" />
        ) : (
          <BusFront className="h-4 w-4" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-5 font-bold break-words text-slate-900">
          {result.title}
        </span>
        <span className="block text-xs leading-4 break-words text-slate-500">
          {getResultTypeLabel(result)}
          {result.subtitle ? ` • ${result.subtitle}` : ""}
        </span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-slate-400"
        aria-hidden="true"
      />
    </button>
  );
};

type ConfirmationPanelProps = {
  pending: PendingSearchResolution;
  catalog?: readonly SearchResultItem[];
  onCancel: () => void;
  onResolve: (resolution: SearchResolutionOutcome) => void;
};

export const ConfirmationPanel = ({
  pending,
  catalog,
  onCancel,
  onResolve,
}: ConfirmationPanelProps) => {
  if (pending.state === "platform_confirmation") {
    return (
      <div className="space-y-4 px-4 py-5">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            KONFIRMASI PERON
          </p>
          <h2 className="mt-1 text-base leading-6 font-bold break-words text-slate-900">
            Pilih arah peron sebelum melanjutkan.
          </h2>
          <p className="mt-1 text-sm leading-5 break-words text-slate-600">
            {pending.item.title}
          </p>
        </div>
        <div className="grid gap-2">
          {pending.item.platforms?.map((platform) => (
            <button
              key={platform.id}
              type="button"
              onClick={() =>
                onResolve(
                  resolveSearchSelection(
                    {
                      type: "select_platform",
                      item: pending.item,
                      platformId: platform.id,
                    },
                    catalog,
                  ),
                )
              }
              className="min-h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:border-emerald-300 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <span className="block break-words">{platform.label}</span>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Kode peron: {platform.code}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          Pilih hasil lain
        </button>
      </div>
    );
  }

  if (pending.state === "place_conversion_required") {
    const walkingCopy =
      pending.walkingEvidence === "supported"
        ? "Jarak memakai data jalan kaki pendukung."
        : "Perkiraan garis lurus; jalur jalan kaki belum diverifikasi.";

    return (
      <div className="space-y-4 px-4 py-5">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            KONFIRMASI TEMPAT
          </p>
          <h2 className="mt-1 text-base leading-6 font-bold break-words text-slate-900">
            Gunakan halte terdekat untuk rute?
          </h2>
          <p className="mt-1 text-sm leading-5 break-words text-slate-600">
            {pending.item.title}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-bold break-words text-slate-900">
            {pending.suggestedStop.title}
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            Sekitar {Math.round(pending.distanceMeters)} m. {walkingCopy}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onResolve(
              resolveSearchSelection(
                {
                  type: "confirm_place_conversion",
                  item: pending.item,
                  stopId: pending.suggestedStop.id,
                },
                catalog,
              ),
            )
          }
          className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          Gunakan halte ini
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          Pilih hasil lain
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-5">
      <div>
        <p className="text-[11px] font-bold tracking-wider text-amber-700 uppercase">
          PERLU DICEK
        </p>
        <h2 className="mt-1 text-base leading-6 font-bold break-words text-slate-900">
          Kecocokan ini rendah. Pastikan halte yang dipilih sudah benar.
        </h2>
        <p className="mt-1 text-sm leading-5 break-words text-slate-600">
          {pending.item.title}
        </p>
      </div>
      <SearchTrustBlock
        source={pending.item.source}
        confidence={pending.item.confidence}
        verification={pending.item.verification}
      />
      <button
        type="button"
        onClick={() =>
          onResolve(
            resolveSearchSelection(
              {
                type: "confirm_low_confidence",
                item: pending.item,
              },
              catalog,
            ),
          )
        }
        className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        Gunakan lokasi ini
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        Pilih hasil lain
      </button>
    </div>
  );
};

function getResultTypeLabel(result: SearchResultItem): string {
  return result.type === "place_or_address"
    ? "Tempat / alamat"
    : "Halte / rute";
}

export function getOutcomeMessage(
  outcome: SearchQueryOutcome,
  pending: SearchResolutionOutcome | null,
  selectionMessage: string | null,
): string {
  if (selectionMessage) return selectionMessage;
  if (pending?.state === "platform_confirmation") {
    return "Arah peron dapat mengubah rute. Pilih salah satu sebelum melanjutkan.";
  }
  if (pending?.state === "place_conversion_required") {
    return "Tempat belum menjadi halte. Konfirmasi halte lokal yang disarankan.";
  }
  if (pending?.state === "low_confidence_confirmation") {
    return "Konfirmasi diperlukan karena kecocokan lokasi ini rendah.";
  }
  if (outcome.state === "results") {
    return `${outcome.results.length} hasil lokal ditemukan.`;
  }
  if (outcome.state === "index_unavailable") {
    return "Pencarian lokal perlu dicoba lagi.";
  }
  if (outcome.state === "no_result") {
    return "Tidak ada hasil lokal yang cocok.";
  }
  return "Pencarian belum dimulai.";
}
