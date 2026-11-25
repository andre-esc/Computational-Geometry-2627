import type { XY } from "fabric";
import {
  onBase,
  orient,
  computeSegmentIntersection,
  isPointInPolygon,
  isSegmentInsidePolygon,
  type ConstructedEdge,
} from "./misc";
import type { Triangle } from "../types/geometry";

export interface HoleGuard {
  guard: number;
  triangle: [XY, XY, XY];
  constructedEdge: [XY, XY];
}

/**
 * Implements the algorithm of Ashur et al. to guard holes in a boundary vertex guard
 *
 * @param polygon           The polygon to guard
 * @param constructedEdges  The constructed edges of existing boundary guards
 *
 * @returns A map of added guard indices to the triangles that they guard
 */
export function guardHoles(
  polygon: XY[],
  constructedEdges: ConstructedEdge[],
  existingGuards: number[] = [],
): Map<number, Triangle> {
  const all = constructedEdges.filter((edge) => onBase(edge, polygon));
  const extra = new Map<number, Triangle>();
  const guards = new Set(existingGuards);

  for (const edge of all.filter(isUpper)) {
    let best: { point: XY; otherBasePoint: XY } | null = null;
    const lower = edge.lower.point;
    const upper = edge.upper.point;

    for (const otherEdge of all) {
      if (otherEdge === edge) continue;

      const otherLower = otherEdge.lower.point;
      if (Math.sign(orient(lower, upper, otherLower)) !== edge.pocketSide)
        continue;

      const hit = computeSegmentIntersection(
        [lower, upper],
        [otherLower, otherEdge.upper.point],
      );
      if (hit && (!best || hit.point.y < best.point.y)) {
        best = { point: hit.point, otherBasePoint: otherLower };
      }
    }

    if (!best) continue;

    const triangle: Triangle = [lower, best.point, best.otherBasePoint];
    if (!triangleEdgesInsidePolygon(triangle, polygon)) continue;
    if (!hasUncoveredTrianglePoint(triangle, polygon, [...guards])) continue;

    const guard = findVertexSeeingTriangle(polygon, triangle, [...guards]);
    if (guard !== -1) {
      extra.set(guard, triangle);
      guards.add(guard);
    }
  }

  // Use interior samples when the constructed-edge candidates miss a hole.
  while (true) {
    const components = findUncoveredComponents(polygon, [...guards]);
    let addedGuard = false;

    if (w !== -1)
      extra.push({
        guard: w,
        triangle,
        constructedEdge: [lower1, upper1],
      });

    if (!addedGuard || guards.size === polygon.length) break;
  }

  return extra;
}

function findVertexSeeingTriangle(
  polygon: XY[],
  triangle: Triangle,
  existingGuards: number[],
): number {
  for (let guard = 0; guard < polygon.length; guard++) {
    if (existingGuards.includes(guard)) continue;
    if (
      triangle.every((point) =>
        isSegmentInsidePolygon(polygon[guard], point, polygon),
      )
    ) {
      return guard;
    }
  }
  return -1;
}

function triangleEdgesInsidePolygon(
  triangle: Triangle,
  polygon: XY[],
): boolean {
  return triangle.every((point, index) =>
    isSegmentInsidePolygon(
      point,
      triangle[(index + 1) % triangle.length],
      polygon,
    ),
  );
}

function hasUncoveredTrianglePoint(
  triangle: Triangle,
  polygon: XY[],
  guards: number[],
): boolean {
  const divisions = 8;
  for (let i = 1; i < divisions; i++) {
    for (let j = 1; j < divisions - i; j++) {
      const a = i / divisions;
      const b = j / divisions;
      const c = 1 - a - b;
      const point = {
        x: a * triangle[0].x + b * triangle[1].x + c * triangle[2].x,
        y: a * triangle[0].y + b * triangle[1].y + c * triangle[2].y,
      };
      if (
        isPointInPolygon(point, polygon) &&
        !guards.some((guard) =>
          isSegmentInsidePolygon(polygon[guard], point, polygon),
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

function findUncoveredComponents(polygon: XY[], guards: number[]): XY[][] {
  const minX = Math.min(...polygon.map((point) => point.x));
  const maxX = Math.max(...polygon.map((point) => point.x));
  const minY = Math.min(...polygon.map((point) => point.y));
  const maxY = Math.max(...polygon.map((point) => point.y));
  const step = Math.max(
    2,
    Math.min(8, Math.max(maxX - minX, maxY - minY) / 160),
  );
  const columns = Math.ceil((maxX - minX) / step);
  const rows = Math.ceil((maxY - minY) / step);
  const uncovered = new Map<number, XY>();

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const point = {
        x: minX + (column + 0.5) * step,
        y: minY + (row + 0.5) * step,
      };
      if (
        isPointInPolygon(point, polygon) &&
        !guards.some((guard) =>
          isSegmentInsidePolygon(polygon[guard], point, polygon),
        )
      ) {
        uncovered.set(row * columns + column, point);
      }
    }
  }

  const components: XY[][] = [];
  while (uncovered.size > 0) {
    const start = uncovered.keys().next().value as number;
    const queue = [start];
    const component: XY[] = [];
    uncovered.delete(start);

    while (queue.length > 0) {
      const index = queue.pop()!;
      component.push({
        x: minX + ((index % columns) + 0.5) * step,
        y: minY + (Math.floor(index / columns) + 0.5) * step,
      });
      const row = Math.floor(index / columns);
      const column = index % columns;
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const x = column + dx;
        const y = row + dy;
        if (x < 0 || x >= columns || y < 0 || y >= rows) continue;
        const neighbor = y * columns + x;
        if (uncovered.has(neighbor)) {
          queue.push(neighbor);
          uncovered.delete(neighbor);
        }
      }
    }

    components.push(component);
  }

  return components.sort((a, b) => b.length - a.length);
}

function findComponentTriangle(
  component: XY[],
  polygon: XY[],
): Triangle | null {
  if (component.length < 3) return null;

  const leftmost = component.reduce((best, point) =>
    point.x < best.x ? point : best,
  );
  const rightmost = component.reduce((best, point) =>
    point.x > best.x ? point : best,
  );
  const topmost = component.reduce((best, point) =>
    point.y < best.y ? point : best,
  );
  const bottommost = component.reduce((best, point) =>
    point.y > best.y ? point : best,
  );
  const extremes = [
    ...new Map(
      [leftmost, rightmost, topmost, bottommost].map((point) => [
        `${point.x},${point.y}`,
        point,
      ]),
    ).values(),
  ];

  let best: Triangle | null = null;
  let bestArea = 0;
  for (let i = 0; i < extremes.length; i++) {
    for (let j = i + 1; j < extremes.length; j++) {
      for (let k = j + 1; k < extremes.length; k++) {
        const triangle: Triangle = [extremes[i], extremes[j], extremes[k]];
        const area = Math.abs(orient(...triangle));
        if (area <= bestArea || !triangleEdgesInsidePolygon(triangle, polygon))
          continue;
        best = triangle;
        bestArea = area;
      }
    }
  }
  return best;
}

function findVertexSeeingComponent(
  polygon: XY[],
  component: XY[],
  triangle: Triangle,
  existingGuards: number[],
): number {
  for (let guard = 0; guard < polygon.length; guard++) {
    if (existingGuards.includes(guard)) continue;
    if (
      triangle.every((point) =>
        isSegmentInsidePolygon(polygon[guard], point, polygon),
      ) &&
      component.every((point) =>
        isSegmentInsidePolygon(polygon[guard], point, polygon),
      )
    ) {
      return guard;
    }
  }
  return -1;
}

function isUpper(edge: ConstructedEdge): boolean {
  const lower = edge.lower.point;
  const upper = edge.upper.point;
  const downSide = Math.sign(
    orient(lower, upper, { x: lower.x, y: lower.y + 1 }),
  );
  return edge.pocketSide === downSide;
}
