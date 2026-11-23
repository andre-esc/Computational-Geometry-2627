import Demo from "./Demo";

import { GPolygon } from "../canvas/GPolygon";
import { GuardDisplay } from "../canvas/GuardDisplay";

import { type TPointerEventInfo } from "fabric";

export default class VisPolygonDemo extends Demo {
    private readonly poly: GPolygon;
    private readonly visibility: GuardDisplay;

    constructor() {
        super("visPolyDemo", 800, 300);

        this.poly = new GPolygon([
            { x: 300, y: 250 },
            { x: 500, y: 250 },
            { x: 400, y: 50 },
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