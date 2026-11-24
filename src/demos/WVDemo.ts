import Demo from "./Demo";

import { GPolygon } from "../canvas/GPolygon";

import isPolygonSimple from "../geometry/simple";
import isWeaklyVisible from "../geometry/weakVisibility";

import { Polygon, type TPointerEventInfo } from "fabric";

export default class WVDemo extends Demo {
    private readonly poly: GPolygon;
    private readonly visPoly: Polygon;

    constructor() {
        super("wvDemo", 800, 300);

        this.poly = new GPolygon([
            { x: 300, y: 250 },
            { x: 500, y: 250 },
            { x: 400, y: 50 },
        ], this.canvas);

        this.visPoly = new Polygon(this.poly.getPoints(), {
            visible: false,
            selectable: false,
            evented: false,
            fill: "rgba(0,255,0,0.4)"
        })

        this.canvas.add(this.visPoly);

        this.poly.onPolygonChanged = ({ polygon }) => {
            if (!isPolygonSimple(polygon.getPoints())) {
                polygon.setFill("rgba(255,0,0,0.1)");
                polygon.setStroke("rgb(255,0,0)");

                this.visPoly.set({ visible: false });
                this.canvas.requestRenderAll();
            }
            else {
                const [weaklyVisible, visPolygon] = isWeaklyVisible(polygon.getPoints());

                if (!weaklyVisible) {
                    polygon.setFill("rgba(255, 255, 0, 0.1)");
                    polygon.setStroke("rgb(200, 200, 0)");

                    this.visPoly.set({
                        visible: true,
                        points: visPolygon,
                        dirty: true,
                    });
                    this.visPoly.setBoundingBox(true);
                    this.canvas.requestRenderAll();
                }
                else if (weaklyVisible) {
                    polygon.setFill("rgba(0, 0, 0, 0.1)");
                    polygon.setStroke("rgb(0, 0, 0)");

                    this.visPoly.set({ visible: false });
                    this.canvas.requestRenderAll();
                }
            }
        }
    }

    protected override onDoubleClick(e: TPointerEventInfo<PointerEvent>): void {
        if (!e.target?.get("isPolyControl")) {
            this.poly.createNewVertex(e.viewportPoint);
        }
    }
}