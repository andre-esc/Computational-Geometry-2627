import { Circle, FabricText, Group, Point, type GroupProps, type XY } from "fabric";

const LABEL_OFFSET_X = 0;
const LABEL_OFFSET_Y = -20;

/**
 * Draggable point on the canvas. Can execute callbacks when moved, clicked, or right-clicked.
 */
export class PointControl {
    private readonly circle: Circle;
    public getControlPosition = () => this.circle.getCenterPoint();
    
    private readonly label: FabricText;
    public getLabelText = () => this.label.text;
    public setLabelText = (text: string) => this.label.set("text", text);

    private readonly control: Group;
    public getControl = () => this.control;

    public onMove = (_c: PointControl) => {};
    public onClick = (_c: PointControl) => {};
    public onRightClick = (_c: PointControl) => {};

    public constructor(pos: XY, label: string, options?: Partial<GroupProps>) {
        this.circle = new Circle({
            radius: 5,
            fill: "white",
            stroke: "black",
            strokeWidth: 3,
        });
    
        this.label = new FabricText(label, {
            fontSize: 15,
            left: LABEL_OFFSET_X,
            top: LABEL_OFFSET_Y,
        });
    
        this.circle.setXY(new Point(pos.x, pos.y));
    
        this.label.setXY(new Point(
            pos.x + LABEL_OFFSET_X,
            pos.y + LABEL_OFFSET_Y,
        ));
    
        this.control = new Group([ this.circle, this.label ], options);

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

        this.control.on("moving", _e => this.onMove(this));
        this.control.on("mouseup", _e => this.onClick(this));
        this.control.on("contextmenu", _e => this.onRightClick(this));
    }
};