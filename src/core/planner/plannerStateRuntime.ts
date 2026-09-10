import type {
  PlannerController,
  PlannerControllerDependencies,
  PlannerOperation,
  PlannerPlanFailure,
  PlannerStateSnapshot,
} from "./plannerTypes";
import {
  invalidateToSelection,
  startCatalog,
  startRoute,
} from "./plannerStateOperations";
import { getReadyState, isActiveRouteState } from "./plannerStateSupport";

const DEFAULT_TIMEOUT_MS = 15_000;

export class PlannerStateRuntime implements PlannerController {
  public readonly dependencies: PlannerControllerDependencies;
  public readonly timeoutMs: number;
  public readonly listeners = new Set<(state: PlannerStateSnapshot) => void>();
  public revision = 0;
  public disposed = false;
  public retryOperation: "catalog" | "route" | null = null;
  public mapAttempt = 0;
  private state: PlannerStateSnapshot = {
    state: "idle",
    origin: null,
    destination: null,
    departAt: null,
    catalog: null,
    route: null,
    operation: null,
    retryAvailable: false,
    mapRetryAvailable: false,
    detailOpen: false,
    mapReturnState: null,
  };

  public constructor(dependencies: PlannerControllerDependencies) {
    this.dependencies = dependencies;
    this.timeoutMs = dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  public getState = (): PlannerStateSnapshot => this.state;

  public subscribe = (
    listener: (state: PlannerStateSnapshot) => void,
  ): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public open = (): void => {
    if (this.disposed || this.state.state !== "idle") return;
    startCatalog(this);
  };

  public setEndpoint = (
    context: "origin" | "destination",
    location: PlannerStateSnapshot[typeof context],
  ): void => {
    if (this.disposed) return;
    if (isActiveRouteState(this.state.state)) invalidateToSelection(this);
    this.retryOperation = null;
    this.mapAttempt = 0;
    this.update({
      ...this.state,
      [context]: location,
      state: getReadyState(
        context === "origin" ? location : this.state.origin,
        context === "destination" ? location : this.state.destination,
        this.state.departAt,
        this.state.catalog,
      ),
      route: null,
      message: undefined,
      operation: null,
      retryAvailable: false,
      mapRetryAvailable: false,
      detailOpen: false,
      mapReturnState: null,
    });
  };

  public setDepartAt = (departAt: PlannerStateSnapshot["departAt"]): void => {
    if (this.disposed) return;
    if (isActiveRouteState(this.state.state)) invalidateToSelection(this);
    this.retryOperation = null;
    this.mapAttempt = 0;
    this.update({
      ...this.state,
      departAt,
      state: getReadyState(
        this.state.origin,
        this.state.destination,
        departAt,
        this.state.catalog,
      ),
      route: null,
      message: undefined,
      operation: null,
      retryAvailable: false,
      mapRetryAvailable: false,
      detailOpen: false,
      mapReturnState: null,
    });
  };

  public plan = (): void => {
    if (this.disposed || this.state.state !== "ready") return;
    startRoute(this, 0);
  };

  public retry = (): void => {
    if (this.disposed || !this.state.retryAvailable) return;
    if (this.retryOperation === "catalog") {
      startCatalog(this);
      return;
    }
    if (this.retryOperation === "route") startRoute(this, 1);
  };

  public edit = (): void => {
    if (this.disposed) return;
    invalidateToSelection(this, "Pilihan perjalanan siap diubah.", true);
  };

  public swap = (): void => {
    if (this.disposed || !this.state.origin || !this.state.destination) return;
    this.revision += 1;
    this.retryOperation = null;
    this.mapAttempt = 0;
    const origin = this.state.origin;
    const destination = this.state.destination;
    this.update({
      ...this.state,
      state: getReadyState(
        destination,
        origin,
        this.state.departAt,
        this.state.catalog,
      ),
      origin: destination,
      destination: origin,
      route: null,
      operation: null,
      retryAvailable: false,
      mapRetryAvailable: false,
      detailOpen: false,
      mapReturnState: null,
      message: "Asal dan tujuan ditukar. Periksa lalu hitung ulang rute.",
    });
  };

  public openDetail = (): void => {
    if (this.disposed || !this.state.route) return;
    if (this.state.state === "result") {
      this.update({ ...this.state, state: "detail", detailOpen: true });
      return;
    }
    if (
      this.state.state === "map-failure" &&
      this.state.mapReturnState === "result"
    ) {
      this.update({
        ...this.state,
        detailOpen: true,
        mapReturnState: "detail",
      });
    }
  };

  public closeDetail = (): void => {
    if (this.disposed) return;
    if (this.state.state === "detail") {
      this.update({ ...this.state, state: "result", detailOpen: false });
      return;
    }
    if (
      this.state.state === "map-failure" &&
      this.state.mapReturnState === "detail"
    ) {
      this.update({
        ...this.state,
        detailOpen: false,
        mapReturnState: "result",
      });
    }
  };

  public back = (): void => {
    if (this.disposed) return;
    if (this.state.state === "map-failure" && this.state.mapReturnState) {
      this.update({
        ...this.state,
        state: this.state.mapReturnState,
        mapReturnState: null,
        mapRetryAvailable: false,
      });
      return;
    }
    if (this.state.state === "detail") {
      this.update({ ...this.state, state: "result", detailOpen: false });
      return;
    }
    if (this.state.state === "result") {
      invalidateToSelection(this, undefined, true);
      return;
    }
    if (this.state.state === "loading") {
      invalidateToSelection(
        this,
        "Perhitungan dibatalkan. Pilih ulang atau lanjutkan.",
        true,
      );
    }
  };

  public reset = (): void => {
    if (this.disposed) return;
    this.revision += 1;
    this.retryOperation = null;
    this.mapAttempt = 0;
    this.update({
      state: "idle",
      origin: null,
      destination: null,
      departAt: null,
      catalog: null,
      route: null,
      operation: null,
      retryAvailable: false,
      mapRetryAvailable: false,
      detailOpen: false,
      mapReturnState: null,
      message: undefined,
    });
  };

  public reportMapFailure = (
    message = "Peta sedang bermasalah. Instruksi rute tetap tersedia.",
    reportedAttempt?: number,
  ): void => {
    if (
      this.disposed ||
      !this.state.route ||
      (this.state.state !== "result" && this.state.state !== "detail")
    )
      return;
    if (reportedAttempt !== undefined && reportedAttempt < this.mapAttempt) {
      return;
    }
    if (reportedAttempt !== undefined) this.mapAttempt = reportedAttempt;
    this.update({
      ...this.state,
      state: "map-failure",
      message,
      mapReturnState: this.state.state,
      detailOpen: this.state.state === "detail",
      retryAvailable: false,
      mapRetryAvailable: this.mapAttempt === 0,
    });
  };

  public retryMap = (): void => {
    if (
      this.disposed ||
      this.state.state !== "map-failure" ||
      !this.state.mapReturnState ||
      !this.state.mapRetryAvailable
    )
      return;
    this.mapAttempt += 1;
    this.update({
      ...this.state,
      state: this.state.mapReturnState,
      message: undefined,
      mapReturnState: null,
      mapRetryAvailable: false,
    });
  };

  public dismissMapFailure = (): void => {
    if (this.disposed || this.state.state !== "map-failure") return;
    if (!this.state.mapReturnState) return;
    this.update({
      ...this.state,
      state: this.state.mapReturnState,
      message: undefined,
      mapReturnState: null,
      mapRetryAvailable: false,
    });
  };

  public dispose = (): void => {
    this.disposed = true;
    this.revision += 1;
    this.listeners.clear();
  };

  public isCurrent(operation: PlannerOperation): boolean {
    return (
      !this.disposed &&
      this.state.operation?.kind === operation.kind &&
      this.state.operation.revision === operation.revision &&
      this.state.operation.attempt === operation.attempt
    );
  }

  public setFailure(
    operation: PlannerOperation,
    failure: PlannerPlanFailure,
  ): void {
    if (!this.isCurrent(operation)) return;
    this.retryOperation =
      failure.retryable && operation.attempt === 0 ? operation.kind : null;
    this.update({
      ...this.state,
      state: failure.kind,
      message: failure.message,
      operation: null,
      retryAvailable: this.retryOperation !== null,
      mapRetryAvailable: false,
      detailOpen: false,
      mapReturnState: null,
    });
  }

  public update(
    next: Omit<PlannerStateSnapshot, "state"> &
      Pick<PlannerStateSnapshot, "state">,
  ): void {
    this.state = next;
    this.emit();
  }

  private emit(): void {
    if (this.disposed) return;
    for (const listener of this.listeners) listener(this.state);
  }
}
