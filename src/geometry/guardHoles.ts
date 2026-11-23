import type { XY } from "fabric";
import { onBase, orient, computeSegmentIntersection, isSegmentInsidePolygon, type ConstructedEdge } from "./misc";

export function guardHoles(polygon: XY[], constructedEdges: ConstructedEdge[]): number[] {
  const all = constructedEdges.filter(e => onBase(e, polygon));
  const extra = new Set<number>();

  for (const e of all.filter(e => isUpper(e))) {
    let best: { p: XY; x2: XY } | null = null;

    const lower1 = e.lower.point, upper1 = e.upper.point;

    for (const e2 of all) {
      if (e2 === e) continue;
      
      const lower2 = e2.lower.point, upper2 = e2.upper.point;

      // x' must be on the same side of line(e) as the pocket
      if (Math.sign(orient(lower1, upper1, lower2)) !== e.pocketSide) continue;

      const hit = computeSegmentIntersection([lower1, upper1], [lower2, upper2]);
      if (!hit) continue;
      if (!best || hit.point.y < best.p.y) best = { p: hit.point, x2: lower2 }; // topmost = smallest canvas y
    }

    if (best) {
      const w = findVertexSeeingTriangle(polygon, [lower1, best.p, best.x2]);
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
  const lower = e.lower.point, upper = e.upper.point;

  const downSide = Math.sign(orient(lower, upper, { x: lower.x, y: lower.y + 1 }));
  return e.pocketSide === downSide;
}