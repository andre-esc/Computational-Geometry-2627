import type { XY } from "fabric";
import { compareBoundaryCoord, type BoundaryCoord } from "./boundaryCoord";
import { computeVertexBoundaryCutEndpoints } from "./visibility";

export interface WitnessPoint {
  index: number;
  point: XY;
  segmentStart: BoundaryCoord;
  segmentEnd: BoundaryCoord;
}

// ---------------------- AI USAGE --------------------------
//    The following section is [AI:0] on the 0rwx scale.
// ----------------------------------------------------------

/**
 * B = ∪_(v in V)[ W'(v) ] ∪ V
 */
export function collectUniqueBoundaryCuts(polygon: XY[]): BoundaryCoord[] {
  let boundaryCuts: BoundaryCoord[] = [];
  for (var index = 0; index < polygon.length; index++) {
    let cutsFromGuard = computeVertexBoundaryCutEndpoints(index, polygon);
    // Push all the cuts & the vertex
    boundaryCuts.push(...cutsFromGuard);
    boundaryCuts.push({
      edgeIndex: index,
      t: 0,
      point: polygon[index],
    });
  }

  // Sort & deduplicate
  boundaryCuts.sort((a, b) => compareBoundaryCoord(a, b, polygon.length));
  const uniqueBoundaryCuts: BoundaryCoord[] = [];
  for (const cut of boundaryCuts) {
    if (
      uniqueBoundaryCuts.length === 0 ||
      compareBoundaryCoord(
        uniqueBoundaryCuts[uniqueBoundaryCuts.length - 1],
        cut,
        polygon.length,
      ) !== 0
    ) {
      uniqueBoundaryCuts.push(cut);
    }
  }

  return uniqueBoundaryCuts;
}

/**
 * Build the witness set of the given polygon.
 * @param polygon
 * @param includeBaseEdge
 * @returns
 */
export function buildWitnessSet(
  polygon: XY[],
  includeBaseEdge: boolean = false,
): WitnessPoint[] {
  let boundaryCuts = collectUniqueBoundaryCuts(polygon);

  let witnessPoints = [];

  for (var i = 0; i < boundaryCuts.length - 1; i++) {
    // Get each edge wrapping around.
    const previousCut = boundaryCuts[i];
    const currentCut = boundaryCuts[(i + 1) % boundaryCuts.length];

    if (
      !includeBaseEdge &&
      previousCut.edgeIndex == 0 &&
      currentCut.edgeIndex == 0
    )
      continue;

    const midpointX = (previousCut.point.x + currentCut.point.x) / 2;
    const midpointY = (previousCut.point.y + currentCut.point.y) / 2;

    witnessPoints.push({
      index: witnessPoints.length,
      point: { x: midpointX, y: midpointY },
      segmentStart: previousCut,
      segmentEnd: currentCut,
    });
  }

  return witnessPoints;
}
