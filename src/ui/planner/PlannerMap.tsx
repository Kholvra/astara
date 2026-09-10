"use client";

import dynamic from "next/dynamic";

import type { AstaraMapProps } from "~/map/AstaraMap";

const AstaraMap = dynamic(
  () => import("~/map/AstaraMap").then((module) => module.AstaraMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-48 w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
        Memuat peta…
      </div>
    ),
  },
);

export const PlannerMap = (props: AstaraMapProps) => <AstaraMap {...props} />;
