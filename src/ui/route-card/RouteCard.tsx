import type { ReactNode } from "react";

import {
  createRouteCardViewModel,
  type RouteCardInput,
  type RouteCardSelectedViewModel,
  type RouteCardStatusLabel,
  type RouteCardStep,
} from "./routeCardModel";

export type RouteCardProps = RouteCardInput &
  Readonly<{
    mapCompanion?: ReactNode;
    onRetry?: () => void;
    onEdit?: () => void;
    onMapRetry?: () => void;
    onMapDismiss?: () => void;
    onStepsToggle?: (open: boolean) => void;
    stepsOpen?: boolean;
    mapOpen?: boolean;
  }>;

export const RouteCard = (props: RouteCardProps) => {
  const {
    mapCompanion,
    onRetry,
    onEdit,
    onMapRetry,
    onMapDismiss,
    onStepsToggle,
    stepsOpen,
    mapOpen,
    ...input
  } = props;
  const model = createRouteCardViewModel(input);

  if (model.state === "recovery") {
    return (
      <RecoveryCard
        title={model.title}
        detail={model.detail}
        action={model.action}
        onRetry={onRetry}
        onEdit={onEdit}
      />
    );
  }

  return (
    <SelectedRouteCard
      model={model}
      mapCompanion={mapCompanion}
      onMapRetry={onMapRetry}
      onMapDismiss={onMapDismiss}
      onStepsToggle={onStepsToggle}
      stepsOpen={stepsOpen}
      mapOpen={mapOpen}
    />
  );
};

type RecoveryCardProps = Readonly<{
  title: string;
  detail: string;
  action: string;
  onRetry?: () => void;
  onEdit?: () => void;
}>;

const RecoveryCard = ({
  title,
  detail,
  action,
  onRetry,
  onEdit,
}: RecoveryCardProps) => {
  const primaryAction = action === "Coba lagi" ? onRetry : onEdit;
  const secondaryAction = action === "Coba lagi" ? onEdit : onRetry;
  const secondaryLabel = action === "Coba lagi" ? "Ubah pilihan" : "Coba lagi";

  return (
    <article
      aria-labelledby="route-card-recovery-heading"
      className="max-w-full min-w-0 overflow-x-hidden rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-6"
    >
      <div role="alert" aria-live="polite" className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-bold tracking-[0.16em] text-amber-800 uppercase">
            RUTE TRANSIT
          </p>
          <h1
            id="route-card-recovery-heading"
            tabIndex={-1}
            className="text-xl leading-tight font-bold break-words text-amber-950"
          >
            {title}
          </h1>
          <p className="text-sm leading-relaxed break-words text-amber-900">
            {detail}
          </p>
        </div>

        {(primaryAction ?? secondaryAction) && (
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction}
                className="min-h-11 w-full rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 focus:ring-2 focus:ring-emerald-200 focus:outline-none sm:w-auto"
              >
                {action}
              </button>
            )}
            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction}
                className="min-h-11 w-full rounded-xl border border-amber-300 bg-white px-4 text-sm font-bold text-amber-950 transition hover:bg-amber-100 focus:ring-2 focus:ring-amber-200 focus:outline-none sm:w-auto"
              >
                {secondaryLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

type SelectedRouteCardProps = Readonly<{
  model: RouteCardSelectedViewModel;
  mapCompanion?: ReactNode;
  onMapRetry?: () => void;
  onMapDismiss?: () => void;
  onStepsToggle?: (open: boolean) => void;
  stepsOpen?: boolean;
  mapOpen?: boolean;
}>;

const SelectedRouteCard = ({
  model,
  mapCompanion,
  onMapRetry,
  onMapDismiss,
  onStepsToggle,
  stepsOpen,
  mapOpen,
}: SelectedRouteCardProps) => {
  const hasMapSurface =
    model.mapNotice !== undefined ||
    (mapCompanion !== undefined && mapCompanion !== null);

  return (
    <article
      aria-labelledby="route-card-heading"
      className="max-w-full min-w-0 overflow-x-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <header className="min-w-0 space-y-2">
        <p className="text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase">
          RUTE PALING MUDAH DIIKUTI
        </p>
        <h1
          id="route-card-heading"
          tabIndex={-1}
          className="text-2xl leading-tight font-bold break-words text-slate-950"
        >
          {model.summary.origin} <span aria-hidden="true">→</span>{" "}
          {model.summary.destination}
        </h1>
        <p className="text-sm leading-relaxed break-words text-slate-600">
          Ringkasan perjalanan utama berdasarkan data yang tersedia.
        </p>
      </header>

      <div
        role="status"
        aria-live="polite"
        className="mt-4 min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <StatusBadge label={model.status.label} />
          <p className="min-w-0 text-sm leading-relaxed break-words text-slate-700">
            {model.status.detail}
          </p>
        </div>
      </div>

      <section
        aria-labelledby="route-card-summary-heading"
        className="mt-5 min-w-0 space-y-3"
      >
        <h2
          id="route-card-summary-heading"
          className="text-base font-bold text-slate-950"
        >
          Ringkasan perjalanan
        </h2>
        <dl className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryFact label="Layanan dan arah">
            <div className="grid min-w-0 gap-1">
              {model.summary.serviceDirections.map((direction) => (
                <span key={direction} className="break-words">
                  {direction}
                </span>
              ))}
            </div>
          </SummaryFact>
          <SummaryFact label="Berangkat">{model.summary.departAt}</SummaryFact>
          <SummaryFact label="Jadwal">
            <span className="break-words">{model.summary.timing.label}</span>
            {model.summary.timing.detail && (
              <span className="block text-xs font-normal break-words text-slate-500">
                {model.summary.timing.detail}
              </span>
            )}
          </SummaryFact>
          <SummaryFact label="Durasi">{model.summary.duration}</SummaryFact>
          <SummaryFact label="Pindah">{model.summary.transfers}</SummaryFact>
          <SummaryFact label="Jalan kaki">{model.summary.walking}</SummaryFact>
          <SummaryFact label="Tarif">{model.summary.fare}</SummaryFact>
        </dl>
      </section>

      <section
        aria-labelledby="route-card-reason-heading"
        className="mt-5 min-w-0 space-y-2 rounded-2xl border border-slate-200 p-4"
      >
        <h2
          id="route-card-reason-heading"
          className="text-base font-bold text-slate-950"
        >
          Kenapa rute ini dipilih?
        </h2>
        <p className="text-sm leading-relaxed break-words text-slate-700">
          {model.reason.headline}
        </p>
        <ul className="grid min-w-0 gap-1 text-xs leading-relaxed text-slate-600">
          {model.reason.facts.map((fact) => (
            <li key={fact} className="break-words">
              {fact}
            </li>
          ))}
        </ul>
      </section>

      <details
        id="route-card-steps"
        {...(stepsOpen === undefined ? {} : { open: stepsOpen })}
        onToggle={(event) => onStepsToggle?.(event.currentTarget.open)}
        className="mt-5 min-w-0 rounded-2xl border border-slate-200"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-950 focus:ring-2 focus:ring-emerald-200 focus:outline-none [&::-webkit-details-marker]:hidden">
          <span className="break-words">Lihat langkah perjalanan</span>
          <span aria-hidden="true" className="text-slate-500">
            +
          </span>
        </summary>
        <ol className="grid min-w-0 gap-3 border-t border-slate-200 p-4">
          {model.steps.map((step, index) => (
            <JourneyStep key={step.id} step={step} number={index + 1} />
          ))}
        </ol>
      </details>

      {hasMapSurface && (
        <details
          id="route-card-map"
          {...(mapOpen === undefined ? {} : { open: mapOpen })}
          className="mt-3 min-w-0 rounded-2xl border border-slate-200"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-950 focus:ring-2 focus:ring-emerald-200 focus:outline-none [&::-webkit-details-marker]:hidden">
            <span className="break-words">Buka peta pendamping</span>
            <span aria-hidden="true" className="text-slate-500">
              +
            </span>
          </summary>
          <div className="grid min-w-0 gap-3 border-t border-slate-200 p-4">
            {model.mapNotice && (
              <div className="grid min-w-0 gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p
                  role="status"
                  className="text-sm leading-relaxed break-words text-amber-900"
                >
                  {model.mapNotice}
                </p>
                {onMapRetry && (
                  <button
                    type="button"
                    onClick={onMapRetry}
                    className="min-h-11 w-full rounded-xl border border-amber-300 bg-white px-4 text-sm font-bold text-amber-950 transition hover:bg-amber-100 focus:ring-2 focus:ring-amber-200 focus:outline-none sm:w-fit"
                  >
                    Coba muat peta lagi
                  </button>
                )}
                {onMapDismiss && (
                  <button
                    type="button"
                    onClick={onMapDismiss}
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:ring-2 focus:ring-emerald-200 focus:outline-none sm:w-fit"
                  >
                    Lanjut tanpa peta
                  </button>
                )}
              </div>
            )}
            {mapCompanion && (
              <div className="h-72 sm:h-96 w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
                {mapCompanion}
              </div>
            )}
          </div>
        </details>
      )}
    </article>
  );
};

type SummaryFactProps = Readonly<{
  label: string;
  children: ReactNode;
}>;

const SummaryFact = ({ label, children }: SummaryFactProps) => (
  <div className="min-w-0 rounded-xl bg-slate-50 p-3">
    <dt className="text-xs font-semibold text-slate-500">{label}</dt>
    <dd className="mt-1 min-w-0 text-sm leading-relaxed font-bold break-words text-slate-900">
      {children}
    </dd>
  </div>
);

type JourneyStepProps = Readonly<{
  step: RouteCardStep;
  number: number;
}>;

const JourneyStep = ({ step, number }: JourneyStepProps) => (
  <li className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3">
    <span
      aria-hidden="true"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800"
    >
      {number}
    </span>
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="min-w-0 text-sm font-bold break-words text-slate-950">
          {step.title}
        </h3>
        <StatusBadge label={step.status} />
      </div>
      <p className="text-sm leading-relaxed break-words text-slate-700">
        {step.detail}
      </p>
      <p className="text-xs leading-relaxed break-words text-slate-500">
        {step.statusDetail}
      </p>
    </div>
  </li>
);

type StatusBadgeProps = Readonly<{
  label: RouteCardStatusLabel;
}>;

const StatusBadge = ({ label }: StatusBadgeProps) => (
  <span
    className={`inline-flex min-h-7 shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClassName(label)}`}
  >
    {label}
  </span>
);

function getStatusClassName(label: RouteCardStatusLabel): string {
  switch (label) {
    case "Terverifikasi":
      return "bg-emerald-100 text-emerald-800";
    case "Perlu dicek":
      return "bg-amber-100 text-amber-900";
    case "Data terbatas":
      return "bg-slate-200 text-slate-800";
  }
}
