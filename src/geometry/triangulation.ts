import { getCircular } from "../util/circularList";
import { isConvex, isInTriangle } from "./misc";
import { getSpanningTree } from "./spanningTree";
import type { PointIndex, IndexTriangle, TriangleIndex } from "../types/geometry";

import type { XY } from "fabric";

function isAnEar(index: number, pointRef: XY[], availablePoints: number[]) {
    if (availablePoints.length <= 3) return true;
    
    const p = pointRef[availablePoints[index]];
    const n1 = pointRef[getCircular(availablePoints, index - 1)];
    const n2 = pointRef[getCircular(availablePoints, index + 1)];

    if (!isConvex(n1, p, n2)) return false;

    for (let q of availablePoints) {
        if (isInTriangle(pointRef[q], n1, p, n2)) return false;
    }

    console.log(`${getCircular(availablePoints, index - 1)} ${availablePoints[index]} ${getCircular(availablePoints, index + 1)} is an ear`);

    return true;
}

/**
 * Finds an ear in a simple polygon.
 * 
 * @param pointRef Dictionary of points
 * @param availablePoints Index of the points of the polygon (actual coordinates are stored in pointRef)
 * 
 * @returns Index of a point that is an ear
 */
function findEarIndex(pointRef: XY[], availablePoints: number[]): number {
    let i = 0;


    console.log(availablePoints);
    for (; i < availablePoints.length; i++) {
        if (isAnEar(i, pointRef, availablePoints)) {
            console.log("Found ear", availablePoints[i], "at index", i, "of polygon", availablePoints);

            return i;
        }
    }

    throw new Error("Ear not found!!!");
}

// Returns a string representation of an edge
function stringifyEdge(edge: [PointIndex, PointIndex]) {
    return `${edge[0]} ${edge[1]}`;
}
// Returns the edge from a string representation
function destringifyEdge(edgeString: string) {
    return edgeString.split(" ").map(Number) as [number, number];
}

export type TriangulationDualTree = {
    triangles: IndexTriangle[];                                 // Triangles of the triangulation
    dualTree: TriangleIndex[][];                                // Adjacency list of the triangulation's dual tree
    rootIndex: TriangleIndex;                                   // Index of the dual tree's root
    commonEdgeMatrix: ([PointIndex, PointIndex] | null)[][];    // Matrix storing common edges between triangles
}

/**
 * Triangulates a polygon and returns its dual tree.
 * 
 * @param points Points of the polygon
 * 
 * @returns The triangulation and its corresponding dual tree, with root at the polygon's first edge.
 */
export function triangulate(points: XY[]): TriangulationDualTree {
    
    // edgeMap.get("i j") gives the index of all triangles sharing the edge [points[i], points[j]]
    const edgeMap = new Map<string, TriangleIndex[]>();
    const dualGraphAdjacencyList: number[][] = [];

    function _triangulate(availablePoints: PointIndex[]): IndexTriangle[] {
        let triangle: IndexTriangle, res: IndexTriangle[], triangleIndex: number;

        // Base case
        if (availablePoints.length === 3) {
            triangle = [...(availablePoints as [PointIndex, PointIndex, PointIndex])];

            res = [];
            triangleIndex = 0;
        } else {
            const earIndex = findEarIndex(points, availablePoints);

            const n1 = getCircular(availablePoints, earIndex - 1);
            const n2 = getCircular(availablePoints, earIndex + 1);

            const newPoints = availablePoints.slice();
            newPoints.splice(earIndex, 1);
            console.log("removed ear", availablePoints[earIndex], "new poly", newPoints);

            triangle = [n1, availablePoints[earIndex], n2];

            res = _triangulate(newPoints);
            triangleIndex = res.length;
        }
        
        dualGraphAdjacencyList.push([]);
        
        for (let p1 = 0; p1 < 3; p1++) {
            const p2 = (p1 + 1) % 3;
            
            const t1 = triangle[p1], t2 = triangle[p2];
            const edge = (t1 < t2 ? [t1, t2] : [t2, t1]) as [PointIndex, PointIndex];  // Consistent index ordering
            const edgeString = stringifyEdge(edge);
            
            let mapping = edgeMap.get((edgeString));

            if (mapping === undefined) {
                edgeMap.set(edgeString, [triangleIndex]);
            } else {
                // Build adjacency list of dual graph as we go
                for (let adjIndex of mapping) {
                    dualGraphAdjacencyList[triangleIndex].push(adjIndex);
                    dualGraphAdjacencyList[adjIndex].push(triangleIndex);
                }

                edgeMap.set(edgeString, [...mapping, triangleIndex]);
            }
        }

        res.push(triangle);

        return res
    }

    const triangles = _triangulate(points.map((_, i) => i));

    console.log("triangulation", triangles);
    console.log("root index", edgeMap.get("0 1"));
    
    // Adjacency matrix storing the common edges
    const commonEdgeMatrix = new Array(triangles.length).fill(null).map(() => new Array<[PointIndex, PointIndex] | null>(triangles.length).fill(null));

    for (let [edgeString, indices] of edgeMap) {
        // Note: This length is never greater than 2
        if (indices.length == 2) {
            const edge = destringifyEdge(edgeString);

            commonEdgeMatrix[indices[0]][indices[1]] = edge;
            commonEdgeMatrix[indices[1]][indices[0]] = edge;
        }
    }

    console.log("common edge matrix", commonEdgeMatrix);

    const rootIndex = edgeMap.get("0 1")![0];  // Boundary edges always have one element (triangle) in edgeMap
    const dualTree = getSpanningTree(dualGraphAdjacencyList, rootIndex);

    console.log("root index", rootIndex);
    console.log("adjacency list", dualGraphAdjacencyList);
    console.log("dual tree", dualTree);

    // console.log("Weakly visible ?", isWeaklyVisible(points, triangles, tree, commonEdgeMatrix, rootIndex));

    // return []

    return { triangles, dualTree, rootIndex, commonEdgeMatrix };
}
