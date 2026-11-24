import Demo from "./Demo";

import { GPolygon } from "../canvas/GPolygon";
import { GuardDisplay } from "../canvas/GuardDisplay";

import { Circle, Point, Polygon, type TPointerEventInfo, type XY } from "fabric";
import isWeaklyVisible from "../geometry/weakVisibility";
import { checkBoundaryGuard, computeFullGuardSet, computeFullGuardSetFromGuards, type FullGuardSet } from "../geometry/boundaryGuard";
import isPolygonSimple from "../geometry/simple";

export default class HoleGuardingDemo extends Demo {
    private readonly poly: GPolygon;
    private readonly visibility: GuardDisplay;

    private readonly triangle: Polygon;
    private readonly intersectionPoint: Circle;

    private isDemoActive = false;
    private guardSet?: FullGuardSet;
    private currentTriangle = 0;

    private readonly startButton = document.getElementById("holeGuard_start") as HTMLButtonElement;
    private readonly customButton = document.getElementById("holeGuard_custom") as HTMLButtonElement;
    private readonly nextButton = document.getElementById("holeGuard_next") as HTMLButtonElement;

    private readonly setVisibleGuards = (guards: Set<number>) => {
        this.visibility.setVisibleGuards(new Set(guards));
        this.poly.setVertexColors(guards, "rgb(0,255,0)");
    }

    private readonly setGuardVisible = (guard: number) => {
        this.visibility.setGuardVisible(guard, true);
        this.poly.setVertexColor(guard, "rgb(0,255,0)");
    }

    private readonly setActiveTriangle = (triangle: [XY, XY, XY]) => {
        this.triangle.set({
            points: triangle,
            dirty: true,
        });
        this.triangle.setBoundingBox(true);
        this.intersectionPoint.setXY(new Point(triangle[1]));

        this.canvas.requestRenderAll();

        console.log(triangle);
    }

    private readonly setTriangleVisible = (visible: boolean) => {
        this.triangle.set("visible", visible);
        this.intersectionPoint.set("visible", visible);

        // Move the point out of canvas so it's not visible before iteration starts
        this.intersectionPoint.setXY(new Point(-10, -10));

        this.canvas.requestRenderAll();
    }

    private readonly verify = (checkGuards: boolean) => {
        const points = this.poly.getPoints();

        if (!isPolygonSimple(points)) {
            alert("Polygon is not simple!");

            return false;
        } else if (!isWeaklyVisible(points)[0]) {
            alert("Polygon is not weakly visible!");

            return false;
        } else if (checkGuards) {
            const guards = this.visibility.getVisibleGuards();

            if (!checkBoundaryGuard(points, guards)) {
                alert("Polygon's boundary is not guarded!");

                return false;
            }
        }

        return true;
    }

    constructor() {
        super("holeGuardDemo", 800, 300);

        // this.poly = new GPolygon(demoPoly, this.canvas);
        this.poly = new GPolygon([
            { x: 300, y: 250 },
            { x: 500, y: 250 },
            { x: 400, y: 50 },
        ], this.canvas);

        this.visibility = new GuardDisplay(this.poly.getPoints(), this.canvas);

        this.triangle = new Polygon([], {
            fill: "rgba(255,0,0,0.4)",
            stroke: "rgb(255,0,0)",
            strokeDashArray: [5, 5],
            visible: false,
            selectable: false,
            evented: false
        })
        this.intersectionPoint = new Circle({
            radius: 3,
            fill: "rgb(255,0,0)",
            visible: false,
            selectable: false,
            evented: false
        })
        this.canvas.add(this.triangle, this.intersectionPoint);

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
            const isGuardVisible = this.visibility.isGuardVisible(i);

            this.visibility.toggleGuardVisible(i);
            this.poly.setVertexColor(i, isGuardVisible ? "white" : "rgb(0,255,0)");
        }

        this.startButton.onclick = _e => {
            const points = this.poly.getPoints();

            if (!this.verify(false)) return;

            this.isDemoActive = true;
            
            this.poly.setVerticesMoveable(false);
            this.setTriangleVisible(true);

            const guardSet = computeFullGuardSet(points);
            this.guardSet = guardSet;

            this.nextButton.disabled = false;
            this.startButton.disabled = true;
            this.customButton.disabled = true;
            
            this.poly.setVertexColors(new Set(guardSet.guardsBefore), "rgb(0,255,0)");
            this.visibility.setVisibleGuards(new Set());
            this.currentTriangle = -1;
        }

        this.customButton.onclick = _e => {
            const points = this.poly.getPoints();
            const guards = this.visibility.getVisibleGuards();

            if (!this.verify(true)) return;

            this.isDemoActive = true;
            
            this.poly.setVerticesMoveable(false);
            this.setTriangleVisible(true);

            this.guardSet = computeFullGuardSetFromGuards(points, guards);

            this.nextButton.disabled = false;
            this.startButton.disabled = true;
            this.customButton.disabled = true;
            
            this.setVisibleGuards(new Set(this.guardSet.guardsBefore))
            this.currentTriangle = -1;
        }

        this.nextButton.onclick = _e => {
            if (!this.isDemoActive || this.guardSet === undefined) return;

            this.currentTriangle++;

            if (this.currentTriangle >= this.guardSet.extraGuardTriangles.length) {
                this.setVisibleGuards(new Set(this.guardSet.totalGuards));

                this.nextButton.disabled = true;
                this.startButton.disabled = false;
                this.customButton.disabled = false;

                this.isDemoActive = false;

                this.poly.setVerticesMoveable(true);
                this.setTriangleVisible(false);
            } else {
                const [guard, triangle] = this.guardSet.extraGuardTriangles[this.currentTriangle];

                this.setGuardVisible(guard);
                this.setActiveTriangle(triangle);
            }
        }
    }

    protected override onDoubleClick(e: TPointerEventInfo<PointerEvent>): void {
        if (!e.target?.get("isPolyControl") && !this.isDemoActive) {
            this.poly.createNewVertex(e.viewportPoint);
        }
    }
}