import type { PointIndex } from "../types/geometry";
import type { LinkedList } from "../types/util";
import type { BoundaryCoord } from "./boundaryCoord";

import type { XY } from "fabric";
import { computeVisibleIntervalsForVertex } from "./visibility";
import { getCircular } from "../util/circularList";

function printLL(ll: LinkedList<BoundaryCoord>) {
    console.log("Linked list:");
    // const a = ll;

    ll.prev!.next = null;

    let lll: LinkedList<BoundaryCoord> | null = ll;
    let i = 0;

    while (lll !== null) {
        console.log(lll.point);
        lll = lll.next;


        i++;
        if (i > 20) {
            console.log("INFINITE");
            break;
        };
    }

    ll.prev!.next = ll;
}

export default function calculateVisibilityPolygonFromPoint(polygon: XY[], point: PointIndex) {
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

    //// 2. Get constructed edges

    for (const e of computeVisibleIntervalsForVertex(point, polygon).constructedEdges) {
        const newVertex = e.lower.t !== 0 ? e.lower : e.upper;      // A new vertex on the boundary being added
        const vertexAnchor = e.lower.t !== 0 ? e.upper : e.lower;   // The existing vertex anchoring the new one via the constructed edge
        const sideDeterminant = e.lower.t !== 0 ? 1 : -1;           // Determines how the new vertex is ordered counter-clockwise

        const newNode: LinkedList<BoundaryCoord> = { point: newVertex, next: null, prev: null };

        let next: LinkedList<BoundaryCoord>, prev: LinkedList<BoundaryCoord>;
        
        // The immediately adjacent vertex that would be occluded by the shadow being cast
        let adjacentOccludedVertex: PointIndex;

        if (e.pocketSide === sideDeterminant) {
            next = getCircular(initialNodes, newVertex.edgeIndex + 1);
            prev = initialNodes[vertexAnchor.edgeIndex];

            adjacentOccludedVertex = newVertex.edgeIndex;

        } else {
            next = initialNodes[vertexAnchor.edgeIndex];
            prev = initialNodes[newVertex.edgeIndex];

            adjacentOccludedVertex = newVertex.edgeIndex + 1 % polygon.length;
        }
        
        newNode.next = next;
        newNode.prev = prev;
        next.prev = newNode;
        prev.next = newNode;

        // Replace occluded vertex with the new one so that any future vertices don't connect to the occluded one
        initialNodes[adjacentOccludedVertex] = newNode;

        ll = newNode;  // Store reference to one of the points in the visibility polygon
        // We can't keep the original value of ll since we don't know if that initial vertex is part of the polygon
    }

    //// 3. Extract visibility polygon from linked list

    // printLL(ll!);

    const visPolygon: XY[] = [];

    ll!.prev!.next = null;  // Sever the linked list to mark where to stop
    let i = 0;

    while (ll !== null) {
        visPolygon.push(ll.point.point);
        ll = ll.next;

        i++;
        if (i > 50) break;  // To avoid infinite loops, just in case
    }

    // console.log(visPolygon);
    

    return visPolygon;
}