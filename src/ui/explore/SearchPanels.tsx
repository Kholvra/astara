"use client";

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
};

export const SearchOutcomePanel = ({
  outcome,
  onRetry,
  onSelect,
}: SearchOutcomePanelProps) => {
  if (outcome.state === "idle") {
    return (
      <div className="px-4 py-8 text-center text-sm leading-6 text-slate-500">
        Ketik nama halte, rute, atau tempat. Astara hanya mencari data lokal
        yang tersedia.
      </div>
    );
  }

  if (outcome.state === "index_unavailable") {
    return (
      <div className="space-y-3 px-4 py-5">
        <p className="text-sm leading-6 text-slate-700">
          Pencarian halte sedang tidak tersedia. Coba lagi atau pilih halte dari
          daftar.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          Coba lagi
        </button>
        <AlternativeList
          alternatives={outcome.alternatives}
          onSelect={onSelect}
        />
      </div>
    );
  }

  if (outcome.state === "no_result") {
    return (
      <div className="space-y-3 px-4 py-5">
        <p className="text-sm leading-6 text-slate-700">
          Tidak menemukan “{outcome.query}”. Coba nama halte atau rute lain.
        </p>
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
    <div>
      <p className="mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
        HALTE YANG BISA DIPILIH
      </p>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
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
  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="flex min-h-20 w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-emerald-50 focus-visible:outline-none"
      aria-label={`Kies ${result.title}`}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm text-emerald-700"
      >
        {result.type === "place_or_address" ? "⌖" : "↔"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-5 font-bold break-words text-slate-900">
          {result.title}
        </span>
        <span className="block text-xs leading-5 break-words text-slate-500">
          {getResultTypeLabel(result)}
          {result.subtitle ? ` • ${result.subtitle}` : ""}
        </span>
        <SearchTrustBlock
          source={result.source}
          confidence={result.confidence}
          verification={result.verification}
        />
      </span>
      <span className="mt-2 shrink-0 text-slate-400" aria-hidden="true">
        →
      </span>
    </button>
  );
};

type ConfirmationPanelProps = {
  pending: PendingSearchResolution;
  onCancel: () => void;
  onResolve: (resolution: SearchResolutionOutcome) => void;
};

export const ConfirmationPanel = ({
  pending,
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
                  resolveSearchSelection({
                    type: "select_platform",
                    item: pending.item,
                    platformId: platform.id,
                  }),
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
              resolveSearchSelection({
                type: "confirm_place_conversion",
                item: pending.item,
                stopId: pending.suggestedStop.id,
              }),
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
            resolveSearchSelection({
              type: "confirm_low_confidence",
              item: pending.item,
            }),
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
