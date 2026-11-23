import type { XY } from "fabric";
import { onBase, orient, computeSegmentIntersection, isSegmentInsidePolygon, type ConstructedEdge } from "./misc";

export function guardHoles(polygon: XY[], constructedEdges: ConstructedEdge[]): number[] {
  const all = constructedEdges.filter(e => onBase(e, polygon));
  const extra = new Set<number>();

  for (const e of all.filter(e => isUpper(e))) {
    let best: { p: XY; x2: XY } | null = null;

    for (const e2 of all) {
      if (e2 === e) continue;
      // x' must be on the same side of line(e) as the pocket
      if (Math.sign(orient(e.lower, e.upper, e2.lower)) !== e.pocketSide) continue;

      const hit = computeSegmentIntersection([e.lower, e.upper], [e2.lower, e2.upper]);
      if (!hit) continue;
      if (!best || hit.point.y < best.p.y) best = { p: hit.point, x2: e2.lower }; // topmost = smallest canvas y
    }

    if (best) {
      const w = findVertexSeeingTriangle(polygon, [e.lower, best.p, best.x2]);
      if (w !== -1) extra.add(w);
    }
  }
  return [...extra];
}

function findVertexSeeingTriangle(polygon: XY[], tri: XY[]): number {
  for (let w = 0; w < polygon.length; w++) {
    if (tri.every(c => isSegmentInsidePolygon(polygon[w], c, polygon))) return w;
  }
  return -1;
}


function isUpper(e: ConstructedEdge): boolean {
  const downSide = Math.sign(orient(e.lower, e.upper, { x: e.lower.x, y: e.lower.y + 1 }));
  return e.pocketSide === downSide;
}