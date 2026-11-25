import { Canvas, Polygon, type XY } from "fabric";
import calculateVisibilityPolygonFromPoint from "../geometry/visibilityPolygon";
import isPolygonSimple from "../geometry/simple";
import type { PointIndex } from "../types/geometry";

export const GUARD_COLORS = [
    "#4c82f7",
    "#e76f51",
    "#2a9d8f",
    "#9b5de5",
    "#f4a261",
    "#00a6a6",
    "#d45087",
    "#6a994e",
];

export class GuardDisplay {
    private readonly canvas: Canvas;

    private polyPoints: XY[];
    private readonly visibilityPolygons: Polygon[] = [];

    private createVisibilityPolygon(points: XY[], index: number) {
        const color = this.getGuardColor(index);
        return new Polygon(points, {
            visible: false,
            selectable: false,
            evented: false,
            fill: `${color}20`,
            stroke: `${color}80`,
        })
    }

    private initializeVisibilityPolygons() {
        for (let i = 0; i < this.polyPoints.length; i++) {
            const polygon = this.createVisibilityPolygon([], i);
            
            this.visibilityPolygons.push(polygon);
            this.canvas.add(polygon);
        }
    }

    private updateVisibilityPolygons() {
        for (let i = 0; i < this.polyPoints.length; i++) {
            const visPolyPoints = calculateVisibilityPolygonFromPoint(this.polyPoints, i);

            this.visibilityPolygons[i].set({
                points: visPolyPoints,
                dirty: true,
            });
            this.visibilityPolygons[i].setBoundingBox(true);
        }
        this.canvas.requestRenderAll();
    }

    public constructor(points: XY[], canvas: Canvas) {
        this.polyPoints = points;
        this.canvas = canvas;

        this.initializeVisibilityPolygons();
        this.updateVisibilityPolygons();
    }

    public updatePolygon(newPolygon: XY[], added: PointIndex[], removed: PointIndex[]) {
        this.polyPoints = newPolygon;

        const topologyChanged = added.length > 0 || removed.length > 0 ||
            this.visibilityPolygons.length !== newPolygon.length;
        if (topologyChanged) {
            for (const polygon of this.visibilityPolygons) this.canvas.remove(polygon);
            this.visibilityPolygons.splice(0, this.visibilityPolygons.length);
            this.initializeVisibilityPolygons();
        }

        if (!isPolygonSimple(newPolygon)) {
            this.setVisibleGuards(new Set());
            return;
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
        this.visibilityPolygons[index].set({
            fill: `${color}18`,
            stroke: `${color}55`,
        });

        this.canvas.requestRenderAll();
    }

    public getGuardColor(index: PointIndex): string {
        return GUARD_COLORS[index % GUARD_COLORS.length];
    }
}