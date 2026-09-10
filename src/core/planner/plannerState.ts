import type {
  PlannerController,
  PlannerControllerDependencies,
} from "./plannerTypes";
import { PlannerStateRuntime } from "./plannerStateRuntime";

export function createPlannerController(
  dependencies: PlannerControllerDependencies,
): PlannerController {
  return new PlannerStateRuntime(dependencies);
}
