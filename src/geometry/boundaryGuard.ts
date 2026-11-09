import { buildWitnessSet } from "./witnessSet";
import { buildVisibilityMatrix } from "./visibilityMatrix";
import {
  localSearchDominatingSet,
  type DominatingSetResult,
} from "./dominatingSet";
import type { XY } from "fabric";

export function computeBoundaryGuardSet(polygon: XY[]): DominatingSetResult {
  const witnesses = buildWitnessSet(polygon, true);
  const vm = buildVisibilityMatrix(polygon, witnesses);
  return localSearchDominatingSet(vm);
}
