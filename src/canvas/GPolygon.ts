import { Canvas, Polygon, Polyline, type XY } from "fabric";
import { PointControl } from "./PointControl";

const BOTTOM_EDGE_MIN_HALF_WIDTH = 20;

export interface PolygonChangeEvent {
    polygon: GPolygon;
    added: number[];
    removed: number[];
};

export class GPolygon {
    private readonly canvas: Canvas;
    private readonly poly: Polygon;
    private readonly bottomEdge: Polyline;

    private readonly controls: PointControl[] = [];

    public onPolygonChanged = (_p: PolygonChangeEvent) => {};
    public onVertexDoubleClicked = (_p: GPolygon, _i: number) => {}

    public setFill = (color: string) => this.poly.set("fill", color);
    public setStroke = (color: string) => this.poly.set("stroke", color);

    private readonly updatePolygon = (
        added: number[], removed: number[], 
        updateBottomEdge?: boolean
    ) => {
        this.onPolygonChanged({ polygon: this, added, removed });

        this.poly.setBoundingBox(true);
        this.poly.set("dirty", true);

        if (updateBottomEdge) {
            this.bottomEdge.setBoundingBox(true);
            this.bottomEdge.set("dirty", true);
        }
    }

    private readonly factoryOnMove = (index: number) => (control: PointControl) => {
        let c = control.getControlPosition();

        if (index < 2) {
            // Limit bottom edge point positions

            const left_bound = this.canvas.getWidth() / 2 - BOTTOM_EDGE_MIN_HALF_WIDTH;
            const right_bound = this.canvas.getWidth() / 2 + BOTTOM_EDGE_MIN_HALF_WIDTH;

            if (index === 0 && c.x > left_bound) {
                control.getControl().left = left_bound;
                c.setX(left_bound);
            } else if (index === 1 && c.x < right_bound) {
                control.getControl().left = right_bound;
                c.setX(right_bound);
            }

            // Update bottom edge decor
            // setPolyPoint(this.bottomEdge, index, c);
            this.bottomEdge.points[index] = c;
        }

        // setPolyPoint(this.poly, index, c);
        this.poly.points[index] = c;

        this.updatePolygon([], [], index < 2);
        this.canvas.requestRenderAll();
    }

    private readonly factoryRemoveVertex = (index: number) => (control: PointControl) => {
        if (index < 2 || this.poly.points.length <= 3) return;

        console.log(index, this.controls);

        // Update labels and callbacks of proceeding vertices
        for (let j = index + 1; j < this.controls.length; j++) {
            this.controls[j].setLabelText(`p${j-1}`);

            this.controls[j].onMove = this.factoryOnMove(j-1);
            this.controls[j].onRightClick = this.factoryRemoveVertex(j-1);

            this.controls[j].onDoubleClick = _c => this.onVertexDoubleClicked(this, j-1);
        }

        this.controls.splice(index, 1);

        this.poly.points.splice(index, 1);
        this.updatePolygon([], [index]);

        this.canvas.remove(control.getControl());

        this.canvas.requestRenderAll();
    }

    private readonly createControlForVertex = (index: number) => {
        const point = this.poly.points[index];

        const control = new PointControl(point, `p${index}`, {
            lockMovementY: index < 2
        });

        control.onMove = this.factoryOnMove(index);
        control.onRightClick = this.factoryRemoveVertex(index);

        control.onDoubleClick = _c => this.onVertexDoubleClicked(this, index);

        return control;
    }

    private readonly initializeControls = () => {
        for (let i = 0; i < this.poly.points.length; i++) {
            const control = this.createControlForVertex(i);

            this.canvas.add(control.getControl());
            this.controls.push(control);
        }
    }

    public constructor(points: XY[], canvas: Canvas) {
        this.canvas = canvas;

        this.poly = new Polygon(points, {
            stroke: "black",
            strokeWidth: 3,
            fill: "rgba(0,0,0,0.1)",
            selectable: false,
            evented: false,
        })

        this.bottomEdge = new Polyline([this.poly.points[0], this.poly.points[1]], {
            stroke: "rgb(43, 221, 43)",
            strokeWidth: 3,
            selectable: false,
            evented: false,
        });
        
        this.canvas.add(this.poly, this.bottomEdge);

        this.initializeControls();
    }

    /** Squared distance from point p to segment ab (avoids a sqrt for comparisons). */
    private static distSqPointToSegment = (p: XY, a: XY, b: XY): number => {
        const dx = b.x - a.x, dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return (p.x - a.x) ** 2 + (p.y - a.y) ** 2;
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
        return (p.x - (a.x + t * dx)) ** 2 + (p.y - (a.y + t * dy)) ** 2;
    }

    /**
     * Returns the index at which a new vertex at `pos` should be spliced in,
     * i.e. the index i+1 of the nearest polygon edge (p_i → p_{i+1}).
     * The base edge (p0 → p1) is excluded so it is never split.
     */
    private findNearestEdgeInsertIndex = (pos: XY): number => {
        const pts = this.poly.points;
        const n = pts.length;
        let bestIndex = n;   // fallback: append at end
        let bestDistSq = Infinity;

        // Start at i=1 to skip the base edge (p0→p1)
        for (let i = 1; i < n; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % n];
            const dSq = GPolygon.distSqPointToSegment(pos, a, b);
            if (dSq < bestDistSq) {
                bestDistSq = dSq;
                // Edge from pts[n-1] back to pts[0]: insert at end (index n)
                bestIndex = (i + 1 < n) ? i + 1 : n;
            }
        }

        return bestIndex;
    }

    public createNewVertex = (pos: XY) => {
        const insertIndex = this.findNearestEdgeInsertIndex(pos);

        // Splice new point into the polygon at the right edge
        this.poly.points.splice(insertIndex, 0, pos);

        // Shift labels and callbacks of all controls at insertIndex and beyond
        for (let j = this.controls.length - 1; j >= insertIndex; j--) {
            const newIdx = j + 1;   // const: each iteration captures its own value
            this.controls[j].setLabelText(`p${newIdx}`);
            this.controls[j].onMove = this.factoryOnMove(newIdx);
            this.controls[j].onRightClick = this.factoryRemoveVertex(newIdx);
            this.controls[j].onDoubleClick = (_c) => this.onVertexDoubleClicked(this, newIdx);
        }

        // Create and register the new control
        const newControl = this.createControlForVertex(insertIndex);
        this.canvas.add(newControl.getControl());
        this.controls.splice(insertIndex, 0, newControl);

        this.updatePolygon([insertIndex], []);
        this.canvas.requestRenderAll();
    }

    /**
     * Replace all polygon vertices with `pts`, rebuild every PointControl,
     * and re-render.  `pts[0]` and `pts[1]` become the new base-edge endpoints.
     */
    public loadPoints = (pts: XY[]) => {
        // 1. Remove every existing control circle from the canvas
        for (const c of this.controls) this.canvas.remove(c.getControl());
        this.controls.splice(0, this.controls.length);

        // 2. Replace points on the Fabric Polygon in-place
        this.poly.points.splice(0, this.poly.points.length, ...pts);

        // 3. Sync the bottom-edge polyline to the new p0 / p1
        this.bottomEdge.points.splice(0, this.bottomEdge.points.length,
            this.poly.points[0], this.poly.points[1]);

        // 4. Force Fabric to re-compute bounding boxes
        this.poly.setBoundingBox(true);
        this.poly.set("dirty", true);
        this.bottomEdge.setBoundingBox(true);
        this.bottomEdge.set("dirty", true);

        // 5. Rebuild controls
        this.initializeControls();

        // 6. Notify listeners and re-render
        this.onPolygonChanged({ polygon: this, added: pts.map((_, i) => i), removed: [] });
        this.canvas.requestRenderAll();
    }

    // Returns a copy of the GPolygon's points
    public getPoints = (): XY[] => this.poly.points.map(({ x, y }) => ({ x: x, y: y }));
};