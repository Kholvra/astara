"use client";

import { useRef } from "react";

import {
  DEFAULT_SERVICE_TIMEZONE,
  normalizeDepartAt,
  type DepartAtDraft,
  type DepartAtValidation,
  type ServiceAvailability,
} from "~/core/timing/tripTiming";

export interface TripTimingControlsProps {
  validation: DepartAtValidation;
  serviceTimezone?: string;
  serviceAvailability?: ServiceAvailability;
  onValidationChange: (validation: DepartAtValidation) => void;
  onUseNow: () => void;
}

export const TripTimingControls = ({
  validation,
  serviceTimezone = DEFAULT_SERVICE_TIMEZONE,
  serviceAvailability = "available",
  onValidationChange,
  onUseNow,
}: TripTimingControlsProps) => {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const selectedValue = getSelectedValue(validation.draft);

  const handleFieldChange = (field: DepartAtField, value: string) => {
    const draft = updateDraft(validation.draft, field, value);
    onValidationChange(
      normalizeDepartAt({
        draft,
        timezone: serviceTimezone,
        serviceAvailability,
      }),
    );
  };

  const handleCorrection = () => {
    if (validation.state === "invalid" || validation.state === "past") {
      onUseNow();
      return;
    }

    dateInputRef.current?.focus();
  };

  return (
    <section
      aria-labelledby="trip-timing-heading"
      className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-4"
    >
      <div>
        <h2
          id="trip-timing-heading"
          className="text-sm font-bold text-slate-900"
        >
          Atur waktu berangkat
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Pilih waktu lokal yang akan dipakai untuk menghitung rute.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3">
        <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
          Tanggal berangkat
          <input
            ref={dateInputRef}
            type="date"
            value={validation.draft.localDate}
            onChange={(event) =>
              handleFieldChange("localDate", event.currentTarget.value)
            }
            className="min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            aria-label="Tanggal berangkat"
          />
        </label>

        <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
          Waktu berangkat
          <input
            type="time"
            value={validation.draft.localTime}
            onChange={(event) =>
              handleFieldChange("localTime", event.currentTarget.value)
            }
            className="min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            aria-label="Waktu berangkat"
          />
        </label>
      </div>

      <p className="text-xs font-semibold break-words text-slate-700">
        Dipilih: <span className="text-slate-900">{selectedValue}</span>
      </p>

      {validation.state === "valid" ? (
        <p role="status" aria-live="polite" className="text-xs text-slate-500">
          Waktu lokal: {serviceTimezone}. Rute akan dihitung untuk waktu ini.
        </p>
      ) : (
        <div
          role="alert"
          aria-live="polite"
          className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3"
        >
          <p className="text-xs leading-relaxed font-medium text-amber-900">
            {validation.message}
          </p>
          <button
            type="button"
            onClick={handleCorrection}
            className="min-h-12 w-full rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-200 focus:outline-none active:scale-[0.99]"
          >
            {validation.correction}
          </button>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-slate-400">
        Semua jadwal mengikuti zona waktu {serviceTimezone}.
      </p>
    </section>
  );
};

type DepartAtField = keyof DepartAtDraft;

function updateDraft(
  draft: DepartAtDraft,
  field: DepartAtField,
  value: string,
): DepartAtDraft {
  if (field === "localDate") {
    return { localDate: value, localTime: draft.localTime };
  }

  return { localDate: draft.localDate, localTime: value };
}

function getSelectedValue(draft: DepartAtDraft): string {
  if (!draft.localDate || !draft.localTime) {
    return "Belum tersedia";
  }

  return `${draft.localDate} • ${draft.localTime}`;
}
