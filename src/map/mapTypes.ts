import type { RouteMapPayload } from "~/core/geojson/routeGeometry";

export type AstaraMapStatus = "unconfigured" | "loading" | "ready" | "error";

export type AstaraMapFailure = Readonly<{
  kind: "configuration" | "geometry" | "provider";
  message: string;
  recoveryAction: string;
}>;

export type MapRouteState = RouteMapPayload["state"] | "invalid";

export const PROVIDER_FAILURE: AstaraMapFailure = {
  kind: "provider",
  message:
    "Peta sedang bermasalah. Coba lagi atau gunakan instruksi rute di kartu.",
  recoveryAction: "Coba lagi memuat peta.",
};

export const CONFIGURATION_FAILURE: AstaraMapFailure = {
  kind: "configuration",
  message: "Peta belum dikonfigurasi. Gunakan instruksi rute di kartu.",
  recoveryAction: "Minta operator menyiapkan konfigurasi peta.",
};
