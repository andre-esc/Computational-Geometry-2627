import { buildWitnessSet } from "./witnessSet";
import { buildVisibilityMatrix } from "./visibilityMatrix";
import {
  localSearchDominatingSet,
  type DominatingSetResult,
} from "./dominatingSet";
import type { XY } from "fabric";
import { guardHoles } from "./guardHoles";
import type { ConstructedEdge } from "./misc";

export function computeBoundaryGuardSet(polygon: XY[]): { dominatingSet: DominatingSetResult; constructedEdges: ConstructedEdge[] } {
  const {witnessPoints: witnesses, constructedEdges} = buildWitnessSet(polygon, true);
  const vm = buildVisibilityMatrix(polygon, witnesses);
  const result = localSearchDominatingSet(vm);
  return { dominatingSet: result, constructedEdges };
}

export function computeFullGuardSet(polygon: XY[]): number[] {
  const { dominatingSet: { guards }, constructedEdges } = computeBoundaryGuardSet(polygon);
  const edges = constructedEdges.filter(e => guards.includes(e.guard));
  const extra = guardHoles(polygon, edges);
  return [...new Set([...guards, ...extra])];
}