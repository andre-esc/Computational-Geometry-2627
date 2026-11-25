import Demo from "./Demo";

import { GPolygon } from "../canvas/GPolygon";
import { GUARD_COLORS, GuardDisplay } from "../canvas/GuardDisplay";

import { Circle, Point, Polygon, type TPointerEventInfo, type XY } from "fabric";
import isWeaklyVisible from "../geometry/weakVisibility";
import { checkBoundaryGuard, computeFullGuardSet, computeFullGuardSetFromGuards, type FullGuardSet } from "../geometry/boundaryGuard";
import isPolygonSimple from "../geometry/simple";
import { SCENARIOS } from "./scenarios";

export default class HoleGuardingDemo extends Demo {
    private readonly poly: GPolygon;
    private readonly visibility: GuardDisplay;

    private guardCircles: Circle[] = [];
    private readonly triangle: Polygon;
    private readonly intersectionPoint: Circle;

    private isDemoActive = false;
    private guardSet?: FullGuardSet;
    private currentTriangle = 0;
    private boundaryGuardExample?: number[];

    private readonly startButton = document.getElementById("holeGuard_start") as HTMLButtonElement;
    private readonly customButton = document.getElementById("holeGuard_custom") as HTMLButtonElement;
    private readonly nextButton = document.getElementById("holeGuard_next") as HTMLButtonElement;
    private readonly statusElement = document.getElementById("holeGuard_status");

    private readonly setVisibleGuards = (guards: Set<number>) => {
        const orderedGuards = [...guards];
        const visibleGuards = new Set(orderedGuards);
        const points = this.poly.getPoints();

        this.visibility.setVisibleGuards(visibleGuards);
        this.poly.setVertexColors(new Set(), "white");
        for (const circle of this.guardCircles) this.canvas.remove(circle);
        this.guardCircles = [];

        orderedGuards.forEach((guard, index) => {
            const color = GUARD_COLORS[index % GUARD_COLORS.length];
            const point = points[guard];
            this.visibility.setGuardColor(guard, color);

            const circle = new Circle({
                left: point.x - 9,
                top: point.y - 9,
                radius: 9,
                fill: color,
                stroke: "#ffffff",
                strokeWidth: 2.5,
                selectable: false,
                evented: false,
            });
            this.canvas.add(circle);
            this.guardCircles.push(circle);
        });

        this.canvas.requestRenderAll();
    }

    private readonly toggleGuard = (guard: number) => {
        const guards = new Set(this.visibility.getVisibleGuards());
        if (guards.has(guard)) {
            guards.delete(guard);
        } else {
            guards.add(guard);
        }
        this.setVisibleGuards(guards);
    }

    private readonly setActiveTriangle = (triangle: [XY, XY, XY]) => {
        this.triangle.set({
            points: triangle,
            visible: true,
            dirty: true,
        });
        this.triangle.setBoundingBox(true);
        this.intersectionPoint.setXY(new Point(triangle[1]));
        this.intersectionPoint.set("visible", true);

        this.canvas.requestRenderAll();
    }

    private readonly setTriangleVisible = (visible: boolean) => {
        this.triangle.set("visible", visible);
        this.intersectionPoint.set("visible", visible);

        // Move the point out of canvas so it's not visible before iteration starts
        this.intersectionPoint.setXY(new Point(-10, -10));

        this.canvas.requestRenderAll();
    }

    private readonly setStatus = (message: string, type: "info" | "error" | "warn" = "info") => {
        if (!this.statusElement) return;
        this.statusElement.textContent = message;
        this.statusElement.className = `hole-guard-status hole-guard-status--${type}`;
    }

    private readonly verify = (checkGuards: boolean) => {
        const points = this.poly.getPoints();

        if (!isPolygonSimple(points)) {
            this.setStatus("The polygon is self-intersecting; edit it before running hole guarding.", "error");

            return false;
        } else if (!isWeaklyVisible(points)[0]) {
            this.setStatus("The polygon must be weakly visible from its base edge.", "warn");

            return false;
        } else if (checkGuards) {
            const guards = this.visibility.getVisibleGuards();

            if (!checkBoundaryGuard(points, guards)) {
                this.setStatus("The selected vertices do not guard the whole boundary.", "warn");

                return false;
            }
        }

        return true;
    }

    constructor() {
        super("holeGuardDemo", 920, 520);

        const example = SCENARIOS.find(scenario => scenario.id === "interior-hole-example");
        if (!example) throw new Error("The interior hole example scenario is missing.");
        this.boundaryGuardExample = example.boundaryGuards;
        this.poly = new GPolygon(example.points, this.canvas);

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
            this.boundaryGuardExample = undefined;

            this.visibility.updatePolygon(points, added, removed);
            this.setVisibleGuards(new Set());

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
            this.toggleGuard(i);
        }

        this.startButton.onclick = _e => {
            const points = this.poly.getPoints();

            if (!this.verify(false)) return;
            if (
                this.boundaryGuardExample &&
                !checkBoundaryGuard(points, this.boundaryGuardExample)
            ) {
                this.setStatus("The preset guards no longer cover the polygon boundary.", "error");
                return;
            }

            this.isDemoActive = true;
            
            this.poly.setVerticesMoveable(false);
            this.setTriangleVisible(false);

            const guardSet = this.boundaryGuardExample
                ? computeFullGuardSetFromGuards(points, this.boundaryGuardExample)
                : computeFullGuardSet(points);
            this.guardSet = guardSet;

            this.nextButton.disabled = false;
            this.startButton.disabled = true;
            this.customButton.disabled = true;
            
            this.setVisibleGuards(new Set(guardSet.guardsBefore));
            this.currentTriangle = -1;
            if (guardSet.extraGuardTriangles.length > 0) {
                this.setActiveTriangle(guardSet.extraGuardTriangles[0][1]);
            }
            this.setStatus(
                `${this.boundaryGuardExample ? "Preset boundary stage" : "Boundary stage"}: ` +
                `${guardSet.guardsBefore.length} guard(s) cover ∂P; ` +
                `${guardSet.extraGuardTriangles.length} interior candidate triangle(s) found. ` +
                `Click Next step to inspect the proposed guards.`,
            );
        }

        this.customButton.onclick = _e => {
            const points = this.poly.getPoints();
            const guards = this.visibility.getVisibleGuards();

            if (!this.verify(true)) return;

            this.isDemoActive = true;
            
            this.poly.setVerticesMoveable(false);
            this.setTriangleVisible(false);

            this.guardSet = computeFullGuardSetFromGuards(points, guards);

            this.nextButton.disabled = false;
            this.startButton.disabled = true;
            this.customButton.disabled = true;
            
            this.setVisibleGuards(new Set(this.guardSet.guardsBefore))
            this.currentTriangle = -1;
            if (this.guardSet.extraGuardTriangles.length > 0) {
                this.setActiveTriangle(this.guardSet.extraGuardTriangles[0][1]);
            }
            this.setStatus(
                `Selected guards cover ∂P. ${this.guardSet.extraGuardTriangles.length} candidate triangle(s) found; ` +
                `click Next step to inspect the proposed guards.`,
            );
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
                this.setStatus(
                    `Complete: the algorithm proposed ${this.guardSet.totalGuards.length} guard(s) in total.`,
                );
            } else {
                const [guard, triangle] = this.guardSet.extraGuardTriangles[this.currentTriangle];

                this.setVisibleGuards(new Set([...this.visibility.getVisibleGuards(), guard]));
                this.setActiveTriangle(triangle);
                this.setStatus(
                    `Candidate ${this.currentTriangle + 1} of ${this.guardSet.extraGuardTriangles.length}: ` +
                    `the algorithm proposes guard p${guard} for the highlighted triangle.`,
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