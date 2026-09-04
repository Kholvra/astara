"use client";

import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

const JAKARTA_CENTER: [number, number] = [106.827, -6.175];

type MapStatus = "unconfigured" | "loading" | "ready" | "error";

export type AstaraMapProps = {
  styleUrl?: string;
};

export function AstaraMap({ styleUrl }: AstaraMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<MapStatus>(
    styleUrl ? "loading" : "unconfigured",
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!styleUrl || !container) {
      setStatus("unconfigured");
      return;
    }

    setStatus("loading");
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

    const map = new MapLibreMap({
      container,
      style: styleUrl,
      center: JAKARTA_CENTER,
      zoom: 11,
    });

    const handleLoad = () => setStatus("ready");
    const handleError = () => setStatus("error");

    map.once("load", handleLoad);
    map.on("error", handleError);

    return () => {
      map.off("error", handleError);
      map.remove();
    };
  }, [styleUrl]);

  const statusMessage = {
    unconfigured: "Peta belum dikonfigurasi pada bootstrap ini.",
    loading: "Memuat peta…",
    error: "Peta tidak dapat dimuat. Instruksi rute tetap dapat digunakan.",
    ready: "",
  }[status];

  return (
    <section aria-label="Peta Astara" className="space-y-3">
      <div className="relative h-72 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
        <div
          ref={containerRef}
          className={status === "unconfigured" ? "hidden" : "h-full w-full"}
        />
        {status !== "ready" && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex items-center justify-center bg-slate-100/95 px-6 text-center text-sm text-slate-600"
          >
            {statusMessage}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Peta adalah pendamping visual. Ikuti route card untuk langkah
        perjalanan.
      </p>
    </section>
  );
}
