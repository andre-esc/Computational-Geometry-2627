import { Canvas, Polygon, type XY } from "fabric";
import { computeVisibleIntervalsForVertex, type VisibleInterval } from "../geometry/visibility";

export class GuardDisplay {
    private polygon: XY[] = [];
    private visibleIntervals: VisibleInterval[][] = [];

    private readonly canvas: Canvas;
    visibilityPolygons: Polygon[] = [];

    private readonly initializeVisibilityPolygons = () => {
        this.visibilityPolygons = [];

        for (let i = 0; i < this.visibleIntervals.length; i++) {
            const intervals = this.visibleIntervals[i]
            const points = [this.polygon[i]];

            for (const { start, end } of intervals) {
                points.push(start.point, end.point);
            }

            const poly = new Polygon(points, {
                fill: "rgba(0, 255, 0, 0.1)",
                selectable: false,
                evented: false,
            });

            console.log(points);

            this.canvas.add(poly);
        }
    }

    constructor(canvas: Canvas) {
        this.canvas = canvas;
    }

    public setPolygon = (polygon: XY[]) => {
        this.polygon = polygon;

        this.visibleIntervals = [];

        for (let i = 0; i < polygon.length; i++) {
            this.visibleIntervals.push(computeVisibleIntervalsForVertex(i, polygon));
        }

        this.initializeVisibilityPolygons();
    }
}