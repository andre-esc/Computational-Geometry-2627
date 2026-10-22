import { Canvas, Point, Polygon, Polyline, type XY } from "fabric";
import { PointControl } from "../canvas/PointControl";
import { isPolygonSimple } from "./simple";

const BOTTOM_EDGE_MIN_HALF_WIDTH = 20;

function setPolyPoint(poly: Polyline, pointIndex: number, position: Point): void {
    poly.points[pointIndex] = position;

    poly.setBoundingBox(true);
    poly.set("dirty", true);
}

export class GPolygon {
    private readonly canvas: Canvas;
    private readonly poly: Polygon;
    private readonly bottomEdge: Polyline;

    private readonly controls: PointControl[] = [];

    private readonly updatePolygon = (updateBottomEdge?: boolean) => {
        if (!isPolygonSimple(this.poly.points)) {
            this.poly.set("fill", "rgba(255,0,0,0.1)");
            this.poly.set("stroke", "rgb(255,0,0)");
        } else {
            this.poly.set("fill", "rgba(0,0,0,0.1)");
            this.poly.set("stroke", "rgb(0,0,0)");
        }

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

        this.updatePolygon(index < 2);
        this.canvas.requestRenderAll();

        console.log(isPolygonSimple(this.poly.points));
    }

    private readonly factoryRemoveVertex = (index: number) => (control: PointControl) => {
        if (index < 2 || this.poly.points.length <= 3) return;

        console.log(index, this.controls);

        // Update labels and callbacks of proceeding vertices
        for (let j = index + 1; j < this.controls.length; j++) {
            this.controls[j].setLabelText(`p${j-1}`);

            this.controls[j].onMove = this.factoryOnMove(j-1);
            this.controls[j].onRightClick = this.factoryRemoveVertex(j-1);
        }

        this.controls.splice(index, 1);

        this.poly.points.splice(index, 1);
        this.updatePolygon();

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

    public createNewVertex = (pos: XY) => {
        this.poly.points.push(pos);

        this.updatePolygon();

        const newControl = this.createControlForVertex(this.poly.points.length - 1);
        this.canvas.add(newControl.getControl());
        this.controls.push(newControl);

        this.canvas.requestRenderAll();
    }
};