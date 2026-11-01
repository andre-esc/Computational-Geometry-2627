import type { XY } from "fabric";
import { getCircular } from "../util/circularList";
import { isConvex, isInTriangle, orient } from "./misc";
import { getSpanningTree } from "./spanningTree";

// To separate the two index types for readability
type PointIndex = number;
type TriangleIndex = number;

type IndexTriangle = [PointIndex, PointIndex, PointIndex];

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

    for (; i < availablePoints.length; i++) {
        if (isAnEar(i, pointRef, availablePoints)) {
            console.log("Found ear", availablePoints[i], "at index", i, "of polygon", availablePoints);

            return i;
        }
    }

    throw new Error("Ear not found!!!");

    // Base case
    // if (availablePoints.length === 3) return 1;

    // const half = Math.ceil(availablePoints.length / 2);

    // let convexIndex = -1;



    // // Find first convex vertex opposite to first edge
    // for (let i = 0; i < availablePoints.length / 2; i++) {
    //     if (convexIndex !== -1) break;
        
    //     for (let d of [-1, 1]) {
    //         const ii = half + d * i;

    //         const p = pointRef[availablePoints[ii]];
    //         const n1 = pointRef[getCircular(availablePoints, ii - 1)];
    //         const n2 = pointRef[getCircular(availablePoints, ii + 1)];
    //         console.log("convex test", getCircular(availablePoints, ii - 1), availablePoints[ii], getCircular(availablePoints, ii + 1), isConvex(n1, p, n2));

    //         if (isConvex(n1, p, n2)) {
    //             convexIndex = ii;
    //             break;
    //         }
    //     }
    // }

    // // There is always a convex edge, so no need to check existence
    // const conv = pointRef[availablePoints[convexIndex]];
    // const n1 = pointRef[getCircular(availablePoints, convexIndex - 1)];
    // const n2 = pointRef[getCircular(availablePoints, convexIndex + 1)];

    // // Vertex that (potentially) makes this not an ear
    // let offendingVertexIndex = -1;

    // // console.log("convexIndex", convexIndex);
    // // console.log("triangle points", n1, conv, n2);

    // // Check if ear
    // for (let i = 0; i < availablePoints.length; i++) {
    //     const testVertex = pointRef[availablePoints[i]];
    //     const testN1 = pointRef[getCircular(availablePoints, i - 1)];
    //     const testN2 = pointRef[getCircular(availablePoints, i + 1)];

    //     console.log(getCircular(availablePoints, i - 1), availablePoints[i], getCircular(availablePoints, i + 1));

    //     if (!isConvex(testN1, testVertex, testN2) && isInTriangle(pointRef[availablePoints[i]], n1, conv, n2)) {
    //         offendingVertexIndex = i;

    //         break;
    //     }
    // }

    // if (offendingVertexIndex === -1) {
    //     return convexIndex;    // Already an ear
    // } else {
    //     let newBad = 
    //         offendingVertexIndex > convexIndex ? 
    //             [convexIndex, offendingVertexIndex] : 
    //             [offendingVertexIndex, convexIndex];

    //     // If this order would give the larger sub-polygon, invert
    //     if (newBad[1] - newBad[0] > availablePoints.length/2) {
    //         newBad = [newBad[1], newBad[0]];
    //     }

    //     const subPolygon = sliceCircular(availablePoints, newBad[0], newBad[1]);
    //     console.log("new bad index", newBad);
    //     console.log("polygon", availablePoints, "tested ear", availablePoints[convexIndex], "offending", availablePoints[offendingVertexIndex], "new bad", [availablePoints[newBad[0]], availablePoints[newBad[1]]], "subpolygon", subPolygon);
    //     const earIndex = findEarIndex(pointRef, subPolygon);
    //     // Add back the index offset lost when passing to sub-polygon indices
    //     return (earIndex + newBad[0]) % availablePoints.length;
    // }
}

// Returns a string representation of an edge
function stringifyEdge(edge: [PointIndex, PointIndex]) {
    return `${edge[0]} ${edge[1]}`;
}
// Returns the edge from a string representation
function destringifyEdge(edgeString: string) {
    return edgeString.split(" ").map(Number) as [number, number];
}

/**
 * 
 * @param points Points of the polygon
 */
export function triangulate(points: XY[]) {
    
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

    // console.log("common edge matrix", commonEdgeMatrix);

    const rootIndex = edgeMap.get("0 1")![0];  // Boundary edges always have one element (triangle) in edgeMap
    const tree = getSpanningTree(dualGraphAdjacencyList, rootIndex);

    // console.log("root index", rootIndex);
    // console.log("adjacency list", dualGraphAdjacencyList);
    // console.log("dual tree", tree);

    console.log("Weakly visible ?", isWeaklyVisible(points, triangles, tree, commonEdgeMatrix, rootIndex));

    return []
}

type FunnelNode = {
    pointIndex: PointIndex;
    parent: FunnelNode | null;
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

function* getShortestPathTree(
    polygon: XY[], triangles: IndexTriangle[], 
    dualTree: number[][], commonEdgeMatrix: ([PointIndex, PointIndex] | null)[][],
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
        
        if (orient(polygon[startPointIndex], polygon[d1Index], polygon[d2Index]) > 0) {
            stack.push([neighborTriangleIndex, d2Node, d1Node, startPointIndex]);
        } else {
            stack.push([neighborTriangleIndex, d1Node, d2Node, startPointIndex]);
        }
    }

    while (stack.length > 0) {
        // Left and right funnels should point to left and right vertices of the diagonal crossed to get to this triangle
        const [triangleIndex, leftFunnel, rightFunnel, apex] = stack.pop()!;

        console.log("Processing triangle", triangles[triangleIndex], ": [left =", leftFunnel, ", right =", rightFunnel, ", apex =", apex, "]");

        //// 1. Check if funnel is collapsed at this triangle. If it is, reset apex and funnels, then reprocess the triangle.

        // Check if the funnel is currently collapsed
        const funnelCollapsedLeft = orient(polygon[apex], polygon[leftFunnel.pointIndex], polygon[rightFunnel.pointIndex]) > 0;  // Right funnel wall collapses into the left
        const funnelCollapsedRight = orient(polygon[apex], polygon[rightFunnel.pointIndex], polygon[leftFunnel.pointIndex]) < 0; // Left funnel wall collapses into the right

        // Reset funnels and apex on collapse, then restart processing
        if (funnelCollapsedLeft) {
            console.log("Left collapse");
            const newApex = leftFunnel.pointIndex;
            const newLeft: FunnelNode = { pointIndex: newApex, parent: null };
            const newRight: FunnelNode = { pointIndex: rightFunnel.pointIndex, parent: newLeft };

            stack.push([triangleIndex, newLeft, newRight, newApex]);
            continue;
        } else if (funnelCollapsedRight) {
            console.log("Right collapse");
            const newApex = rightFunnel.pointIndex;
            const newRight: FunnelNode = { pointIndex: newApex, parent: null };
            const newLeft: FunnelNode = { pointIndex: leftFunnel.pointIndex, parent: newRight };

            stack.push([triangleIndex, newLeft, newRight, newApex]);
            continue;
        }

        //// 2. Funnel correctness ensured. Now, find point along funnel walls that is part of the shortest path to the new vertex.

        // Vertex of triangle not on crossed diagonal
        const newVertexIndex = triangles[triangleIndex].find(v => v !== leftFunnel.pointIndex && v !== rightFunnel.pointIndex);

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

export function isWeaklyVisible(
    polygon: XY[], triangles: IndexTriangle[], 
    dualTree: number[][], commonEdgeMatrix: ([PointIndex, PointIndex] | null)[][], rootIndex: number
) {
    // SPTs from vertices 0 and 1
    const p0sptGenerator = getShortestPathTree(polygon, triangles, dualTree, commonEdgeMatrix, 0, rootIndex);
    const p1sptGenerator = getShortestPathTree(polygon, triangles, dualTree, commonEdgeMatrix, 1, rootIndex);

    // Check if points satisfy the visibility condition (p0/p1 shortest paths always turn left/right)
    
    let p0sptCheck = p0sptGenerator.next();

    while (!p0sptCheck.done) {
        const [p3, p2, p1] = p0sptCheck.value;

        if (p1 !== undefined && orient(polygon[p1], polygon[p2!], polygon[p3!]) < 0) {
            return false;
        }

        p0sptCheck = p0sptGenerator.next();
    }

    let p1sptCheck = p1sptGenerator.next();

    while (!p1sptCheck.done) {
        const [p3, p2, p1] = p1sptCheck.value;

        if (p1 !== undefined && orient(polygon[p1], polygon[p2!], polygon[p3!]) < 0) {
            return false;
        }

        p1sptCheck = p1sptGenerator.next();
    }

    return true;
}