import type { XY } from "fabric";
import { intersect } from "./misc";

function edges(points: XY[]): [XY, XY][] {
    const e: [XY, XY][] = [];

    for (let i = 0; i < points.length-1; i++) {
        e.push([points[i], points[i+1]]);
    }

    e.push([points[points.length-1], points[0]]);

    return e;
}

// Test if a polygon is simple (placeholder, will be replaced later)

export function isPolygonSimple(points: XY[]): boolean {
    const e = edges(points);
    
    for (let i = 0; i < e.length; i++) {
        for (let j = i+2; j < (i === 0 ? e.length-1 : e.length); j++) {
            // if (i === 0 && j === e.length-1) continue;

            if (intersect(e[i], e[j])) return false;
        }
    }

    return true;
}