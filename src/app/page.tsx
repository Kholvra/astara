"use client";

import { Planner } from "~/ui/planner/Planner";

export default function HomePage() {
  const mapStyleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL;

  return (
    <main className="flex h-dvh w-full items-center justify-center overflow-hidden bg-[#FAFAFA] p-0 selection:bg-teal-100 sm:p-6">
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-white shadow-none sm:h-[min(900px,94vh)] sm:w-[393px] sm:rounded-[48px] sm:shadow-[0_25px_60px_-15px_rgba(15,23,42,0.12),0_10px_20px_-5px_rgba(15,23,42,0.04)] sm:ring-8 sm:ring-slate-200/50">
        <Planner mapStyleUrl={mapStyleUrl} />
      </div>
    </main>
  );
}
