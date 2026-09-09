import { AstaraMap } from "~/map/AstaraMap";

export type AstaraHomePageProps = {
  mapStyleUrl?: string;
};

export function AstaraHomePage({ mapStyleUrl }: AstaraHomePageProps) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-semibold tracking-[0.2em] text-indigo-700">
              ASTARA
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              Rute TransJakarta yang mudah diikuti.
            </h1>
            <p className="text-base leading-7 text-slate-600 sm:text-lg">
              Masukkan tujuan dan dapatkan langkah perjalanan yang jelas, dari
              halte sampai tujuan akhir.
            </p>
          </div>

        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 space-y-1">
                <p className="text-sm font-semibold text-indigo-700">
                  Perjalanan
                </p>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Mau ke mana?
                </h2>
              </div>

              <div className="space-y-4">
                <label className="block space-y-2" htmlFor="origin">
                  <span className="text-sm font-medium text-slate-700">
                    Berangkat dari
                  </span>
                  <input
                    id="origin"
                    type="text"
                    disabled
                    placeholder="Cari halte atau lokasi"
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-base text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </label>

                <label className="block space-y-2" htmlFor="destination">
                  <span className="text-sm font-medium text-slate-700">
                    Tujuan
                  </span>
                  <input
                    id="destination"
                    type="text"
                    disabled
                    placeholder="Cari halte atau lokasi"
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-base text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </label>

                <button
                  type="button"
                  disabled
                  className="min-h-12 w-full rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white opacity-50"
                >
                  Cari rute
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 sm:p-6">
              <p className="text-sm font-semibold text-indigo-700">
                Rute utama
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                Planner belum aktif pada bootstrap ini.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Mesin rute akan memilih satu perjalanan yang paling mudah
                diikuti dan menjelaskan setiap keputusan di perjalanan.
              </p>
              <p className="mt-4 text-xs font-medium text-slate-500">
                Status data: Data terbatas
              </p>
            </section>
          </div>

          <AstaraMap styleUrl={mapStyleUrl} />
        </div>
      </div>
    </main>
  );
}
