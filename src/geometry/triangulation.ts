import type { XY } from "fabric";
import { getCircular, sliceCircular } from "../util/circularList";
import { isConvex, isInTriangle, leftmost } from "./misc";
import type { Edge, Triangle } from "../types/geometry";
import { getSpanningTree } from "./spanningTree";

// Returns index of ear
export function findEarIndex(points: XY[]): number {
    // Base case
    if (points.length === 3) return 1;

    const half = Math.ceil(points.length / 2);

    let convexIndex = -1;

    // Find first convex vertex opposite to first edge
    for (let i = 0; i < points.length / 2; i++) {
        if (convexIndex !== -1) break;
        
        for (let d of [-1, 1]) {
            const ii = half + d * i;

            const p = points[ii];
            const n1 = getCircular(points, ii - 1);
            const n2 = getCircular(points, ii + 1);

            if (isConvex(n1, p, n2)) {
                convexIndex = ii;
                break;
            }
        }
    }

    // There is always a convex edge, so no need to check existence
    const conv = points[convexIndex];
    const n1 = getCircular(points, convexIndex - 1);
    const n2 = getCircular(points, convexIndex + 1);

    // Vertex that (potentially) makes this not an ear
    let offendingVertex = -1;

    // Check if ear
    for (let i = 0; i < points.length; i++) {
        if (isInTriangle(points[i], n1, conv, n2)) {
            offendingVertex = i;

            break;
        }
    }

    if (offendingVertex === -1) {
        return convexIndex;    // Already an ear
    } else {
        let newBad = 
            offendingVertex > convexIndex ? 
                [convexIndex, offendingVertex] : 
                [offendingVertex, convexIndex];

        // If this order would give the larger sub-polygon, invert
        if (newBad[1] - newBad[0] > points.length/2) {
            newBad = [newBad[1], newBad[0]];
        }

        const subPolygon = sliceCircular(points, newBad[0], Math.abs(newBad[1] - newBad[0]));
        const earIndex = findEarIndex(subPolygon);
        // Add back the index offset lost when passing to sub-polygon indices
        return (earIndex + newBad[0]) % points.length;
    }
}

function getTriangleEdges(triangle: Triangle): [Edge, Edge, Edge] {
    return [
        ([triangle[0], triangle[1]].sort(leftmost) as Edge),
        ([triangle[1], triangle[2]].sort(leftmost) as Edge),
        ([triangle[2], triangle[0]].sort(leftmost) as Edge),
    ]
}

// Returns array of triplets
// Recursively finds an ear and removes it for triangulation
export function triangulate(points: XY[]) {

    const edgeMap = new Map<Edge, number[]>();

    function _triangulate(_points: XY[]): Triangle[] {
        // Base case
        if (points.length === 3) {
            return [[points[0], points[1], points[2]]];
        }

        const earIndex = findEarIndex(points);

        const ear = points[earIndex];
        const n1 = getCircular(points, earIndex - 1);
        const n2 = getCircular(points, earIndex + 1);

        const newPoints = points.slice();
        newPoints.splice(earIndex, 1);

        const triangle: Triangle = [n1, ear, n2];

        const res = _triangulate(newPoints);
        const triangleIndex = res.length;

        for (let e of getTriangleEdges(triangle)) {
            const mapping = (edgeMap.get(e) || []);
            mapping.push(triangleIndex);

            edgeMap.set(e, mapping);
        }

        res.push(triangle);

        return res
    }

    const triangles = _triangulate(points);
    
    // Construct dual graph
    const adjacencyList = new Array(triangles.length).map(() => new Array<number>());

    for (let [_, indices] of edgeMap) {
        // Note: This length is never greater than 2
        if (indices.length == 2) {
            adjacencyList[indices[0]].push(indices[1]);
            adjacencyList[indices[1]].push(indices[0]);
        }
    }

    const tree = getSpanningTree(adjacencyList);

    // tree
}

export function isWeaklyVisible(triangles: Triangle[], dualTree: number[]) {
    // Using DFS, identify sleeves (chains with no branching)
        // Store path while traversing
        // When hitting leaf node, pause traversal and process current path (see next step)
        // After, erase current path and continue DFS traversal
    
    // For each sleeve
        // (Construct shortest-path trees from base edge vertices to all vertices touched by sleeve) :
        // For each base edge vertex V
            // Init L = R = APEX = V
            // Init CurrentPathToApex = []
            // For each crossed diagonal edge along the sleeve (inner edge formed by triangulation, i.e. an edge on the dual tree)
                // Let d1, d2 = vertices of diagonal edge, with d1 being the edge not yet in funnel (since one will always already be in funnel)
                    // d1 is on the left path if (d1, APEX, d2) = left turn
                    // Else d1 is on the right path
                // If d1 is on the left path
                    // If (APEX, L, d1) = right turn (convex)
                        // L <- d1
                        // Shortest path from V to d1 = (V -> CurrentPathToApex -> d1)
                    // If (APEX, L, R) = left turn (we pinched the funnel)
                        // CurrentPathToApex.push(APEX)
                        // APEX <- R
                // Else if d1 is on the right path
                    // If (APEX, R, d1) = left turn (convex)
                        // R <- d1
                        // Shortest path from V to d1 = (V -> CurrentPathToApex -> d1)
                    // If (APEX, R, L) = right turn (we pinched the funnel)
                        // CurrentPathToApex.push(APEX)
                        // APEX <- L
    
}