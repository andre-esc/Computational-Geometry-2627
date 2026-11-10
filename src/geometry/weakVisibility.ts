import type { PointIndex } from "../types/geometry";
import { getCircular } from "../util/circularList";
import { isConvex, isSegmentInsidePolygon, orient } from "./misc";
import { triangulate } from "./triangulation";
import { getShortestPathTree } from "./shortestPathTree";

import type { XY } from "fabric";

// Returns true of the given vertex guards the entire polygon.
// Uses a basic half-plane check.
function doesVertexGuardPolygon(pointRef: XY[], vertices: PointIndex[], guard: PointIndex) {
    for (let i = 0; i < vertices.length; i++) {
        const v1 = pointRef[vertices[i]];
        const v2 = pointRef[getCircular(vertices, i+1)];

        if (orient(v1, v2, pointRef[guard]) < 0) return false;
    }

    return true;
}

export function isWeaklyVisible(polygon: XY[]) {
    //// 1. Check if p0 is concave. If so, check if p0 guards the concave part then trim that part off to make p0 convex.

    let w1 = polygon.length - 1;
    const leftConvexSlice = [0];

    while (!isConvex(polygon[w1], polygon[0], polygon[1])) {
        leftConvexSlice.push(w1);
        w1--;
    }
    leftConvexSlice.push(w1);

    console.log("p0's convex slice:", leftConvexSlice);

    // First base vertex is not convex. Check if it guards its convex slice.
    if (leftConvexSlice.length > 2) {
        if (
            !isSegmentInsidePolygon(polygon[0], polygon[w1], polygon) ||  // If the last vertex of the convex slice is blocked by other edges
            !doesVertexGuardPolygon(polygon, leftConvexSlice, 0)          // If base vertex doesn't guard the convex slice
        ) return false;
    }

    //// 2. Check if p1 is concave. If so, check if p1 guards the concave part then trim that part off to make p1 convex.

    let w2 = 2;
    const rightConvexSlice = [1];

    while (!isConvex(polygon[0], polygon[1], polygon[w2])) {
        rightConvexSlice.push(w2);
        w2++;
    }
    rightConvexSlice.push(w2);

    console.log("p1's convex slice:", rightConvexSlice);

    // Second base vertex is not convex. Check if it guards its convex slice.
    if (rightConvexSlice.length > 2) {
        if (
            !isSegmentInsidePolygon(polygon[1], polygon[w2], polygon) ||  // If the last vertex of the convex slice is blocked by other edges
            !doesVertexGuardPolygon(polygon, rightConvexSlice, 1)         // If base vertex doesn't guard the convex slice
        ) return false;
    }

    polygon = polygon
        .toSpliced(w1+1, leftConvexSlice.length-2)
        .toSpliced(2, rightConvexSlice.length-2);

    //// 3. Check if remaining points satisfy the visibility condition (p0/p1 shortest paths always turn left/right)

    const { triangles, dualTree, rootIndex, commonEdgeMatrix } = triangulate(polygon);

    // SPTs from vertices 0 and 1
    const p0sptGenerator = getShortestPathTree(polygon, triangles, dualTree, commonEdgeMatrix, 0, rootIndex);
    const p1sptGenerator = getShortestPathTree(polygon, triangles, dualTree, commonEdgeMatrix, 1, rootIndex);
    
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