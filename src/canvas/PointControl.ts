import { Canvas, Circle, FabricText, Group, Point, Polyline } from "fabric";

const LABEL_OFFSET_X = 0;
const LABEL_OFFSET_Y = -20;

const BOTTOM_EDGE_MIN_HALF_WIDTH = 20;

function setPolyPoint(poly: Polyline, pointIndex: number, position: Point): void {
    poly.points[pointIndex] = position;

    poly.setBoundingBox(true);
    poly.dirty = true;
}

export type RemoveCallback = (c: PointControl) => void;

export class PointControl {
    private readonly poly: Polyline;
    private readonly canvas: Canvas;

    private readonly circle: Circle;
    private readonly label: FabricText;

    // AKA the reason why this is a class at all instead of just a function...
    private index: number;
    public getIndex = () => this.index;
    public setIndex = (i: number) => {
        this.index = i;

        this.label.set("text", `p${i}`);
    };

    private readonly control: Group;
    public getControl = () => this.control;

    public constructor(poly: Polyline, index: number, removeCallback: RemoveCallback) {
        this.poly = poly;
        this.canvas = poly.canvas!;
        this.index = index;

        this.circle = new Circle({
            radius: 5,
            fill: "white",
            stroke: "black",
            strokeWidth: 3,
        });
    
        this.label = new FabricText(`p${index}`, {
            fontSize: 15,
            left: LABEL_OFFSET_X,
            top: LABEL_OFFSET_Y,
        });
    
        this.circle.setXY(new Point(
            poly.points[index].x, 
            poly.points[index].y,
        ));
    
        this.label.setXY(new Point(
            poly.points[index].x + LABEL_OFFSET_X,
            poly.points[index].y + LABEL_OFFSET_Y,
        ));
    
        this.control = new Group([ this.circle, this.label ], {
            lockMovementY: index < 2,
        });

        this.control.setControlsVisibility({
            mt: false,
            mb: false,
            ml: false,
            mr: false,
            tl: false,
            tr: false,
            bl: false,
            br: false,
            mtr: false
        })

        this.control.on("moving", _e => this.onMove());
        this.control.on("contextmenu", _e => removeCallback(this));
    }

    public onMove(): void {
        let c = this.circle.getCenterPoint();

        if (this.index < 2) {
            // Limit bottom edge point positions

            const left_bound = this.canvas.getWidth() / 2 - BOTTOM_EDGE_MIN_HALF_WIDTH;
            const right_bound = this.canvas.getWidth() / 2 + BOTTOM_EDGE_MIN_HALF_WIDTH;

            if (this.index == 0 && c.x > left_bound) {
                this.control.left = left_bound;
                c.setX(left_bound);
            } else if (this.index == 1 && c.x < right_bound) {
                this.control.left = right_bound;
                c.setX(right_bound);
            }

            // setPolyPoint(bottomEdge, pointIndex, c);
        }

        setPolyPoint(this.poly, this.index, c);

        this.canvas.requestRenderAll();
    }
};