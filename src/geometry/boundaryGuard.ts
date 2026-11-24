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
import { getConstructedEdges } from "./visibility";

// Verifies whether the given guards guard the polygon's boundary
export function checkBoundaryGuard(polygon: XY[], guards: number[]) {
  const { witnessPoints: witnesses } = buildWitnessSet(polygon, true);
  const vm = buildVisibilityMatrix(polygon, witnesses);

  const coveredWitnesses = new Set<number>();

  for (const g of guards) {
    for (const w of vm.guardCoverage[g]) coveredWitnesses.add(w);
  }

  return coveredWitnesses.size === witnesses.length;
}

// Computes the boundary guard of a WV-polygon, assuming convex base edge vertices
export function computeBoundaryGuardSetConvex(polygon: XY[]): { dominatingSet: DominatingSetResult; constructedEdges: ConstructedEdge[] } {
  const {witnessPoints: witnesses, constructedEdges} = buildWitnessSet(polygon, true);
  const vm = buildVisibilityMatrix(polygon, witnesses);
  const result = localSearchDominatingSet(vm);
  return { dominatingSet: result, constructedEdges };
}

// Computes the boundary guard of a WV-polygon
export function computeBoundaryGuardSet(polygon: XY[]) {
  // Make base edge convex
  const trimmed = trimPolygonForBaseEdgeConvexity(polygon);
  const guardSet = computeBoundaryGuardSetConvex(trimmed.polygon);

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

export interface FullGuardSet {
  guardsBefore: number[];
  totalGuards: number[];
  extraGuardTriangles: [number, [XY, XY, XY]][];
};

// Computes the full guard of a WV-polygon, assuming convex base edge vertices
export function computeFullGuardSetConvex(polygon: XY[]): FullGuardSet {
  const { dominatingSet: { guards }, constructedEdges } = computeBoundaryGuardSetConvex(polygon);
  const edges = constructedEdges.filter(e => guards.includes(e.guard));

  const extra = guardHoles(polygon, edges, guards);

  return {
    guardsBefore: guards,
    totalGuards: [...new Set([...guards, ...extra.keys()])], 
    extraGuardTriangles: [...extra.entries()]
  } as FullGuardSet;
}

// Computes the full guard of a WV-polygon
export function computeFullGuardSet(polygon: XY[]): FullGuardSet {
  // Make base edge convex
  const trimmed = trimPolygonForBaseEdgeConvexity(polygon);
  const guardSet = computeFullGuardSetConvex(trimmed.polygon);

  // Add guards if base edge was concave
  if (trimmed.trimmedLeft > 0) {
    // No index shifting since these points were removed from the end
    guardSet.guardsBefore.push(0);
    guardSet.totalGuards.push(0);
  }
  if (trimmed.trimmedRight > 0) {
    guardSet.guardsBefore.push(1);
    guardSet.totalGuards.push(1);

    // Need to shift indices since these points were removed from the beginning
    guardSet.guardsBefore.forEach((guard, i) => {
      if (guard >= 2) guardSet.guardsBefore[i] += trimmed.trimmedRight;
    })
    guardSet.totalGuards.forEach((guard, i) => {
      if (guard >= 2) guardSet.totalGuards[i] += trimmed.trimmedRight;
    })
    guardSet.extraGuardTriangles.forEach(([guard, _], i) => {
      if (guard >= 2) guardSet.extraGuardTriangles[i][0] += trimmed.trimmedRight;
    })
  }

  return guardSet;
}

// Computes a full guard of a WV-polygon, given existing boundary guards
export function computeFullGuardSetFromGuards(polygon: XY[], guards: number[]): FullGuardSet {
  const extra = guardHoles(polygon, getConstructedEdges(polygon, guards), guards);

  return {
      guardsBefore: guards,
      totalGuards: [...guards, ...extra.keys()],
      extraGuardTriangles: [...extra.entries()]
  } as FullGuardSet;
}