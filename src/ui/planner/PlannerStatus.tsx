import { Loader2 } from "lucide-react";

import type {
  PlannerState,
  PlannerStateSnapshot,
} from "~/core/planner/plannerTypes";

export type PlannerStatusProps = Readonly<{
  snapshot: PlannerStateSnapshot;
  onPrimaryAction?: () => void;
  onReset?: () => void;
}>;

const STATE_LABELS: Readonly<Record<PlannerState, string>> = {
  idle: "Mulai perjalanan",
  select: "Pilih lokasi",
  ready: "Siap dihitung",
  loading: "Menghitung rute",
  result: "Rute tersedia",
  detail: "Detail perjalanan",
  "no-route": "Tidak ada rute",
  error: "Perlu dicoba lagi",
  "stale-data": "Data terbatas",
  "map-failure": "Peta bermasalah",
};

export const PlannerStatus = ({
  snapshot,
  onPrimaryAction,
  onReset,
}: PlannerStatusProps) => {
  const primaryLabel = getPrimaryLabel(snapshot);
  const detail = getStatusMessage(snapshot);
  const showPrimary = Boolean(primaryLabel && onPrimaryAction);
  const showReset = Boolean(onReset && snapshot.state !== "idle");

  return (
    <section
      data-planner-state={snapshot.state}
      aria-labelledby="planner-status-heading"
      className="min-w-0 px-1 py-1"
    >
      <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase">
        STATUS PERJALANAN
      </p>
      <h2
        id="planner-status-heading"
        tabIndex={-1}
        className="mt-1 flex items-center gap-2 text-base font-bold break-words text-slate-900"
      >
        {snapshot.state === "loading" && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-600" />
        )}
        <span>{STATE_LABELS[snapshot.state]}</span>
      </h2>
      <p
        role="status"
        aria-live="polite"
        className="mt-0.5 text-xs leading-5 break-words text-slate-600"
      >
        {detail}
      </p>
      {(showPrimary || showReset) && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          {showPrimary && (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="min-h-11 w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto"
            >
              {primaryLabel}
            </button>
          )}
          {showReset && (
            <button
              type="button"
              onClick={onReset}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </section>
  );
};

function getPrimaryLabel(snapshot: PlannerStateSnapshot): string | undefined {
  if (
    snapshot.state === "idle" ||
    snapshot.state === "loading" ||
    snapshot.state === "ready"
  ) {
    return undefined;
  }
  if (snapshot.state === "error" || snapshot.state === "stale-data") {
    return snapshot.retryAvailable ? "Coba lagi" : "Ubah pilihan";
  }
  if (snapshot.state === "no-route") return "Ubah pilihan";
  return undefined;
}

function getStatusMessage(snapshot: PlannerStateSnapshot): string {
  if (snapshot.message) return snapshot.message;
  switch (snapshot.state) {
    case "idle":
      return "Tentukan asal dan tujuan untuk mulai.";
    case "select":
      return snapshot.catalog
        ? "Pilih asal dan tujuan untuk melihat rute."
        : "Menyiapkan data halte lokal…";
    case "ready":
      return "Asal, tujuan, dan waktu sudah siap.";
    case "loading":
      return "Mencari perjalanan terbaik untuk Anda…";
    case "no-route":
      return "Tidak ada perjalanan yang cocok pada input ini.";
    case "error":
      return "Terjadi kendala saat menghitung rute.";
    case "stale-data":
      return "Data transit belum cukup atau sudah tidak dapat dipakai.";
    case "result":
      return "Rute siap diikuti dengan instruksi berurutan.";
    case "detail":
      return "Detail rute tetap menggunakan pilihan yang sama.";
    case "map-failure":
      return "Instruksi rute tetap tersedia meski peta bermasalah.";
  }
}
