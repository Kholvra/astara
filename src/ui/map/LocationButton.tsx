"use client";

import { useState } from "react";

type LocationState = "idle" | "requesting" | "resolved" | "denied";

export function LocationButton({
  onLocationResolved,
}: {
  onLocationResolved?: (coords: [number, number]) => void;
}) {
  const [status, setStatus] = useState<LocationState>("idle");

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }

    setStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        setStatus("resolved");
        onLocationResolved?.(coords);
      },
      (_error) => {
        setStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <button
      type="button"
      onClick={handleGetLocation}
      disabled={status === "requesting"}
      title={status === "denied" ? "Akses lokasi ditolak" : "Gunakan Lokasiku"}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50"
    >
      {status === "requesting" ? (
        <svg className="h-5 w-5 animate-spin text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" strokeOpacity="0.2" />
          <path d="M12 4v4m0 8v4M4 12h4m8 0h4" strokeLinecap="round" />
        </svg>
      ) : (
        /* Icon Crosshair */
        <svg className="h-5 w-5 text-slate-700" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
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
}