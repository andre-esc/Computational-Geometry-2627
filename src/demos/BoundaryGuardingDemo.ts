import Demo from "./Demo";

import { GPolygon } from "../canvas/GPolygon";
import { GuardDisplay } from "../canvas/GuardDisplay";

import isWeaklyVisible from "../geometry/weakVisibility";
import { computeBoundaryGuardSet } from "../geometry/boundaryGuard";
import type { DominatingSetResult } from "../geometry/dominatingSet";
import isPolygonSimple from "../geometry/simple";

import { type TPointerEventInfo } from "fabric";

export default class BoundaryGuardingDemo extends Demo {
    private readonly poly: GPolygon;
    private readonly visibility: GuardDisplay;

    private isDemoActive = false;
    private guardSet?: DominatingSetResult;
    private currentIteration = 0;

    private readonly startButton = document.getElementById("boundaryGuarding_start") as HTMLButtonElement;
    private readonly nextButton = document.getElementById("boundaryGuarding_next") as HTMLButtonElement;

    private readonly setVisibleGuards = (guards: Set<number>) => {
        this.visibility.setVisibleGuards(new Set(guards));
        this.poly.setVertexColors(guards, "rgb(0,255,0)");
    }

    private readonly verify = () => {
        const points = this.poly.getPoints();

        if (!isPolygonSimple(points)) {
            this.updateInfoText("⚠ Polygon is not simple!");

            return false;
        } else if (!isWeaklyVisible(points)[0]) {
            this.updateInfoText("⚠ Polygon is not weakly visible!");

            return false;
        }

        return true;
    }

    constructor(canvasId = "boundaryGuardingDemo", width = 760, height = 300, infoTextId = "boundaryGuarding_info") {
        super(canvasId, width, height, infoTextId);

        this.poly = new GPolygon([
            { x: 300, y: 250 },
            { x: 500, y: 250 },
            { x: 400, y: 50 },
        ], this.canvas);

        this.visibility = new GuardDisplay(this.poly.getPoints(), this.canvas);

        this.poly.onPolygonChanged = ({ polygon, added, removed }) => {
            const points = polygon.getPoints();

            this.visibility.updatePolygon(points, added, removed);

            if (!isPolygonSimple(polygon.getPoints())) {
                polygon.setFill("rgba(255,0,0,0.1)");
                polygon.setStroke("rgb(255,0,0)");
                
                this.canvas.requestRenderAll();
            }
            else if (!isWeaklyVisible(points)[0]) {
                polygon.setFill("rgba(255, 255, 0, 0.1)");
                polygon.setStroke("rgb(200, 200, 0)");
                
                this.canvas.requestRenderAll();
            }
            else {
                polygon.setFill("rgba(0, 0, 0, 0.1)");
                polygon.setStroke("rgb(0, 0, 0)");
                
                this.canvas.requestRenderAll();
            }
        }

        this.poly.onVertexDoubleClicked = (_polygon, i) => {
            const isGuardVisible = this.visibility.isGuardVisible(i);

            this.visibility.toggleGuardVisible(i);
            this.poly.setVertexColor(i, isGuardVisible ? "white" : "rgb(0,255,0)");
        }

        this.startButton.onclick = _e => {
            const points = this.poly.getPoints();

            if (!this.verify()) return;

            this.isDemoActive = true;
            
            this.poly.setVerticesMoveable(false);

            const { dominatingSet } = computeBoundaryGuardSet(points);
            this.guardSet = dominatingSet;

            this.nextButton.disabled = false;
            this.startButton.disabled = true;
            this.updateInfoText(
                String.raw`Initial boundary guard: \(|G| = ${this.guardSet.iterationGuards[0].length}\) (click next to step forward)`
            );
            
            this.setVisibleGuards(new Set(this.guardSet.iterationGuards[0]));
            this.currentIteration = 0;
        }

        this.nextButton.onclick = _e => {
            if (!this.isDemoActive || this.guardSet === undefined) return;

            this.currentIteration++;

            if (this.currentIteration  >= this.guardSet.iterations) {
                this.setVisibleGuards(new Set(this.guardSet.guards));

                this.nextButton.disabled = true;
                this.startButton.disabled = false;
                this.updateInfoText(
                    String.raw`Final boundary guard: \(|G| = ${this.guardSet.guards.length}\)`
                );

                this.isDemoActive = false;
                this.poly.setVerticesMoveable(true);
            } else {
                this.setVisibleGuards(new Set(this.guardSet.iterationGuards[this.currentIteration]));

                this.updateInfoText(
                    String.raw`Iteration ${this.currentIteration}: \(|G| = ${this.guardSet.iterationGuards[this.currentIteration].length}\) (click next to step forward)`
                );
            }
        }
    }

    protected override onDoubleClick(e: TPointerEventInfo<PointerEvent>): void {
        if (!e.target?.get("isPolyControl") && !this.isDemoActive) {
            this.poly.createNewVertex(e.scenePoint);
        }
    }
}