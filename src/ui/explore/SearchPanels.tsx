"use client";

import {
  BusFront,
  ChevronRight,
  Compass,
  Info,
  Landmark,
  MapPin,
  RotateCcw,
  Route,
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
    tag: "BRT",
    icon: <Landmark className="h-4.5 w-4.5 text-emerald-700" />,
  },
  {
    id: "blok-m",
    name: "Blok M",
    query: "Blok M",
    subtitle: "Terminal & Integrasi MRT",
    tag: "Hub MRT",
    icon: <BusFront className="h-4.5 w-4.5 text-emerald-700" />,
  },
  {
    id: "bundaran-hi",
    name: "Bundaran HI",
    query: "Bundaran HI",
    subtitle: "Halte Ikonik Koridor 1",
    tag: "BRT",
    icon: <Compass className="h-4.5 w-4.5 text-emerald-700" />,
  },
  {
    id: "gbk",
    name: "Gelora Bung Karno",
    query: "GBK",
    subtitle: "Halte Koridor 1",
    tag: "BRT",
    icon: <Trophy className="h-4.5 w-4.5 text-emerald-700" />,
  },
] as const;

const QUICK_CORRIDORS = [
  { id: "k1", label: "Koridor 1", desc: "Blok M – Kota", query: "Koridor 1" },
  { id: "k2", label: "Koridor 2", desc: "Pulo Gadung – Monas", query: "Koridor 2" },
  { id: "k6", label: "Koridor 6", desc: "Ragunan – Galunggung", query: "Koridor 6" },
  { id: "k9", label: "Koridor 9", desc: "Pinang Ranti – Pluit", query: "Koridor 9" },
] as const;

export const SearchOutcomePanel = ({
  outcome,
  onRetry,
  onSelect,
  onQuickSelect,
}: SearchOutcomePanelProps) => {
  if (outcome.state === "idle") {
    return (
      <div className="space-y-6 px-4 pt-3 pb-6">
        <div>
          <div className="mb-2.5 flex items-center justify-between px-1">
            <span className="text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
              PILIHAN CEPAT
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Halte & Hub Populer
            </span>
          </div>
          <div className="grid gap-2">
            {QUICK_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => onQuickSelect?.(suggestion.query)}
                className="group flex min-h-[58px] w-full cursor-pointer items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-left shadow-2xs transition-all hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:scale-[0.99]"
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-800"
                >
                  {suggestion.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm leading-5 font-bold text-slate-900 group-hover:text-emerald-950">
                      {suggestion.name}
                    </span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 group-hover:bg-emerald-100/70 group-hover:text-emerald-800">
                      {suggestion.tag}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs leading-4 text-slate-500">
                    {suggestion.subtitle}
                  </span>
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2.5 px-1 text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
            JELAJAH KORIDOR UTAMA
          </div>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_CORRIDORS.map((corridor) => (
              <button
                key={corridor.id}
                type="button"
                onClick={() => onQuickSelect?.(corridor.query)}
                className="group flex flex-col items-start rounded-2xl border border-slate-200/80 bg-white p-3 text-left shadow-2xs transition-all hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:scale-[0.98]"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                  <Route className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{corridor.label}</span>
                </div>
                <span className="mt-1 w-full truncate text-[11px] text-slate-500">
                  {corridor.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 text-slate-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p className="text-xs leading-relaxed">
            Ketik nama halte BRT, stasiun integrasi (MRT/KRL/LRT), atau nomor koridor untuk langsung melihat rute transit.
          </p>
        </div>
      </div>
    );
  }

  if (outcome.state === "index_unavailable") {
    const hasAlternatives = outcome.alternatives.length > 0;

    return (
      <div className="pb-6">
        <div className="flex flex-col items-center px-4 py-8 text-center sm:py-10">
          <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-500 shadow-2xs">
            <BusFront className="h-6 w-6 stroke-[1.8] text-slate-600" />
          </div>

          <h3 className="text-sm font-bold text-slate-900 sm:text-base">
            Pencarian halte sedang tidak tersedia
          </h3>

          <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
            {hasAlternatives
              ? "Coba lagi atau pilih halte dari daftar alternatif di bawah."
              : "Indeks data transit belum siap. Silakan coba muat ulang."}
          </p>

          <div className="mt-4">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-800 shadow-2xs transition-all hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Coba lagi</span>
            </button>
          </div>
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
    <div className="px-4 pt-4 pb-6">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <span className="text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
          HASIL PENCARIAN
        </span>
        <span className="text-[11px] font-semibold text-slate-400">
          {outcome.results.length} ditemukan
        </span>
      </div>
      <div className="grid gap-2">
        {outcome.results.map((result) => (
          <SearchResultButton
            key={result.id}
            result={result}
            onSelect={onSelect}
          />
        ))}
      </div>
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
    <div className="px-4 pt-2 pb-6">
      <div className="mb-2.5 px-1 text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
        HALTE ALTERNATIF
      </div>
      <div className="grid gap-2">
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
      className="group flex min-h-[58px] w-full cursor-pointer items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-left shadow-2xs transition-all hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:scale-[0.99]"
      aria-label={`Pilih ${result.title}`}
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-800"
      >
        {isPlace ? (
          <MapPin className="h-4.5 w-4.5 text-amber-600" />
        ) : (
          <BusFront className="h-4.5 w-4.5 text-emerald-700" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-5 font-bold break-words text-slate-900 group-hover:text-emerald-950">
          {result.title}
        </span>
        <span className="mt-0.5 block text-xs leading-4 break-words text-slate-500">
          {getResultTypeLabel(result)}
          {result.subtitle ? ` • ${result.subtitle}` : ""}
        </span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600"
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
              className="min-h-14 w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left text-sm font-semibold text-slate-800 transition-all hover:border-emerald-300 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99]"
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
          className="min-h-11 w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99]"
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
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
          <p className="text-sm font-bold break-words text-slate-900">
            {pending.suggestedStop.title}
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            Sekitar {Math.round(pending.distanceMeters)} m. {walkingCopy}
          </p>
        </div>
        <div className="grid gap-2">
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
            className="min-h-11 w-full cursor-pointer rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-2xs transition-all hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            Gunakan halte ini
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            Pilih hasil lain
          </button>
        </div>
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
      <div className="grid gap-2">
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
          className="min-h-11 w-full cursor-pointer rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-2xs transition-all hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99]"
        >
          Gunakan lokasi ini
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99]"
        >
          Pilih hasil lain
        </button>
      </div>
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
    return "Tempat belum menjadi halte. Konfirmasi halte yang disarankan.";
  }
  if (pending?.state === "low_confidence_confirmation") {
    return "Konfirmasi diperlukan karena kecocokan lokasi ini rendah.";
  }
  if (outcome.state === "results") {
    return `${outcome.results.length} hasil ditemukan.`;
  }
  if (outcome.state === "index_unavailable") {
    return "Pencarian perlu dicoba lagi.";
  }
  if (outcome.state === "no_result") {
    return "Tidak ada hasil yang cocok.";
  }
  return "Pencarian belum dimulai.";
}
