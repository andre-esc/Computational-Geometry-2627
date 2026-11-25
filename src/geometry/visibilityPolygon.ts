import type { XY } from "fabric";
import type { BoundaryCoord } from "./boundaryCoord";
import { computeVisibleIntervalsForVertex } from "./visibility";

function boundaryArcPoints(start: BoundaryCoord, end: BoundaryCoord, polygon: XY[]): XY[] {
    const vertexCount = polygon.length;
    const startPosition = start.edgeIndex + start.t;
    let endPosition = end.edgeIndex + end.t;
    if (endPosition <= startPosition) endPosition += vertexCount;

    const interiorVertices: { position: number; point: XY }[] = [];
    for (let index = 0; index < vertexCount; index++) {
        let position = index;
        if (position <= startPosition) position += vertexCount;
        if (position < endPosition) {
            interiorVertices.push({ position, point: polygon[index] });
        }
    }

    interiorVertices.sort((a, b) => a.position - b.position);
    return [start.point, ...interiorVertices.map(vertex => vertex.point), end.point];
}

function appendDistinct(points: XY[], point: XY): void {
    const previous = points[points.length - 1];
    if (!previous || Math.hypot(previous.x - point.x, previous.y - point.y) > 1e-8) {
        points.push({ x: point.x, y: point.y });
    }
}

export default function calculateVisibilityPolygonFromPoint(polygon: XY[], point: number): XY[] {
    if (polygon.length < 3 || point < 0 || point >= polygon.length) return [];

    const { intervals } = computeVisibleIntervalsForVertex(point, polygon);
    const visibilityPolygon: XY[] = [];

    for (const interval of intervals) {
        for (const boundaryPoint of boundaryArcPoints(interval.start, interval.end, polygon)) {
            appendDistinct(visibilityPolygon, boundaryPoint);
        }
    }

    if (
        visibilityPolygon.length > 1 &&
        Math.hypot(
            visibilityPolygon[0].x - visibilityPolygon[visibilityPolygon.length - 1].x,
            visibilityPolygon[0].y - visibilityPolygon[visibilityPolygon.length - 1].y,
        ) <= 1e-8
    ) {
        visibilityPolygon.pop();
    }

    return visibilityPolygon;
}
