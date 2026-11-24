import Demo from "./Demo";

import { GPolygon } from "../canvas/GPolygon";
import { GuardDisplay } from "../canvas/GuardDisplay";

import { type TPointerEventInfo } from "fabric";
import isWeaklyVisible from "../geometry/weakVisibility";
import { computeBoundaryGuardSet } from "../geometry/boundaryGuard";
import type { DominatingSetResult } from "../geometry/dominatingSet";
import isPolygonSimple from "../geometry/simple";

export default class VisPolygonDemo extends Demo {
    private readonly poly: GPolygon;
    private readonly visibility: GuardDisplay;

    private isDemoActive = false;
    private guardSet?: DominatingSetResult;
    private currentIteration = 0;

    private readonly startButton = document.getElementById("visPoly_start") as HTMLButtonElement;
    private readonly nextButton = document.getElementById("visPoly_next") as HTMLButtonElement;

    private readonly setActiveGuards = (guards: Set<number>) => {
        this.visibility.setVisibleGuards(new Set(guards));
        this.poly.setVertexColors(guards, "rgb(0,255,0)");
    }

    constructor() {
        super("visPolyDemo", 800, 300);

        // this.poly = new GPolygon(demoPoly, this.canvas);
        this.poly = new GPolygon([
            { x: 300, y: 250 },
            { x: 500, y: 250 },
            { x: 400, y: 50 },
        ], this.canvas);

        this.visibility = new GuardDisplay(this.poly.getPoints(), this.canvas);

        // for (const i of demoGuard) {
        //     this.visibility.toggleGuardVisible(i);
        // }

        this.poly.onPolygonChanged = ({ polygon, added, removed }) => {
            const points = polygon.getPoints();

            this.visibility.updatePolygon(points, added, removed);

            if (!isPolygonSimple(polygon.getPoints())) {
                polygon.setStroke("rgb(255,0,0)");
                
                this.canvas.requestRenderAll();
            }
            else if (!isWeaklyVisible(points)[0]) {
                polygon.setStroke("rgb(200, 200, 0)");
                
                this.canvas.requestRenderAll();
            }
            else {
                polygon.setStroke("rgb(0, 0, 0)");
                
                this.canvas.requestRenderAll();
            }
        }

        this.poly.onVertexDoubleClicked = (_polygon, i) => {
            this.visibility.toggleGuardVisible(i);
        }

        this.startButton.onclick = _e => {
            const points = this.poly.getPoints();

            if (!isPolygonSimple(points) || !isWeaklyVisible(points)[0]) return;

            this.isDemoActive = true;
            
            this.poly.setVerticesMoveable(false);

            const { dominatingSet } = computeBoundaryGuardSet(points);
            this.guardSet = dominatingSet;

            this.nextButton.disabled = false;
            this.startButton.disabled = true;
            
            this.setActiveGuards(new Set(this.guardSet.iterationGuards[0]));
            this.currentIteration = 0;
        }

        this.nextButton.onclick = _e => {
            if (!this.isDemoActive || this.guardSet === undefined) return;

            this.currentIteration++;

            if (this.currentIteration  >= this.guardSet.iterations) {
                this.setActiveGuards(new Set(this.guardSet.guards));

                this.nextButton.disabled = true;
                this.startButton.disabled = false;

                this.isDemoActive = false;
                this.poly.setVerticesMoveable(true);

                console.log(this.guardSet);

            } else {
                this.setActiveGuards(new Set(this.guardSet.iterationGuards[this.currentIteration]));
            }
        }
    }

    protected override onDoubleClick(e: TPointerEventInfo<PointerEvent>): void {
        if (!e.target?.get("isPolyControl") && !this.isDemoActive) {
            this.poly.createNewVertex(e.viewportPoint);
        }
    }
}