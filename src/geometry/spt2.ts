import type { IndexTriangle, TriangleIndex, PointIndex } from "../types/geometry";
import { orient } from "./misc";

import type { XY } from "fabric";

type Funnel = {
    funnel: PointIndex[];  // BST [d1, ..., apex, ..., d2] containing the shortest paths from apex to d1 and d2
    apexAt: number;
};

// Gets the vertex of the given triangle that is not on the given edge
function getThirdVertex(triangle: IndexTriangle, edge: [PointIndex, PointIndex]) {
    return triangle.find(v => v !== edge[0] && v !== edge[1])!;
}

function binarySearchHelper(left: number, right: number, getLeftResult: boolean, leftComparison: (mid: number) => boolean) {
    const floorCeil = getLeftResult ? Math.ceil : Math.floor;

    let leftRes = -1, rightRes = -1;
    
    while (right > left) {
        const mid = floorCeil((left + right) / 2);

        if (leftComparison(mid)) {
            left = mid + 1;
            leftRes = mid;
        } else {
            right = mid - 1;
            rightRes = mid;
        }
    }

    return getLeftResult ? leftRes : rightRes;
}

function findTangentToFunnel(pointRef: XY[], funnel: PointIndex[], apexAt: number, target: PointIndex) {
    // 1. Find where the orientation of [target]->[point]->[next point towards apex] changes along each side of the funnel.
    // 2. If tangent on only one side degenerates to the apex (res = -1), the tangent is along the other side.
    // 3. If both degenerate, then the apex can see the point, and the "tangent" is the apex itself.

    if (funnel.length < 2) throw new Error("Tried to find tangent with funnel of insufficient length");
    else if (funnel.length === 2) return apexAt;  // If funnel is an edge, make sure to connect future operations to the apex.

    // We search where [left becomes right] or where [right becomes left], depending on the funnel orientation.
    const funnelOrientation = orient(pointRef[funnel[0]], pointRef[funnel[apexAt]], pointRef[funnel[funnel.length - 1]]);
    const searchDirection = Math.sign(funnelOrientation);

    const resBeforeApex = binarySearchHelper(0, apexAt, false, mid => {
        const turn = orient(pointRef[target], pointRef[funnel[mid]], pointRef[funnel[mid+1]]);

        return searchDirection * turn > 0;
    })

    const resAfterApex = binarySearchHelper(apexAt, funnel.length-1, true, mid => {
        const turn = orient(pointRef[target], pointRef[funnel[mid]], pointRef[funnel[mid-1]]);

        return searchDirection * turn > 0;
    })
    
    if (resBeforeApex === resAfterApex) {  // Only happens if both are -1
        return apexAt;
    } else {
        // Check if tangent is the funnel's edge or the point right before it

        const res = resBeforeApex !== -1 ? resBeforeApex : resAfterApex;

        const edge = resBeforeApex !== -1 ? [0, 1, 2] : [funnel.length - 1, funnel.length - 2, funnel.length - 3];
        if (res !== edge[1]) return res;

        const firstTurn = orient(pointRef[target], pointRef[funnel[edge[0]]], pointRef[funnel[edge[1]]]);
        const secondTurn = orient(pointRef[target], pointRef[funnel[edge[1]]], pointRef[funnel[edge[2]]]);

        if (firstTurn * secondTurn <= 0) return edge[1];
        else return edge[0];
    }
}

/**
 * Computes the Shortest Path Tree of a polygon from a given vertex
 * 
 * @param polygon               The points of the polygon
 * @param triangles             The triangles of the polygon's triangulation
 * @param dualTree              The dual tree of the polygon's triangulation
 * @param commonEdgeMatrix      Matrix storing common edges between triangles of the triangulation
 * @param startPointIndex       Index of the starting point (root of the SPT)
 * @param startTriangleIndex    Index of the triangle containing the starting point
 * 
 * @returns The SPT from the given point
 */
export default function computeShortestPathTree(
    polygon: XY[], triangles: IndexTriangle[], 
    dualTree: TriangleIndex[][], commonEdgeMatrix: ([PointIndex, PointIndex] | null)[][],
    startPointIndex: PointIndex, startTriangleIndex: TriangleIndex
) {
    // Convention: if a variable is named [...]At, it represents an index in a PointIndex[]. Else, it represents what its type alias says.

    const spt: PointIndex[] = new Array(polygon.length).fill(-1);

    for (const p of triangles[startTriangleIndex]) spt[p] = startPointIndex;

    const stack: [TriangleIndex, Funnel][] = [];

    for (const neighborTriangleIndex of dualTree[startTriangleIndex]) {
        const diagonal = commonEdgeMatrix[startTriangleIndex][neighborTriangleIndex];

        if (diagonal === null) throw new Error("Could not find common diagonals for initial triangle")  // For debugging purposes

        const [d1Index, d2Index] = diagonal;

        const startInDiagonal = diagonal.indexOf(startPointIndex);

        if (startInDiagonal > -1) {
            stack.push([neighborTriangleIndex, { funnel: [d1Index, d2Index], apexAt: startInDiagonal }]);
        } else {
            stack.push([neighborTriangleIndex, { funnel: [d1Index, startPointIndex, d2Index], apexAt: 1 }]);
        }
    }

    while (stack.length > 0) {
        const [triangleIndex, { funnel, apexAt }] = stack.pop()!;

        // console.log(funnel, apexAt);

        const d1 = funnel[0], d2 = funnel[funnel.length - 1];

        const newVertexIndex = getThirdVertex(triangles[triangleIndex], [d1, d2]);
        const tangentAt = findTangentToFunnel(polygon, funnel, apexAt, newVertexIndex);

        // Split funnel into two at the tangent
        const newFunnel1: Funnel = {
            funnel: [...funnel.slice(0, tangentAt+1), newVertexIndex],
            apexAt: Math.min(tangentAt, apexAt)
        }
        const newFunnel2: Funnel = {
            funnel: [newVertexIndex, ...funnel.slice(tangentAt)],
            // Compensate for the shifted apex indices after splitting
            apexAt: tangentAt < apexAt ? apexAt - tangentAt + 1 : 1
        }     

        spt[newVertexIndex] = funnel[tangentAt];

        const [firstNewD1, firstNewD2] = d1 > newVertexIndex ?
            [newVertexIndex, d1] :
            [d1, newVertexIndex];

        for (const neighborTriangleIndex of dualTree[triangleIndex]) {
            const diagonal = commonEdgeMatrix[triangleIndex][neighborTriangleIndex];

            if (diagonal === null) throw new Error("Could not find common diagonals for initial triangle")  // For debugging purposes

            const [neighborD1, neighborD2] = diagonal;
            
            if (neighborD1 === firstNewD1 && neighborD2 === firstNewD2) {
                stack.push([neighborTriangleIndex, newFunnel1]);
            } else {
                stack.push([neighborTriangleIndex, newFunnel2]);
            }
        }
    }

    return spt;
}