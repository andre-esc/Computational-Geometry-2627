import { buildWitnessSet } from "./witnessSet";
import { buildVisibilityMatrix } from "./visibilityMatrix";
import {
  localSearchDominatingSet,
  type DominatingSetResult,
} from "./dominatingSet";
import type { XY } from "fabric";
import { guardHoles } from "./guardHoles";
import type { ConstructedEdge } from "./misc";
import trimPolygonForBaseEdgeConvexity from "./baseEdgeConvexity";

export function _computeBoundaryGuardSet(polygon: XY[]): { dominatingSet: DominatingSetResult; constructedEdges: ConstructedEdge[] } {
  const {witnessPoints: witnesses, constructedEdges} = buildWitnessSet(polygon, true);
  console.log(witnesses);
  const vm = buildVisibilityMatrix(polygon, witnesses);
  const result = localSearchDominatingSet(vm);
  return { dominatingSet: result, constructedEdges };
}

export function computeBoundaryGuardSet(polygon: XY[]) {
  // Make base edge convex
  const trimmed = trimPolygonForBaseEdgeConvexity(polygon);
  const guardSet = _computeBoundaryGuardSet(trimmed.polygon);

  console.log(trimmed);

  // Add guards if base edge was concave
  if (trimmed.trimmedLeft > 0) {
    // No index shifting since these points were removed from the end
    guardSet.dominatingSet.guards.push(0);
    guardSet.dominatingSet.guardPoints.push(polygon[0]);

    for (const iteration of guardSet.dominatingSet.iterationGuards) {
      iteration.push(0);
    }
  }
  if (trimmed.trimmedRight > 0) {
    console.log("Before shifting", guardSet.dominatingSet);

    guardSet.dominatingSet.guards.push(1);
    guardSet.dominatingSet.guardPoints.push(polygon[1]);

    // Need to shift indices since these points were removed from the beginning
    guardSet.dominatingSet.guards.forEach((guard, i) => {
      if (guard >= 2) guardSet.dominatingSet.guards[i] += trimmed.trimmedRight;
    })

    for (const iteration of guardSet.dominatingSet.iterationGuards) {
      iteration.push(1);

      iteration.forEach((guard, i) => {
        if (guard >= 2) iteration[i] += trimmed.trimmedRight;
      })
    }
  }

  return guardSet;
}

export function computeFullGuardSet(polygon: XY[]): number[] {
  const { dominatingSet: { guards }, constructedEdges } = computeBoundaryGuardSet(polygon);
  const edges = constructedEdges.filter(e => guards.includes(e.guard));
  const extra = guardHoles(polygon, edges);
  return [...new Set([...guards, ...extra])];
}