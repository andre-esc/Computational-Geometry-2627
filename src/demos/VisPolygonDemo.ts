import Demo from "./Demo";

import { GPolygon } from "../canvas/GPolygon";
import { GuardDisplay } from "../canvas/GuardDisplay";

import { type TPointerEventInfo } from "fabric";

export default class VisPolygonDemo extends Demo {
    private readonly poly: GPolygon;
    private readonly visibility: GuardDisplay;

    constructor(canvasId = "visPolyDemo", width = 760, height = 300) {
        super(canvasId, width, height);

        this.poly = new GPolygon([
            { x: 110, y: 265 },   // u — base-edge left
            { x: 650, y: 265 },   // v — base-edge right
            { x: 600, y: 110 },
            { x: 460, y: 185 },
            { x: 380, y:  65 },
            { x: 240, y: 175 },
            { x: 150, y:  95 },
        ], this.canvas);

        this.visibility = new GuardDisplay(this.poly.getPoints(), this.canvas);

        this.poly.onPolygonChanged = ({ polygon, added, removed }) => {
            this.visibility.updatePolygon(polygon.getPoints(), added, removed);
        }

        this.poly.onVertexDoubleClicked = (_polygon, i) => {
            console.log(i);
            
            this.visibility.toggleGuardVisible(i);
        }
    }

    protected override onDoubleClick(e: TPointerEventInfo<PointerEvent>): void {
        if (!e.target?.get("isPolyControl")) {
            this.poly.createNewVertex(e.viewportPoint);
        }
    }
}