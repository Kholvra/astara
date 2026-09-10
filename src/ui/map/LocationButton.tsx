"use client";

import { useEffect, useRef, useState } from "react";

import type {
  CurrentLocationReading,
  SearchContext,
} from "~/core/search/search.types";
import {
  createLocationRequestController,
  type LocationRequestController,
  type LocationRequestFailure,
} from "./locationReader";

type LocationState = "idle" | "requesting" | "resolved" | "error";

export type LocationButtonProps = {
  context: SearchContext;
  onLocationResolved?: (
    context: SearchContext,
    reading: CurrentLocationReading,
  ) => void;
  onLocationError?: (
    context: SearchContext,
    failure: LocationRequestFailure,
  ) => void;
};

export const LocationButton = ({
  context,
  onLocationResolved,
  onLocationError,
}: LocationButtonProps) => {
  const [status, setStatus] = useState<LocationState>("idle");
  const controllerRef = useRef<LocationRequestController | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    controllerRef.current = createLocationRequestController(
      typeof navigator === "undefined" ? undefined : navigator.geolocation,
    );

    return () => {
      mountedRef.current = false;
      controllerRef.current?.cancel();
    };
  }, []);

  const handleGetLocation = () => {
    const controller =
      controllerRef.current ??
      createLocationRequestController(
        typeof navigator === "undefined" ? undefined : navigator.geolocation,
      );
    controllerRef.current = controller;
    setStatus("requesting");

    controller.start(
      context,
      (resolvedContext, reading) => {
        if (!mountedRef.current) return;
        setStatus("resolved");
        onLocationResolved?.(resolvedContext, reading);
      },
      (failedContext, failure) => {
        if (!mountedRef.current) return;
        setStatus("error");
        onLocationError?.(failedContext, failure);
      },
    );
  };

  const label = getLocationLabel(status, context);

  return (
    <button
      type="button"
      onClick={handleGetLocation}
      disabled={status === "requesting"}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-95 disabled:opacity-50"
    >
      {status === "requesting" ? (
        <svg
          className="h-5 w-5 animate-spin text-emerald-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="8" strokeOpacity="0.2" />
          <path d="M12 4v4m0 8v4M4 12h4m8 0h4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg
          className="h-5 w-5 text-slate-700"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="7" />
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      )}
    </button>
  );
};

function getLocationLabel(
  status: LocationState,
  context: SearchContext,
): string {
  if (status === "requesting") return "Mencari lokasi…";
  if (status === "error") return "Lokasi tidak tersedia. Coba lagi";
  if (status === "resolved")
    return `Lokasiku dipakai untuk ${getContextLabel(context)}`;
  return `Gunakan Lokasiku sebagai ${getContextLabel(context)}`;
}

function getContextLabel(context: SearchContext): string {
  return context === "origin" ? "asal" : "tujuan";
}
