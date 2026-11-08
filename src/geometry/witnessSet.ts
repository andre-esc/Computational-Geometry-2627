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
  for (var index = 0; 0 < polygon.length; index++) {
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
