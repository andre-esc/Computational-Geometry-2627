import type { XY } from "fabric";

export function orient(p1: XY, p2: XY, p3: XY) {
    return (p1.x - p2.x) * (p1.y - p3.y) - (p1.x - p3.x) * (p1.y - p2.y);
}

export function intersect(e1: [XY, XY], e2: [XY, XY]) {
    return (
        orient(e1[0], e1[1], e2[0]) * orient(e1[0], e1[1], e2[1]) <= 0 &&
        orient(e2[0], e2[1], e1[0]) * orient(e2[0], e2[1], e1[1]) <= 0
    );
}