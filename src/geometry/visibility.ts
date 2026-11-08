import type { XY } from "fabric";
import type { BoundaryCoord } from "./boundaryCoord";
import { compareBoundaryCoord, normalizeBoundaryCoord } from "./boundaryCoord";
import {
  computeRaySegmentIntersection,
  isPointInPolygon,
  isSegmentInsidePolygon,
  type RaySegmentIntersection,
} from "./misc";

export interface VisibleInterval {
  start: BoundaryCoord;
  end: BoundaryCoord;
}

export interface VisibilityCut {
  coord: BoundaryCoord;
  sourceVertexIndex?: number;
  isShadowHit: boolean;
}

/**
 * Shoots a ray starting from rayOrigin through rayThroughPoint and finds
 * the first polygon boundary hit strictly in front of the ray.
 */
export function shootRayToFirstBoundaryHit(
  rayOrigin: XY,
  rayThroughPoint: XY,
  polygon: XY[],
  ignoreEdgeIndices: number[] = [],
): BoundaryCoord | null {
  const n = polygon.length;
  let bestIntersection: RaySegmentIntersection | null = null;
  let bestDistance = Number.MAX_VALUE;
  let bestEdgeIndex = -1;

  for (let i = 0; i < n; i++) {
    if (ignoreEdgeIndices.includes(i)) continue;

    const next = (i + 1) % n;
    const intersection = computeRaySegmentIntersection(
      [rayOrigin, rayThroughPoint],
      [polygon[i], polygon[next]],
    );

    if (intersection === null) continue;
    // Filter out self-hits at the origin
    if (intersection.dist > 1e-4 && intersection.dist < bestDistance) {
      bestIntersection = intersection;
      bestDistance = intersection.dist;
      bestEdgeIndex = i;
    }
  }

  if (!bestIntersection) return null;

  return normalizeBoundaryCoord(
    {
      edgeIndex: bestEdgeIndex,
      t: bestIntersection.t,
      point: bestIntersection.point,
    },
    n,
  );
}

/**
 * Returns true if vertex j is an occluding corner relative to guard g,
 * meaning a sightline ray extending past it enters the interior of P.
 */
export function isOccludingVertex(
  guard: XY,
  vertexIndex: number,
  polygon: XY[],
): boolean {
  const vertex = polygon[vertexIndex];
  const dx = vertex.x - guard.x;
  const dy = vertex.y - guard.y;
  const len = Math.hypot(dx, dy);

  if (len < 1e-9) return false;

  const probe: XY = {
    x: vertex.x + (dx / len) * 1e-3,
    y: vertex.y + (dy / len) * 1e-3,
  };

  return isPointInPolygon(probe, polygon);
}

/**
 * Computes all maximal continuous boundary intervals along ∂P visible from guardIndex.
 */
export function computeVisibleIntervalsForVertex(
  guardIndex: number,
  polygon: XY[],
): VisibleInterval[] {
  const n = polygon.length;
  const guard = polygon[guardIndex];

  // 1. Initialize candidate boundary cut events with all polygon vertices
  const cuts: BoundaryCoord[] = [];
  for (let i = 0; i < n; i++) {
    cuts.push({ edgeIndex: i, t: 0, point: polygon[i] });
  }

  // 2. Identify visible occluding vertices and cast shadow extension rays
  for (let j = 0; j < n; j++) {
    if (j === guardIndex) continue;

    // Is vertex j directly visible from the guard?
    if (!isSegmentInsidePolygon(guard, polygon[j], polygon)) {
      continue;
    }

    // If it's an occluding corner, shoot ray past it into P
    if (isOccludingVertex(guard, j, polygon)) {
      const prevEdge = (j - 1 + n) % n;
      const nextEdge = j;

      const hit = shootRayToFirstBoundaryHit(
        polygon[j],
        {
          x: polygon[j].x + (polygon[j].x - guard.x),
          y: polygon[j].y + (polygon[j].y - guard.y),
        },
        polygon,
        [prevEdge, nextEdge],
      );

      if (hit) {
        cuts.push(hit);
      }
    }
  }

  // 3. Sort all cut coordinates monotonically along ∂P traversal
  cuts.sort((a, b) => compareBoundaryCoord(a, b, n));

  // 4. Deduplicate adjacent cuts
  const uniqueCuts: BoundaryCoord[] = [];
  for (const c of cuts) {
    if (
      uniqueCuts.length === 0 ||
      compareBoundaryCoord(uniqueCuts[uniqueCuts.length - 1], c, n) !== 0
    ) {
      uniqueCuts.push(c);
    }
  }

  if (uniqueCuts.length < 2) return [];

  // 5. Evaluate elementary pieces between adjacent cuts and merge visible intervals
  const intervals: VisibleInterval[] = [];
  let currentStart: BoundaryCoord | null = null;
  const numCuts = uniqueCuts.length;

  for (let i = 0; i < numCuts; i++) {
    const c1 = uniqueCuts[i];
    const c2 = uniqueCuts[(i + 1) % numCuts];

    // Midpoint between consecutive cut points
    const midPoint: XY = {
      x: (c1.point.x + c2.point.x) / 2,
      y: (c1.point.y + c2.point.y) / 2,
    };

    const isVisible = isSegmentInsidePolygon(guard, midPoint, polygon);

    if (isVisible) {
      if (currentStart === null) {
        currentStart = c1;
      }
    } else {
      if (currentStart !== null) {
        intervals.push({ start: currentStart, end: c1 });
        currentStart = null;
      }
    }
  }

  // Close any trailing interval
  if (currentStart !== null) {
    intervals.push({ start: currentStart, end: uniqueCuts[0] });
  }

  return intervals;
}
