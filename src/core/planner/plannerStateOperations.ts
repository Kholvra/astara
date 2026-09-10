import type {
  PlannerOperation,
  PlannerPlanInput,
  PlannerPlanOutcome,
} from "./plannerTypes";
import type { PlannerStateRuntime } from "./plannerStateRuntime";
import { getReadyState } from "./plannerStateSupport";

const TIMEOUT = Symbol("planner-timeout");

type TimedValue<T> = T | typeof TIMEOUT;

export function startCatalog(runtime: PlannerStateRuntime): void {
  runtime.revision += 1;
  const operation: PlannerOperation = {
    kind: "catalog",
    revision: runtime.revision,
    attempt: 0,
  };
  runtime.update({
    ...runtime.getState(),
    state: "select",
    operation,
    message: "Memuat data transit…",
    retryAvailable: false,
    mapRetryAvailable: false,
    detailOpen: false,
    mapReturnState: null,
  });
  void runCatalog(runtime, operation);
}

export function startRoute(
  runtime: PlannerStateRuntime,
  attempt: number,
): void {
  const { origin, destination, departAt, catalog } = runtime.getState();
  if (!origin || !destination || !departAt || !catalog) {
    runtime.update({
      ...runtime.getState(),
      state: "select",
      message: "Pilih asal, tujuan, dan waktu keberangkatan yang valid.",
    });
    return;
  }
  const operation: PlannerOperation = {
    kind: "route",
    revision: runtime.revision,
    attempt,
  };
  const input: PlannerPlanInput = { origin, destination, departAt, catalog };
  runtime.update({
    ...runtime.getState(),
    state: "loading",
    message:
      attempt === 0 ? "Menghitung rute…" : "Mencoba menghitung rute lagi…",
    operation,
    retryAvailable: false,
    mapRetryAvailable: false,
    detailOpen: false,
    mapReturnState: null,
  });
  void runRoute(runtime, operation, input);
}

export function invalidateToSelection(
  runtime: PlannerStateRuntime,
  message?: string,
  forceSelect = false,
): void {
  runtime.revision += 1;
  runtime.retryOperation = null;
  runtime.mapAttempt = 0;
  const state = runtime.getState();
  runtime.update({
    ...state,
    state: forceSelect
      ? "select"
      : getReadyState(
          state.origin,
          state.destination,
          state.departAt,
          state.catalog,
        ),
    route: null,
    operation: null,
    retryAvailable: false,
    mapRetryAvailable: false,
    detailOpen: false,
    mapReturnState: null,
    ...(message ? { message } : { message: undefined }),
  });
}

export async function runCatalog(
  runtime: PlannerStateRuntime,
  operation: PlannerOperation,
): Promise<void> {
  try {
    const loaded = await withTimeout(
      runtime.dependencies.loadCatalog(),
      runtime.timeoutMs,
    );
    if (!runtime.isCurrent(operation)) return;
    if (loaded === TIMEOUT || !isCatalogUsable(loaded)) {
      runtime.setFailure(operation, {
        state: "failure",
        kind: "stale-data",
        message: "Data transit belum siap. Coba lagi atau ubah pilihan.",
        retryable: true,
      });
      return;
    }
    runtime.retryOperation = null;
    runtime.mapAttempt = 0;
    const state = runtime.getState();
    runtime.update({
      ...state,
      state: getReadyState(
        state.origin,
        state.destination,
        state.departAt,
        loaded,
      ),
      catalog: loaded,
      message: undefined,
      operation: null,
      retryAvailable: false,
      mapRetryAvailable: false,
      mapReturnState: null,
    });
  } catch {
    runtime.setFailure(operation, {
      state: "failure",
      kind: "error",
      message: "Data transit sedang tidak tersedia. Coba lagi.",
      retryable: true,
    });
  }
}

export async function runRoute(
  runtime: PlannerStateRuntime,
  operation: PlannerOperation,
  input: PlannerPlanInput,
): Promise<void> {
  try {
    const outcome = await withTimeout(
      runtime.dependencies.planRoute(input),
      runtime.timeoutMs,
    );
    if (!runtime.isCurrent(operation)) return;
    if (outcome === TIMEOUT) {
      runtime.setFailure(operation, {
        state: "failure",
        kind: "error",
        message: "Perhitungan rute terlalu lama. Coba lagi atau ubah pilihan.",
        retryable: true,
      });
      return;
    }
    applyRouteOutcome(runtime, operation, input, outcome);
  } catch {
    runtime.setFailure(operation, {
      state: "failure",
      kind: "error",
      message: "Rute belum dapat dihitung. Coba lagi atau ubah pilihan.",
      retryable: true,
    });
  }
}

function applyRouteOutcome(
  runtime: PlannerStateRuntime,
  operation: PlannerOperation,
  input: PlannerPlanInput,
  outcome: PlannerPlanOutcome,
): void {
  if (!runtime.isCurrent(operation)) return;
  if (outcome.state === "failure") {
    runtime.setFailure(operation, outcome);
    return;
  }
  if (
    outcome.snapshotId !== input.catalog.snapshotId ||
    outcome.configurationHash !== input.catalog.configurationHash
  ) {
    runtime.setFailure(operation, {
      state: "failure",
      kind: "stale-data",
      message: "Data rute berubah. Muat ulang data sebelum mencoba lagi.",
      retryable: false,
    });
    return;
  }
  runtime.retryOperation = null;
  runtime.mapAttempt = 0;
  runtime.update({
    ...runtime.getState(),
    state: "result",
    route: outcome,
    message: undefined,
    operation: null,
    retryAvailable: false,
    mapRetryAvailable: false,
    detailOpen: false,
    mapReturnState: null,
  });
}

function isCatalogUsable(
  value: NonNullable<ReturnType<PlannerStateRuntime["getState"]>["catalog"]>,
): boolean {
  return (
    value.snapshotId.trim().length > 0 &&
    value.configurationHash.trim().length > 0 &&
    Array.isArray(value.items) &&
    value.status.networkAvailability === "available"
  );
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
): Promise<TimedValue<T>> {
  return new Promise<TimedValue<T>>((resolve, reject) => {
    const timer = setTimeout(() => resolve(TIMEOUT), Math.max(0, timeoutMs));
    void operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(
          error instanceof Error
            ? error
            : new Error("Planner operation failed."),
        );
      },
    );
  });
}
