import { Canvas, Polygon, type XY } from "fabric";
import computeVisibilityPolygonFromPoint from "../geometry/visibilityPolygon";
import type { PointIndex } from "../types/geometry";

export class GuardDisplay {
    private readonly canvas: Canvas;

    private polyPoints: XY[];
    private readonly visibilityPolygons: Polygon[] = [];

    private createVisibilityPolygon(points: XY[]) {
        return new Polygon(points, {
            visible: false,
            selectable: false,
            evented: false,
            fill: "rgba(0,255,0,0.05)",
            stroke: "rgba(0,0,0,0.1)",
        })
    }

    private initializeVisibilityPolygons() {
        for (let i = 0; i < this.polyPoints.length; i++) {
            // if (i !== 1) continue;

            const visPolyPoints = computeVisibilityPolygonFromPoint(this.polyPoints, i);

            const polygon = this.createVisibilityPolygon(visPolyPoints);
            
            this.visibilityPolygons.push(polygon);
            this.canvas.add(polygon);
        }
    }

    private updateVisibilityPolygons() {
        for (let i = 0; i < this.polyPoints.length; i++) {
            // if (i !== 1) continue;

            const visPolyPoints = computeVisibilityPolygonFromPoint(this.polyPoints, i);

            this.visibilityPolygons[i].set({
                points: visPolyPoints,
                dirty: true,
            });
            this.visibilityPolygons[i].setBoundingBox(true);
            this.canvas.requestRenderAll();
        }
    }

    public constructor(points: XY[], canvas: Canvas) {
        this.polyPoints = points;
        this.canvas = canvas;

        this.initializeVisibilityPolygons();
    }

    public updatePolygon(newPolygon: XY[], added: PointIndex[], removed: PointIndex[]) {
        this.polyPoints = newPolygon;

        for (const i of added) {
            const newPoly = this.createVisibilityPolygon([]);

            this.visibilityPolygons.splice(i, 0, newPoly);
            this.canvas.add(newPoly);
        }

        for (const i of removed) {
            const removed = this.visibilityPolygons.splice(i, 1);

            this.canvas.remove(removed[0]);
        }

        this.updateVisibilityPolygons();
    }

    // Sets which vertices should have their visibility polygons drawn
    public setVisibleGuards(visibleGuards: Set<PointIndex>) {
        for (let i = 0; i < this.visibilityPolygons.length; i++) {
            this.visibilityPolygons[i].set("visible", visibleGuards.has(i));
        }

        this.canvas.requestRenderAll();
    }

    public getVisibleGuards(): number[] {
        return this.visibilityPolygons.reduce<number[]>((acc, vp, i) => {
            if (vp.get("visible")) acc.push(i);

            return acc;
        }, []);
    }

    public isGuardVisible(index: PointIndex) {
        return this.visibilityPolygons[index].get("visible");
    }

    public toggleGuardVisible(index: PointIndex) {
        const isVisible = this.isGuardVisible(index);

        this.setGuardVisible(index, !isVisible);
    }

    public setGuardVisible(index: PointIndex, visible: boolean) {
        this.visibilityPolygons[index].set("visible", visible);

        this.canvas.requestRenderAll();
    }

    public setGuardColor(index: PointIndex, color: string) {
        this.visibilityPolygons[index].set("fill", color);

        this.canvas.requestRenderAll();
    }
}