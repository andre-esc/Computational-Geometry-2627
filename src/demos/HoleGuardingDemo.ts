import Demo from "./Demo";

import { GPolygon } from "../canvas/GPolygon";
import { GuardDisplay } from "../canvas/GuardDisplay";

import isWeaklyVisible from "../geometry/weakVisibility";
import { checkBoundaryGuard, computeFullGuardSet, computeFullGuardSetFromGuards, type FullGuardSet } from "../geometry/boundaryGuard";
import isPolygonSimple from "../geometry/simple";

import { Circle, Point, Polygon, Polyline, type TPointerEventInfo, type XY } from "fabric";

export default class HoleGuardingDemo extends Demo {
    private readonly poly: GPolygon;
    private readonly visibility: GuardDisplay;

    private readonly triangle: Polygon;
    private readonly intersectionPoint: Circle;
    private readonly constructedEdge: Polyline;

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

    private readonly setActiveTriangle = (triangle: [XY, XY, XY], constructedEdge: [XY, XY]) => {
        this.triangle.set({
            points: triangle,
            dirty: true,
        });
        this.triangle.setBoundingBox(true);

        this.constructedEdge.set({
            points: constructedEdge,
            dirty: true,
        });
        this.constructedEdge.setBoundingBox(true);
        
        this.intersectionPoint.setXY(new Point(triangle[1]));

        this.canvas.requestRenderAll();
    }

    private readonly setTriangleVisible = (visible: boolean) => {
        this.triangle.set("visible", visible);
        this.intersectionPoint.set("visible", visible);
        this.constructedEdge.set("visible", visible);

        // Move out of canvas so it's not visible before iteration starts
        this.intersectionPoint.setXY(new Point(-10, -10));
        this.setActiveTriangle(
            [{ x: -10, y: -10 }, { x: -10, y: -10 }, { x: -10, y: -10 }],
            [{ x: -10, y: -10 }, { x: -10, y: -10 }]
        );

        this.canvas.requestRenderAll();
    }

    private readonly verify = (checkGuards: boolean) => {
        const points = this.poly.getPoints();

        if (!isPolygonSimple(points)) {
            this.updateInfoText("⚠ Polygon is not simple!");

            return false;
        } else if (!isWeaklyVisible(points)[0]) {
            this.updateInfoText("⚠ Polygon is not weakly visible!");

            return false;
        } else if (checkGuards) {
            const guards = this.visibility.getVisibleGuards();

            if (!checkBoundaryGuard(points, guards)) {
                this.updateInfoText("⚠ Polygon's boundary is not guarded!");

                return false;
            }
        }

        return true;
    }

    constructor(canvasId = "holeGuardDemo", width = 760, height = 300, infoTextId = "holeGuard_info") {
        super(canvasId, width, height, infoTextId);

        this.poly = new GPolygon([
            { x: 200, y: 250 },
            { x: 600, y: 250 },
            { x: 520, y: 240 },
            { x: 453, y: 150 },
            { x: 490, y: 115 },
            { x: 445, y: 140 },
            { x: 415, y: 95 },
            { x: 450, y: 50 },
            { x: 350, y: 50 },
            { x: 385, y: 95 },
            { x: 280, y: 240 }
        ], this.canvas);

        this.visibility = new GuardDisplay(this.poly.getPoints(), this.canvas);
        this.setVisibleGuards(new Set([0, 1, 4, 7, 8]));

        this.triangle = new Polygon([], {
            fill: "rgba(255,0,0,0.4)",
            stroke: "rgb(255,0,0)",
            strokeDashArray: [5, 5],
            visible: false,
            selectable: false,
            evented: false
        })
        this.intersectionPoint = new Circle({
            radius: 3.5,
            fill: "rgb(255,0,0)",
            visible: false,
            selectable: false,
            evented: false
        })
        this.constructedEdge = new Polyline([], {
            stroke: "rgb(255,0,0)",
            strokeWidth: 3,
            strokeLineCap: "round",
            visible: false,
            selectable: false,
            evented: false
        })
        this.canvas.add(this.triangle, this.intersectionPoint, this.constructedEdge);

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

            if (!this.verify(false)) return;

            this.isDemoActive = true;
            
            this.poly.setVerticesMoveable(false);
            this.setTriangleVisible(true);

            const guardSet = computeFullGuardSet(points);
            this.guardSet = guardSet;

            this.nextButton.disabled = false;
            this.startButton.disabled = true;
            this.customButton.disabled = true;
            this.updateInfoText(
                String.raw`Initial guard: \(|G| = ${this.guardSet.guardsBefore.length}\) (click next to step forward)`
            );
            
            this.setVisibleGuards(new Set(this.guardSet.guardsBefore))
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
            this.updateInfoText(
                String.raw`Initial guard: \(|G| = ${this.guardSet.guardsBefore.length}\) (click next to step forward)`
            );
            
            this.setVisibleGuards(new Set(this.guardSet.guardsBefore))
            this.currentTriangle = -1;

            console.log(points);
        }

        this.nextButton.onclick = _e => {
            if (!this.isDemoActive || this.guardSet === undefined) return;

            this.currentTriangle++;

            if (this.currentTriangle >= this.guardSet.extraGuardTriangles.length) {
                this.setVisibleGuards(new Set(this.guardSet.totalGuards));

                this.nextButton.disabled = true;
                this.startButton.disabled = false;
                this.customButton.disabled = false;
                this.updateInfoText(
                    String.raw`Final guard: \(|G| = ${this.guardSet.totalGuards.length}\)`
                );

                this.isDemoActive = false;

                this.poly.setVerticesMoveable(true);
                this.setTriangleVisible(false);
            } else {
                const { guard, triangle, constructedEdge } = this.guardSet.extraGuardTriangles[this.currentTriangle];

                const isAlreadyAdded = this.visibility.isGuardVisible(guard);

                this.setGuardVisible(guard);
                this.setActiveTriangle(triangle, constructedEdge);
                
                if (isAlreadyAdded) {
                    this.updateInfoText(String.raw`Guard \(p_${guard}\) is already added (click next to step forward)`);
                } else {
                    this.updateInfoText(String.raw`Adding guard \(p_${guard}\) (click next to step forward)`);
                }
            }
        }
    }

    protected override onDoubleClick(e: TPointerEventInfo<PointerEvent>): void {
        if (!e.target?.get("isPolyControl") && !this.isDemoActive) {
            this.poly.createNewVertex(e.viewportPoint);
        }
    }
}