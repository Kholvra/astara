import type {
  ConfidenceLevel,
  DistanceBasis,
  SearchSource,
  VerificationStatus,
} from "~/core/search/search.types";

export type SearchTrustBlockProps = {
  source: SearchSource;
  confidence: ConfidenceLevel;
  verification: VerificationStatus;
  distanceBasis?: DistanceBasis;
};

export const SearchTrustBlock = ({
  source,
  confidence,
  verification,
  distanceBasis,
}: SearchTrustBlockProps) => {
  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 text-slate-500"
      role="note"
      aria-label="Informasi kepercayaan lokasi"
    >
      <span>{getSearchSourceLabel(source)}</span>
      <span aria-hidden="true">•</span>
      <span>{getConfidenceLabel(confidence)}</span>
      <span aria-hidden="true">•</span>
      <span>{verification}</span>
      {distanceBasis === "straight_line_only" && (
        <span className="basis-full text-amber-700">
          Perkiraan garis lurus; jalur jalan kaki belum diverifikasi.
        </span>
      )}
      {distanceBasis === "walking_evidence" && (
        <span className="basis-full text-emerald-700">
          Jarak jalan kaki memakai data pendukung.
        </span>
      )}
    </div>
  );
};

export function getSearchSourceLabel(source: SearchSource): string {
  switch (source) {
    case "gtfs_local":
      return "Sumber: Data halte lokal";
    case "alias":
      return "Sumber: Alias terkurasi";
    case "session_gps":
      return "Sumber: Lokasiku";
  }
}

export function getConfidenceLabel(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case "high":
      return "Kecocokan: tinggi";
    case "medium":
      return "Kecocokan: sedang";
    case "low":
      return "Kecocokan: rendah";
  }
}
