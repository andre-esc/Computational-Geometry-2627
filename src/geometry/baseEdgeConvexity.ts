import type { XY } from "fabric";
import { isConvex } from "./misc";
import type { PointIndex } from "../types/geometry";

export interface TrimedBaseConvexPolygon {
    polygon: XY[];
    trimmedLeft: number;
    trimmedRight: number;
};

// Removes vertices to make base edges convex. Also returns the number of vertices removed on each side.
export default function trimPolygonForBaseEdgeConvexity(polygon: XY[]): TrimedBaseConvexPolygon {
    let w1 = polygon.length - 1;
    const ignored1: Set<PointIndex> = new Set();

    while (!isConvex(polygon[w1], polygon[0], polygon[1])) {
        ignored1.add(w1);

        w1--;
    }

    let w2 = 2;
    const ignored2: Set<PointIndex> = new Set();

    while (!isConvex(polygon[0], polygon[1], polygon[w2])) {
        ignored2.add(w2);

        w2++;
    }

    const trimmed = polygon.filter((_, i) => !ignored1.has(i) && !ignored2.has(i));

    return {
        polygon: trimmed,
        trimmedLeft: ignored1.size,
        trimmedRight: ignored2.size
    } as TrimedBaseConvexPolygon;
}
