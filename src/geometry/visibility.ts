import type { XY } from "fabric";
import type { BoundaryCoord } from "./boundaryCoord";
import {
  distance,
  computeRaySegmentIntersection,
  isPointInPolygon,
} from "./misc";

// ---------------------- AI USAGE --------------------------
//    The following section is [AI:R] on the 0rwx scale.
// ----------------------------------------------------------

/*
 * Continuous interval on the polygon boundary ∂P visible from a guard.
 */
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
 * Shoots a ray starding from the origin in the given direction and finds
 * the first ∂P point hit by the ray.
 *
 * @param rayOrigin - Starting point of the ray
 * @param rayThroughPoint - Point giving the direction of the ray
 * @param polygon - Polygon vertices in order
 * @returns The first boundary hit by the edge as a BoundaryCoord or null if there is no hit.
 */
export function shootRayToFirstBoundaryHit(
  rayOrigin: XY,
  rayThroughPoint: XY,
  polygon: XY[],
): BoundaryCoord | null {
  var bestIntersection = null;
  var bestDistance = Number.MAX_VALUE;
  var bestIndex = -1;
  for (var i = 0; i < polygon.length - 1; i++) {
    let intersection = computeRaySegmentIntersection(
      [rayOrigin, rayThroughPoint],
      [polygon[i], polygon[i + 1]],
    );
    if (intersection === null) {
      continue;
    }
    // If the current intersection point we found is closer to the origin of the ray,
    // then it gets hit before the currently stored intersection point. Store it.
    if (intersection.dist < bestDistance) {
      bestIntersection = intersection;
      bestDistance = intersection.dist;
      bestIndex = i;
    }
  }
  return bestIntersection
    ? {
        edgeIndex: bestIndex,
        t: bestIntersection.t,
        point: bestIntersection.point,
      }
    : null;
}

/**
 * Returns true if the vertex is an occluding vertex, that is it
 * casts a shadow, occluding some of the boundary behind it.
 * @param guard - The guard to check from
 * @param vertexIndex - Index of the vertex to check in the polygon
 * @param polygon - The polygon
 * @returns
 */
export function isOccludingVertex(
  guard: XY,
  vertexIndex: number,
  polygon: XY[],
): boolean {
  // Shoot ray from guard to vertex.
  let vertex = polygon[vertexIndex];
  let dx = vertex.x - guard.x;
  let dy = vertex.y - guard.y;
  let len = Math.hypot(dx, dy);

  if (len < 1e-9) return false;

  // Once you hit, extend the ray slightly beyond the vertex,
  // if that point is inside the polygon, that vertex casts
  // a shadow and return true.
  let probe: XY = {
    x: vertex.x + (dx / len) * 1e-4,
    y: vertex.y + (dy / len) * 1e-4,
  };

  return isPointInPolygon(probe, polygon);
}

export function computeVisibleIntervalsForVertex(
  guardIndex: number,
  polygon: XY[],
): VisibleInterval[] {
  let guard = polygon[guardIndex];
  let occludingVertices: XY[] = [];

  //// Find all occluding vertices that are visible from the guard
  polygon.forEach(function (vertex, index) {
    let firstIntercept = shootRayToFirstBoundaryHit(
      guard,
      vertex,
      polygon,
    )?.point;
    if (firstIntercept) {
      let dx = firstIntercept.x - vertex.x;
      let dy = firstIntercept.y - vertex.y;
      if (Math.hypot(dx, dy) < 1e-9) {
        // The first hit of the ray from the guard to the vertex is that vertex
        // If it's an occluding vertex, we save it.
        if (isOccludingVertex(guard, index, polygon)) {
          occludingVertices.push(vertex);
        }
      }
    }
  });

  let criticalPoints: XY[] = [];
  //// Get all critical points on the boundary
  occludingVertices.forEach(function (occludingVertex, index) {
    // We shoot a ray from the occludingVertex in the same direction as
    // the sightline from the guard to said vertex to find the boundary
    // intersection from which the boundary is visible from the guard.
    // - HAHAHAHAHA this is unreadable :')

    let dx = occludingVertex.x - guard.x;
    let dy = occludingVertex.y - guard.y;
    let len = Math.hypot(dx, dy);
    let extension: XY = {
      x: occludingVertex.x + dx / len,
      y: occludingVertex.y + dx / len,
    };

    let criticalPoint = shootRayToFirstBoundaryHit(
      occludingVertex,
      extension,
      polygon,
    )?.point;
    if (criticalPoint) {
      criticalPoints.push(criticalPoint);
    }
  });
}
