import type { XY } from "fabric";
import type { Edge } from "../types/geometry";

// ---------------------- AI USAGE --------------------------
//     The following section is [AI:0] on the 0rwx scale.
// ----------------------------------------------------------

export function distance(p1: XY, p2: XY) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function orient(p1: XY, p2: XY, p3: XY) {
  return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

export function intersectSegmentSegment(e1: [XY, XY], e2: [XY, XY]) {
  return (
    orient(e1[0], e1[1], e2[0]) * orient(e1[0], e1[1], e2[1]) <= 0 &&
    orient(e2[0], e2[1], e1[0]) * orient(e2[0], e2[1], e1[1]) <= 0
  );
}

export function intersectRaySegment(r: [XY, XY], e: [XY, XY]) {
  return orient(r[0], r[1], e[0]) * orient(r[0], r[1], e[1]) <= 0;
}

export function isConvex(n1: XY, p: XY, n2: XY) {
  return orient(n1, p, n2) > 0;
}

export function isInTriangle(p: XY, t1: XY, t2: XY, t3: XY) {
  const e1orient = Math.sign(orient(p, t1, t2));
  const e2orient = Math.sign(orient(p, t2, t3));
  const e3orient = Math.sign(orient(p, t3, t1));

  return e1orient === e2orient && e2orient === e3orient;
}

// Comparison function for leftmost points in lexicographic order
export function leftmost(p1: XY, p2: XY) {
  return p1.y < p2.y || (p1.y === p2.y && p1.x < p2.x) ? -1 : 1;
}

export function toSortedEdge(p1: XY, p2: XY) {
  return [p1, p2].sort(leftmost) as Edge;
}

// ---------------------- AI USAGE --------------------------
//    The following section is [AI:W] on the 0rwx scale.
// ----------------------------------------------------------

// Raycasting and segment intersection utilities

export interface SegmentIntersection {
  point: XY;
  t1: number; // Parameter along e1 in [0, 1]
  t2: number; // Parameter along e2 in [0, 1]
}

export interface RaySegmentIntersection {
  point: XY;
  t: number; // Parameter along segment in [0, 1]
  dist: number; // Distance from ray origin along ray direction (>= 0)
}

/**
 * Computes the intersection between two line segments e1=[p1, p2] and e2=[q1, q2].
 * Returns the intersection point and parameters if they intersect, or null otherwise.
 */
export function computeSegmentIntersection(
  e1: [XY, XY],
  e2: [XY, XY],
  eps = 1e-9,
): SegmentIntersection | null {
  const [p1, p2] = e1;
  const [q1, q2] = e2;

  const dx1 = p2.x - p1.x;
  const dy1 = p2.y - p1.y;
  const dx2 = q2.x - q1.x;
  const dy2 = q2.y - q1.y;

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < eps) {
    return null; // Parallel or collinear
  }

  const t1 = ((q1.x - p1.x) * dy2 - (q1.y - p1.y) * dx2) / denom;
  const t2 = ((q1.x - p1.x) * dy1 - (q1.y - p1.y) * dx1) / denom;

  if (t1 >= -eps && t1 <= 1 + eps && t2 >= -eps && t2 <= 1 + eps) {
    const clampedT1 = Math.max(0, Math.min(1, t1));
    const clampedT2 = Math.max(0, Math.min(1, t2));
    return {
      point: {
        x: p1.x + clampedT1 * dx1,
        y: p1.y + clampedT1 * dy1,
      },
      t1: clampedT1,
      t2: clampedT2,
    };
  }

  return null;
}

/**
 * Computes the intersection of a ray (origin -> dirPoint) with segment [q1, q2].
 * Ray direction is defined by (dirPoint - origin).
 */
export function computeRaySegmentIntersection(
  ray: [XY, XY],
  segment: [XY, XY],
  eps = 1e-9,
): RaySegmentIntersection | null {
  const [origin, dirPoint] = ray;
  const [q1, q2] = segment;

  const rdx = dirPoint.x - origin.x;
  const rdy = dirPoint.y - origin.y;
  const sdx = q2.x - q1.x;
  const sdy = q2.y - q1.y;

  const denom = rdx * sdy - rdy * sdx;
  if (Math.abs(denom) < eps) {
    return null; // Ray and segment are parallel
  }

  // origin + u * rdir = q1 + t * sdir
  const u = ((q1.x - origin.x) * sdy - (q1.y - origin.y) * sdx) / denom;
  const t = ((q1.x - origin.x) * rdy - (q1.y - origin.y) * rdx) / denom;

  if (u >= -eps && t >= -eps && t <= 1 + eps) {
    const clampedT = Math.max(0, Math.min(1, t));
    const clampedDist = Math.max(0, u);
    return {
      point: {
        x: q1.x + clampedT * sdx,
        y: q1.y + clampedT * sdy,
      },
      t: clampedT,
      dist: clampedDist,
    };
  }

  return null;
}

export function raySegmentIntersection(
  ray: [XY, XY],
  segment: [XY, XY],
): XY | null {
  const hit = computeRaySegmentIntersection(ray, segment);
  return hit ? hit.point : null;
}

/**
 * Checks if the line segment between p1 and p2 is contained inside polygon P (line-of-sight).
 * Ensures no proper intersection with any polygon edge, and midpoint lies inside polygon.
 */
export function isSegmentInsidePolygon(
  p1: XY,
  p2: XY,
  polygon: XY[],
  eps = 1e-7,
): boolean {
  const n = polygon.length;
  if (n < 3) return false;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < eps * eps) {
    return true;
  }

  // 1. Verify no boundary edge is properly crossed
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];

    const inter = computeSegmentIntersection([p1, p2], [a, b], eps);
    if (!inter) continue;

    // Check if the intersection is strictly in the interior of both segments
    const isInteriorSegment = inter.t1 > eps && inter.t1 < 1 - eps;
    const isInteriorEdge = inter.t2 > eps && inter.t2 < 1 - eps;

    if (isInteriorSegment && isInteriorEdge) {
      return false; // Crosses a boundary edge
    }
  }

  // 2. Check that the midpoint is inside or on the boundary of the polygon
  const mid: XY = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  return isPointInPolygon(mid, polygon);
}

/**
 * Standard ray-casting test for point-in-polygon containment.
 */
export function isPointInPolygon(p: XY, polygon: XY[], eps = 1e-9): boolean {
  const n = polygon.length;
  let inside = false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = polygon[i];
    const b = polygon[j];

    // Check if point lies on segment [a, b]
    const cross = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
    if (Math.abs(cross) < eps) {
      const dot = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
      const lenSq = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
      if (dot >= -eps && dot <= lenSq + eps) {
        return true; // Point is on polygon boundary
      }
    }

    const intersect =
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}
