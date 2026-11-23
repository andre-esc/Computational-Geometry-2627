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

    public createNewVertex = (pos: XY) => {
        this.poly.points.push(pos);

        this.updatePolygon([this.poly.points.length - 1], []);

        const newControl = this.createControlForVertex(this.poly.points.length - 1);
        this.canvas.add(newControl.getControl());
        this.controls.push(newControl);

        this.canvas.requestRenderAll();
    }

    // Returns a copy of the GPolygon's points
    public getPoints = (): XY[] => this.poly.points.map(({ x, y }) => ({ x: x, y: y }));
};