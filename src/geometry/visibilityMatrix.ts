import type { XY } from "fabric";
import type { WitnessPoint } from "./witnessSet";
import { isSegmentInsidePolygon } from "./misc";

export interface VisibilityMatrix {
  candidates: XY[]; // The set C of all vertices of the polygon
  witnesses: WitnessPoint[]; // the set W of all witness points.
  matrix: boolean[][]; // the actual visibility matrix [g][w] returning true if g sees w.
  guardCoverage: number[][]; // indexed at [g], give the array of witness indices seen by g.
  witnessCoveredBy: number[][]; // indexed at [w], gives the array of guard indices seeing w.
}

/**
 * Construct bipartite visibility matrix between
 * candidate guard vertices and boundary witness points.
 * @param polygon
 * @param witnesses
 */
export function buildVisibilityMatrix(
  polygon: XY[],
  witnesses: WitnessPoint[],
): VisibilityMatrix {
  const n = polygon.length;
  const m = witnesses.length;

  const matrix: boolean[][] = Array.from({ length: n }, () =>
    new Array(m).fill(false),
  );
  const guardCoverage: number[][] = Array.from({ length: n }, () => []);
  const witnessCoveredBy: number[][] = Array.from({ length: m }, () => []);

  for (let i = 0; i < n; i++) {
    const guard = polygon[i];
    for (let j = 0; j < m; j++) {
      const witness = witnesses[j];

      // Check if witness is visible from guard.
      if (isSegmentInsidePolygon(guard, witness.point, polygon)) {
        matrix[i][j] = true;
        guardCoverage[i].push(j);
        witnessCoveredBy[j].push(i);
      }
    }
  }

  return {
    candidates: polygon,
    witnesses,
    matrix,
    guardCoverage,
    witnessCoveredBy,
  };
}
