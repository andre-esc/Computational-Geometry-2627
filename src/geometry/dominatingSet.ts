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

//
export function localSearchDominatingSet(
  vm: VisibilityMatrix,
): DominatingSetResult {
  const numWitnesses = vm.witnesses.length;
  const numCandidates = vm.candidates.length;

  const Q = greedySetCover(vm);
  const initialGreedySize = Q.size;

  // Compute how many guards of Q cover each witness.
  const coverageCount = new Uint32Array(numWitnesses);
  for (const g of Q) {
    for (const w of vm.guardCoverage[g]) {
      coverageCount[w]++;
    }
  }

  let iterations = 0;
  let improved = true;

  while (improved) {
    improved = false;

    // 1. PRUNING
    // Removing redundant guards

    for (const g of Array.from(Q)) {
      let canRemove = true;
      for (const w of vm.guardCoverage[g]) {
        if (coverageCount[w] === 1) {
          // This witness is only covered by a single guard,
          // we cannot remove that guard.
          canRemove = false;
          break;
        }
      }

      if (canRemove) {
        // This guard can be safely removed while keeping
        // all witnesses covered.
        Q.delete(g);
        for (const w of vm.guardCoverage[g]) {
          coverageCount[w] -= 1;
        }

        improved = true;
        iterations += 1;
        break; // Loop again with reduced set.
      }
    }

    if (improved) continue;

    // 2. SWAPS
    // Replace 2 guards with 1 guard.

    const guardArray = Array.from(Q);
    for (let i = 0; i < guardArray.length && !improved; i++) {
      const guard1 = guardArray[i];

      for (let j = i + 1; j < guardArray.length && !improved; j++) {
        const guard2 = guardArray[j];

        // Get the set of witnesses only covered by guards 1 and 2
        const lostWitnesses: number[] = [];
        for (const w of vm.guardCoverage[guard1]) {
          // w is seen by guard1
          let guard2SeesW = vm.matrix[guard2][w];
          if (coverageCount[w] - (guard2SeesW ? 1 : 0) <= 1) {
            // This evaluates to true if the number of guards excluding guard2
            // seeing w is 1. Meaning that w is only seen by guard1 & guard2.
            lostWitnesses.push(w);
          }
        }
        // Same logic for the other way round.
        for (const w of vm.guardCoverage[guard2]) {
          let guard1SeesW = vm.matrix[guard1][w];
          if (coverageCount[w] - (guard1SeesW ? 1 : 0) <= 1) {
            lostWitnesses.push(w);
          }
        }

        // Try to find a new guard g' not in Q that can cover all those lost witnesses.
        for (let guardPrime = 0; guardPrime < numCandidates; guardPrime++) {
          if (Q.has(guardPrime)) continue;

          let coversAllLostWitnesses = true;
          for (const w of lostWitnesses) {
            if (!vm.matrix[guardPrime][w]) {
              coversAllLostWitnesses = false;
              break;
            }
          }

          if (coversAllLostWitnesses) {
            // 2-FOR-1 SWAP:
            // Q = (Q \ {guard1, guard2}) ∪ {gPrime}
            Q.delete(guard1);
            Q.delete(guard2);
            Q.add(guardPrime);

            for (const w of vm.guardCoverage[guard1]) coverageCount[w] -= 1;
            for (const w of vm.guardCoverage[guard2]) coverageCount[w] -= 1;
            for (const w of vm.guardCoverage[guardPrime]) coverageCount[w] += 1;

            improved = true;
            iterations += 1;
            break;
          }
        }
      }
    }
  }
  const guards = Array.from(Q).sort((a, b) => a - b);
  return {
    guards,
    guardPoints: guards.map((idx) => vm.candidates[idx]),
    iterations,
    initialGreedySize,
  } as DominatingSetResult;
}
