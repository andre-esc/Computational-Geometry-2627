import type { XY } from "fabric";
import type { VisibilityMatrix } from "./visibilityMatrix";

export interface DominatingSetResult {
  guards: number[]; // Indices of the guards
  guardPoints: XY[]; // Coordinates of the guards
  // For visualisation purposes:
  iterations: number; // Number of local search improvements performed
  initialGreedySize: number; // Size before local search optimization
}

/**
 * Computes an initial greedy cover for ∂P.
 * @param vm - VisibilityMatrix for the given polygon.
 * @returns Set of indices of vertices that cover ∂P.
 */
export function greedySetCover(vm: VisibilityMatrix): Set<number> {
  const numWitnesses = vm.witnesses.length;
  const numCandidtaes = vm.candidates.length;

  const Q = new Set<number>();
  const isCovered = new Array(numWitnesses).fill(false);
  let coveredCount = 0;

  while (coveredCount < numWitnesses) {
    // Find the guard candidate that covers the most witness points.
    let bestCandidate = -1;
    let maxNewCovered = -1;

    for (let c = 0; c < numCandidtaes; c++) {
      // Skip if the set already contains this candidate.
      if (Q.has(c)) continue;

      let newCovered = 0;
      for (const w of vm.guardCoverage[c]) {
        // each witness seen by this candidate guard.
        if (!isCovered[w]) {
          newCovered += 1;
        }
      }

      if (newCovered > maxNewCovered) {
        maxNewCovered = newCovered;
        bestCandidate = c;
      }
    }

    // Make sure all witnesses are reachable; break if not.
    if (bestCandidate === -1 || maxNewCovered === 0) {
      break;
    }

    // Save the candidate that covers the most witnesses and mark
    // those as covered.
    Q.add(bestCandidate);
    for (const w of vm.guardCoverage[bestCandidate]) {
      if (!isCovered[w]) {
        isCovered[w] = true;
        coveredCount++;
      }
    }
  }

  return Q;
}
