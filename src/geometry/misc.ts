import type { XY } from "fabric";
import type { Edge } from "../types/geometry";

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
    return orient(r[0], r[1], e[0]) * orient(r[0], r[1], e[1]) <= 0
}

export function isConvex(n1: XY, p: XY, n2: XY) {
  return orient(n1, p, n2) > 0;
}

export function isInTriangle(p: XY, t1: XY, t2: XY, t3: XY) {
  const e1orient = Math.sign(orient(p, t1, t2));
  const e2orient = Math.sign(orient(p, t2, t3));
  const e3orient = Math.sign(orient(p, t3, t1));

  return (
    e1orient === e2orient && e2orient === e3orient
  );
}

// Comparison function for leftmost points in lexicographic order
export function leftmost(p1: XY, p2: XY) {
    return (p1.y < p2.y) || (p1.y === p2.y && p1.x < p2.x) ? -1 : 1;
}

export function toSortedEdge(p1: XY, p2: XY) {
    return [p1, p2].sort(leftmost) as Edge
}