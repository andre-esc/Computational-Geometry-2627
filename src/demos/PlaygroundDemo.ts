import Demo from "./Demo";
import { GPolygon } from "../canvas/GPolygon";
import { Circle, Polygon, type TPointerEventInfo, type XY } from "fabric";
import isWeaklyVisible from "../geometry/weakVisibility";
import isPolygonSimple from "../geometry/simple";
import {
    checkBoundaryGuard,
    computeBoundaryGuardSet,
    computeFullGuardSet,
    computeFullGuardSetFromGuards,
} from "../geometry/boundaryGuard";
import calculateVisibilityPolygonFromPoint from "../geometry/visibilityPolygon";
import { GUARD_COLORS } from "../canvas/GuardDisplay";
import type { Scenario } from "./scenarios";

export type StatusType = "ok" | "warn" | "error" | "info";

export default class PlaygroundDemo extends Demo {
    private readonly poly: GPolygon;
    private guardCircles: Circle[] = [];
    private visPolygons: Polygon[] = [];
    private holeTriangles: Polygon[] = [];
    private statusCallback: ((msg: string, type: StatusType) => void) | null = null;
    private scenarioBoundaryGuards?: number[];

    constructor(canvasId = "playgroundCanvas", width = 920, height = 520) {
        super(canvasId, width, height);

        // A nice WV polygon with 7 vertices (first two form the base edge)
        this.poly = new GPolygon([
            { x: 90,  y: 450 },   // p0: u — left end of base edge
            { x: 830, y: 450 },   // p1: v — right end of base edge
            { x: 760, y: 220 },
            { x: 580, y: 350 },
            { x: 400, y: 110 },
            { x: 220, y: 330 },
            { x: 130, y: 180 },
        ], this.canvas);

        this.poly.onPolygonChanged = () => {
            this.scenarioBoundaryGuards = undefined;
            this.clearOverlay(false);
        };
    }

    // ── Public API ──────────────────────────────────────────────────────────

    public setStatusCallback(cb: (msg: string, type: StatusType) => void) {
        this.statusCallback = cb;
    }

    public clearOverlay(notify = true) {
        for (const c of this.guardCircles) this.canvas.remove(c);
        for (const p of this.visPolygons) this.canvas.remove(p);
        for (const triangle of this.holeTriangles) this.canvas.remove(triangle);
        this.guardCircles = [];
        this.visPolygons = [];
        this.holeTriangles = [];
        this.poly.setFill("rgba(0,0,0,0.08)");
        this.poly.setStroke("rgb(80,80,80)");
        this.canvas.requestRenderAll();
        if (notify) this.emit("Canvas cleared.", "info");
    }

    public checkWV() {
        const pts = this.poly.getPoints();

        if (!isPolygonSimple(pts)) {
            this.poly.setFill("rgba(230,57,70,0.1)");
            this.poly.setStroke("rgb(230,57,70)");
            this.canvas.requestRenderAll();
            this.emit("Self-intersecting polygon — not a valid simple polygon.", "error");
            return;
        }

        const [wv] = isWeaklyVisible(pts);
        if (wv) {
            this.poly.setFill("rgba(42,157,143,0.12)");
            this.poly.setStroke("rgb(42,157,143)");
            this.emit("✓ Polygon is weakly visible from its base edge (green).", "ok");
        } else {
            this.poly.setFill("rgba(244,162,97,0.12)");
            this.poly.setStroke("rgb(244,162,97)");
            this.emit("✗ Polygon is NOT weakly visible from its base edge.", "warn");
        }
        this.canvas.requestRenderAll();
    }

    public computeBoundaryGuards() {
        const pts = this.poly.getPoints();

        if (!isPolygonSimple(pts)) {
            this.emit("Cannot compute guards: polygon is self-intersecting.", "error");
            return;
        }
        const [wv] = isWeaklyVisible(pts);
        if (!wv) {
            this.emit("Cannot compute guards: polygon must be weakly visible from its base edge.", "warn");
            return;
        }

        this.clearOverlay(false);

        try {
            const presetGuards = this.getScenarioBoundaryGuards(pts);
            let guards: number[];
            let details: string;
            if (presetGuards) {
                guards = presetGuards;
                details = " (preset boundary-covering set).";
            } else {
                const { dominatingSet } = computeBoundaryGuardSet(pts);
                guards = dominatingSet.guards;
                details =
                    ` (greedy init: ${dominatingSet.initialGreedySize}, ` +
                    `${dominatingSet.iterations} local-search iteration(s)).`;
            }
            const fullGuardSet = computeFullGuardSetFromGuards(pts, guards);
            this.renderHoleTriangles(fullGuardSet.extraGuardTriangles);
            this.renderGuards(pts, guards);
            this.emit(
                `Boundary guard: ${guards.length} guard${guards.length !== 1 ? "s" : ""}` +
                    details +
                    ` ${fullGuardSet.extraGuardTriangles.length} interior hole candidate(s) highlighted.`,
                "ok"
            );
        } catch (e) {
            this.emit(`Error: ${e}`, "error");
        }
    }

    public computeAllGuards() {
        const pts = this.poly.getPoints();

        if (!isPolygonSimple(pts)) {
            this.emit("Cannot compute guards: polygon is self-intersecting.", "error");
            return;
        }
        const [wv] = isWeaklyVisible(pts);
        if (!wv) {
            this.emit("Cannot compute guards: polygon must be weakly visible from its base edge.", "warn");
            return;
        }

        this.clearOverlay(false);

        try {
            const boundaryGuards = this.getScenarioBoundaryGuards(pts);
            const fullGuardSet = (boundaryGuards
                ? computeFullGuardSetFromGuards(pts, boundaryGuards)
                : computeFullGuardSet(pts));
            this.renderHoleTriangles(fullGuardSet.extraGuardTriangles);
            this.renderGuards(pts, fullGuardSet.totalGuards);
            this.emit(
                `Full guard set: ${fullGuardSet.totalGuards.length} guard(s); ` +
                `${fullGuardSet.extraGuardTriangles.length} interior hole candidate(s) highlighted.`,
                "ok"
            );
        } catch (e) {
            this.emit(`Error: ${e}`, "error");
        }
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private emit(msg: string, type: StatusType) {
        this.statusCallback?.(msg, type);
    }

    private renderGuards(pts: XY[], guards: number[]) {
        for (const [guardIndex, g] of guards.entries()) {
            const pt = pts[g];
            const color = GUARD_COLORS[guardIndex % GUARD_COLORS.length];

            // Visibility polygon for this guard
            try {
                const visPts = calculateVisibilityPolygonFromPoint(pts, g);
                const fill = color + "18";   // ~10% opacity
                const stroke = color + "55"; // ~33% opacity
                const visPoly = new Polygon(visPts, {
                    selectable: false,
                    evented: false,
                    fill,
                    stroke,
                    strokeWidth: 1,
                });
                this.canvas.add(visPoly);
                this.visPolygons.push(visPoly);
            } catch (_) { /* skip if vis-poly fails */ }

            // Guard marker circle
            const circle = new Circle({
                left: pt.x - 9,
                top:  pt.y - 9,
                radius: 9,
                fill: color,
                stroke: "#ffffff",
                strokeWidth: 2.5,
                selectable: false,
                evented: false,
            });
            this.canvas.add(circle);
            this.guardCircles.push(circle);
        }
        this.canvas.requestRenderAll();
    }

    private renderHoleTriangles(triangles: [number, [XY, XY, XY]][]) {
        for (const [, points] of triangles) {
            const triangle = new Polygon(points, {
                fill: "rgba(255,0,0,0.2)",
                stroke: "rgb(255,0,0)",
                strokeWidth: 2,
                strokeDashArray: [5, 5],
                selectable: false,
                evented: false,
            });
            this.canvas.add(triangle);
            this.holeTriangles.push(triangle);
        }
    }

    public loadScenario(scenario: Scenario) {
        this.clearOverlay(false);
        this.poly.loadPoints(scenario.points);
        this.scenarioBoundaryGuards = scenario.boundaryGuards;
        this.emit(`Loaded ${scenario.name}. ${scenario.description}`, "info");
    }

    private getScenarioBoundaryGuards(points: XY[]): number[] | undefined {
        const guards = this.scenarioBoundaryGuards;
        if (
            guards &&
            guards.every(guard => Number.isInteger(guard) && guard >= 0 && guard < points.length) &&
            checkBoundaryGuard(points, guards)
        ) {
            return guards;
        }
        return undefined;
    }

    protected override onDoubleClick(e: TPointerEventInfo<PointerEvent>): void {
        if (!e.target?.get("isPolyControl")) {
            this.poly.createNewVertex(e.scenePoint);
        }
    }
}
