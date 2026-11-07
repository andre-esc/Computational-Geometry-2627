import type { XY } from "fabric";

export const EPSILON = 1e-9;

// ---------------------- AI USAGE --------------------------
//    The following section is [AI:W] on the 0rwx scale.
// ----------------------------------------------------------

export interface BoundaryCoord {
  edgeIndex: number; // 0-based index of edge e_i = (v_i, v_{i+1})
  t: number; // parameter t in [0, 1] along the edge
  point: XY; // cached Euclidean coordinate
}

/**
 * Compare two points on the boundary along the traversal order (from v_0 to v_{n-1}).
 * Normalizes t ~ 1 on edge i to t ~ 0 on edge (i + 1) % n to avoid boundary ambiguities.
 */
export function compareBoundaryCoord(
  a: BoundaryCoord,
  b: BoundaryCoord,
  numEdges: number,
): number {
  const normA = normalizeBoundaryCoord(a, numEdges);
  const normB = normalizeBoundaryCoord(b, numEdges);

  if (normA.edgeIndex !== normB.edgeIndex) {
    return normA.edgeIndex - normB.edgeIndex;
  }

  if (Math.abs(normA.t - normB.t) < EPSILON) {
    return 0;
  }

  return normA.t < normB.t ? -1 : 1;
}

export function areBoundaryCoordsEqual(
  a: BoundaryCoord,
  b: BoundaryCoord,
  numEdges: number,
): boolean {
  return compareBoundaryCoord(a, b, numEdges) === 0;
}

export function normalizeBoundaryCoord(
  coord: BoundaryCoord,
  numEdges: number,
): BoundaryCoord {
  let { edgeIndex, t, point } = coord;

  if (t < 0) t = 0;
  if (t > 1) t = 1;

  // If t is practically 1, advance to the start of the next edge
  if (Math.abs(t - 1) < EPSILON) {
    edgeIndex = (edgeIndex + 1) % numEdges;
    t = 0;
  } else if (Math.abs(t) < EPSILON) {
    t = 0;
  }

  return { edgeIndex, t, point };
}

/**
 * Interpolates a Euclidean point along edge (a, b) at parameter t.
 */
export function interpolateEdge(a: XY, b: XY, t: number): XY {
  return {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };
}
