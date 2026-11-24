import type { PointIndex } from "../types/geometry";
import type { LinkedList } from "../types/util";

import { getCircular } from "../util/circularList";

import type { BoundaryCoord } from "./boundaryCoord";
import { orient } from "./misc";
import { shootRayToFirstBoundaryHit } from "./visibility";
import triangulate from "./triangulation";
import computeShortestPathTree from "./spt2";

import type { XY } from "fabric";

// ---------------------- AI USAGE --------------------------
//    The following section is [AI:0] on the 0rwx scale.
// ----------------------------------------------------------

type ShadowProjection = {
    uIndex: PointIndex, vIndex: PointIndex,  // Sightline projecting the shadow
    ccwiseVisRegionStart: boolean            // Whether this projection is a start or an end of a visibility region
}

/**
 * Generator that yields all sightlines that produce a shadow.
 * 
 * @param pointRef      Dictionary of points
 * @param spt           Shortest Path Tree from one of the base edge vertices
 * @param from          The base edge vertex we're checking from
 */
function * visHelper(pointRef: XY[], spt: PointIndex[], from: 0 | 1) {
    const concaveDirection = from === 0 ? 1 : -1;
    // We don't check the branch of the SPT rooted at the other base edge vertex.
    // This is because that portion of the polygon could be concave relative to that other vertex, and therefore only guarded by it.
    // The left-right turn check would then fail for this vertex, despite the polygon still being WV-visible.
    const pruneIndex = 1 - from;

    for (let i = 0; i < spt.length; i++) {
        if (spt[spt[i]] === pruneIndex) {
            spt[i] = pruneIndex;
        }
        else if (spt[i] !== pruneIndex) {
            const vIndex = spt[i];
            const uIndex = spt[vIndex];

            const w = pointRef[i];
            const v = pointRef[vIndex];
            const u = pointRef[uIndex];

            // If we're currently checking a turn adjacent to a concave base edge vertex
            if (uIndex === from && v.y > u.y && concaveDirection * orient(u, v, w) > 0) {
                yield { uIndex, vIndex, ccwiseVisRegionStart: from === 1 } as ShadowProjection;
            }
            // If we're checking a regular turn
            else if (concaveDirection * orient(u, v, w) < 0) {
                yield { uIndex, vIndex, ccwiseVisRegionStart: from === 0 } as ShadowProjection;
            }

        }
    }
}

// Helper function for projecting a sightline onto the polygon
function projectShadow(
    { uIndex, vIndex, ccwiseVisRegionStart }: ShadowProjection,
    polygon: XY[],
    initialNodes: LinkedList<BoundaryCoord>[]
) {
    const u = polygon[uIndex], v = polygon[vIndex];

    const edgeBeforeV = (vIndex - 1 + polygon.length) % polygon.length;

    const projection = shootRayToFirstBoundaryHit(u, v, polygon, [edgeBeforeV, vIndex]);

    if (projection === null) throw new Error("Sightline causes shadow, but does not project onto boundary.");

    if (ccwiseVisRegionStart) {
        const nextPoint = initialNodes[projection.edgeIndex].next;
        const newNode: LinkedList<BoundaryCoord> = { point: projection, next: nextPoint, prev: initialNodes[vIndex] };
        initialNodes[vIndex].next = newNode;
        nextPoint!.prev = newNode;
    }
    else {
        const prevPoint = getCircular(initialNodes, projection.edgeIndex+1).prev;
        const newNode: LinkedList<BoundaryCoord> = { point: projection, next: initialNodes[vIndex], prev: prevPoint };
        initialNodes[vIndex].prev = newNode;
        prevPoint!.next = newNode;
    }
}

export default function isWeaklyVisible(polygon: XY[]): [boolean, XY[]] {
    //// 1. Build circular linked list of polygon vertices in order

    const initialNodes = new Array<LinkedList<BoundaryCoord>>(polygon.length);
    let ll: LinkedList<BoundaryCoord> | null = { point: { edgeIndex: 0, t: 0, point: polygon[0] }, next: null, prev: null };
    initialNodes[0] = ll;

    for (let i = 1; i < polygon.length; i++) {
        const next: LinkedList<BoundaryCoord> = { point: { edgeIndex: i, t: 0, point: polygon[i] }, next: null, prev: ll };
        
        ll.next = next;
        ll = next;

        initialNodes[i] = ll;
    }

    ll.next = initialNodes[0];
    ll.next.prev = ll;
    ll = ll.next;

    //// 2. Check if remaining points satisfy the visibility condition (p0/p1 shortest paths always turn left/right)

    const { triangles, dualTree, rootIndex, commonEdgeMatrix } = triangulate(polygon);

    const p0spt = computeShortestPathTree(polygon, triangles, dualTree, commonEdgeMatrix, 0, rootIndex);
    const p1spt = computeShortestPathTree(polygon, triangles, dualTree, commonEdgeMatrix, 1, rootIndex);

    const p0visibilityGenerator = visHelper(polygon, p0spt, 0);
    let p0visibility = p0visibilityGenerator.next();

    let isWeaklyVisible = true;

    while (!p0visibility.done) {
        // If we enter here, that means there is one or more sightline that produces a shadow.
        isWeaklyVisible = false;

        projectShadow(p0visibility.value, polygon, initialNodes);

        p0visibility = p0visibilityGenerator.next();
    }

    const p1visibilityGenerator = visHelper(polygon, p1spt, 1);
    let p1visibility = p1visibilityGenerator.next();

    while (!p1visibility.done) {
        // If we enter here, that means there is one or more sightline that produces a shadow.
        isWeaklyVisible = false;
        
        projectShadow(p1visibility.value, polygon, initialNodes);

        p1visibility = p1visibilityGenerator.next();
    }

    //// 3. Extract visibility polygon from linked list

    const visPolygon: XY[] = [];

    ll!.prev!.next = null;  // Sever the linked list to mark where to stop
    let i = 0;

    while (ll !== null) {
        visPolygon.push(ll.point.point);

        ll = ll.next;

        i++;
        if (i > 50) break;  // To avoid infinite loops, just in case
    }

    return [isWeaklyVisible, visPolygon];
}