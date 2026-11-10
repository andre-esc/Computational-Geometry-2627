import type { PointIndex, IndexTriangle, TriangleIndex } from "../types/geometry";
import { orient } from "./misc";

import type { XY } from "fabric";

type FunnelNode = {
    pointIndex: PointIndex;
    parent: FunnelNode | null;
}

function decomposeChain(chainTip: FunnelNode): FunnelNode[] {
    const res: FunnelNode[] = [];

    let current: FunnelNode | null = chainTip;

    while (current !== null) {
        res.push(current);

        current = current.parent;
    }

    return res;
}

// Finds the last common point in two chains
function getLastCommonAncestor(chain1: FunnelNode, chain2: FunnelNode): PointIndex | null {
    const arr1 = decomposeChain(chain1);
    const arr2 = decomposeChain(chain2);

    console.log("Decomposed:", arr1, arr2);

    const min = Math.min(arr1.length, arr2.length);

    // Traverse chains from bottom to top
    for (let i = 0; i < min; i++) {
        console.log(i);
        // On divergence, return the previous point in the chain
        if (arr1[arr1.length - 1 - i].pointIndex !== arr2[arr2.length - 1 - i].pointIndex) {
            // If at the start, the two chains have no common ancestor
            if (i === 0) {
                return null;
            } else {
                return arr1[arr1.length - i].pointIndex;
            }
        }
    }

    return arr1[arr1.length - min].pointIndex;
}

function cloneChainUntilPoint(chainTip: FunnelNode, point: PointIndex) {
    let currentClone: FunnelNode = { pointIndex: chainTip.pointIndex, parent: null };
    let current = chainTip;

    const res = currentClone;

    while (current.parent !== null && current.pointIndex !== point) {
        currentClone.parent = { pointIndex: current.parent.pointIndex, parent: null };

        current = current.parent;
        currentClone = currentClone.parent;
    }

    return res;
}

// Finds the left/right tangent from a target point to a concave chain
function getTangentToChain(pointRef: XY[], chainTip: FunnelNode, target: PointIndex, leftSide: boolean) {
    let current = chainTip;

    while (current.parent !== null) {
        const parentIndex = current.parent.pointIndex;
        const currentIndex = current.pointIndex;
        const turn = orient(pointRef[parentIndex], pointRef[currentIndex], pointRef[target]);

        if ((leftSide && turn < 0) || (!leftSide && turn > 0)) current = current.parent;
        else break;
    }

    return current;
}

function getThirdVertex(triangle: IndexTriangle, edge: [PointIndex, PointIndex]) {
    return triangle.find(v => v !== edge[0] && v !== edge[1]);
}

export function* getShortestPathTree(
    polygon: XY[], triangles: IndexTriangle[], 
    dualTree: TriangleIndex[][], commonEdgeMatrix: ([PointIndex, PointIndex] | null)[][],
    startPointIndex: PointIndex, startTriangleIndex: TriangleIndex
) {
    const spt: PointIndex[] = new Array(polygon.length).fill(-1);

    const stack: [TriangleIndex, FunnelNode, FunnelNode, PointIndex][] = [];

    const initialNode: FunnelNode = { pointIndex: startPointIndex, parent: null };

    // Add initial triangle vertices to SPT (one of them can be missed in cases where the triangulation produces a diagonal connected to the starting vertex)
    // Also covers adding the starting vertex itself
    for (let p of triangles[startTriangleIndex]) {
        spt[p] = startPointIndex;
    }

    // Add initial neighbors (NOTE: is there a way to do this better than just repeating the traversal step here?)
    for (let neighborTriangleIndex of dualTree[startTriangleIndex]) {
        const diagonal = commonEdgeMatrix[startTriangleIndex][neighborTriangleIndex];

        if (diagonal === null) throw new Error("Could not find common diagonals for initial triangle")  // For debugging purposes

        const [d1Index, d2Index] = diagonal;
        const d1Node: FunnelNode = { pointIndex: d1Index, parent: initialNode };
        const d2Node: FunnelNode = { pointIndex: d2Index, parent: initialNode };

        console.log("init diagonal:", diagonal);

        const diagonalOrient = orient(polygon[startPointIndex], polygon[d1Index], polygon[d2Index]);
        
        // Determine diagonal orientation
        if (diagonalOrient > 0) {
            stack.push([neighborTriangleIndex, d2Node, d1Node, startPointIndex]);
        } else if (diagonalOrient < 0) {
            stack.push([neighborTriangleIndex, d1Node, d2Node, startPointIndex]);
        } else {
            // One of the diagonal vertices *is* the starting point.
            // We will need to determine orientation by comparing the diagonal to the unshared neighbor point.

            // Vertex of neighbor triangle not on crossed diagonal
            const newVertexIndex = getThirdVertex(triangles[neighborTriangleIndex], diagonal)!;
            // Vertex of diagonal that isn't the starting point
            const otherDIndex = d1Index === startPointIndex ? d2Index : d1Index;

            const d = orient(polygon[startPointIndex], polygon[otherDIndex], polygon[newVertexIndex]);
            
            if (d < 0) {
                stack.push([neighborTriangleIndex, d2Node, d1Node, startPointIndex]);
            } else {
                stack.push([neighborTriangleIndex, d1Node, d2Node, startPointIndex]);
            }
        }
    }

    while (stack.length > 0) {
        // Left and right funnels should point to left and right vertices of the diagonal crossed to get to this triangle
        const [triangleIndex, leftFunnel, rightFunnel, apex] = stack.pop()!;

        console.log("Processing triangle", triangles[triangleIndex], ": [left =", leftFunnel, ", right =", rightFunnel, ", apex =", apex, "]");

        //// 1. Check if funnel is collapsed at this triangle. If it is, reset apex and funnels, then reprocess the triangle.

        // Check if the funnel is currently collapsed
        const funnelCollapsed = orient(polygon[apex], polygon[leftFunnel.pointIndex], polygon[rightFunnel.pointIndex]) > 0;  // Left and right funnels are crossed

        // Reset funnels and apex to common ancestor, then restart processing
        if (funnelCollapsed) {
            console.log("Funnel collapse");

            const newApex = getLastCommonAncestor(leftFunnel, rightFunnel);
            if (newApex === null) throw new Error("Could not find common funnel ancestor on funnel collapse");  // For debugging purposes

            const newLeft = cloneChainUntilPoint(leftFunnel, newApex);
            const newRight = cloneChainUntilPoint(rightFunnel, newApex);
            
            stack.push([triangleIndex, newLeft, newRight, newApex]);
            continue;
        }

        //// 2. Funnel correctness ensured. Now, find point along funnel walls that is part of the shortest path to the new vertex.

        // Vertex of triangle not on crossed diagonal
        const newVertexIndex = getThirdVertex(triangles[triangleIndex], [leftFunnel.pointIndex, rightFunnel.pointIndex])!;
        if (newVertexIndex === undefined) throw new Error("Could not find new vertex");  // For debugging purposes

        // Tangents from the new vertex to the funnel walls constitute the shortest path along each chain
        let newLeft = getTangentToChain(polygon, leftFunnel, newVertexIndex, true);
        let newRight = getTangentToChain(polygon, rightFunnel, newVertexIndex, false);
        console.log("Left tangent =", newLeft.pointIndex);
        console.log("Right tangent =", newRight.pointIndex);
        // The actual shortest path parent of the vertex
        let canonicalParent: FunnelNode;

        // The wrong side's tangent degenerates to the apex, unless both are the apex in which case the new vertex is a trivial case.
        if (newLeft.pointIndex === newRight.pointIndex) {
            // Trivial case, this is only true if both are the apex
            canonicalParent = newLeft;
        } else if (newLeft.pointIndex === apex) {
            // The new vertex belongs to the right funnel chain
            canonicalParent = newRight;
        } else if (newRight.pointIndex === apex) {
            // The new vertex belongs to the left funnel chain
            canonicalParent = newLeft;
        } else {
            throw new Error("Could not determine new vertex funnel side")  // For debugging purposes
        }

        // Add the shortest path to the SPT
        spt[newVertexIndex] = canonicalParent.pointIndex;

        // Yield intermediate path for visibility check
        yield [newVertexIndex, canonicalParent.pointIndex, canonicalParent.parent?.pointIndex];

        //// 3. For each neighbor, add them to the stack with funnels oriented depending on the crossed diagonal.

        for (let neighborTriangleIndex of dualTree[triangleIndex]) {
            const diagonal = commonEdgeMatrix[triangleIndex][neighborTriangleIndex];

            if (diagonal === null) throw new Error("Could not find common diagonal between neighboring triangles")  // For debugging purposes

            const newNode: FunnelNode = { pointIndex: newVertexIndex, parent: canonicalParent };
            const [d1Index, d2Index] = diagonal;  // Now you're thinking with portals /ref
            
            // Determine which side the crossed diagonal is on
            // Funnel pinching is handled when this triangle is actually processed (see earlier)
            if (d1Index === leftFunnel.pointIndex || d2Index === leftFunnel.pointIndex) {
                // Diagonal touches the left funnel
                stack.push([neighborTriangleIndex, leftFunnel, newNode, apex]);
            } else if (d1Index === rightFunnel.pointIndex || d2Index === rightFunnel.pointIndex) {
                // Diagonal touches the right funnel
                stack.push([neighborTriangleIndex, newNode, rightFunnel, apex]);
            }
        }
    }

    return spt;
}