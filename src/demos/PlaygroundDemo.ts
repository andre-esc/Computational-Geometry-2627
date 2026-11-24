import Demo from "./Demo";
import { GPolygon } from "../canvas/GPolygon";
import { Circle, Polygon, type TPointerEventInfo, type XY } from "fabric";
import isWeaklyVisible from "../geometry/weakVisibility";
import isPolygonSimple from "../geometry/simple";
import { computeBoundaryGuardSet, computeFullGuardSet } from "../geometry/boundaryGuard";
import calculateVisibilityPolygonFromPoint from "../geometry/visibilityPolygon";
import type { Scenario } from "./scenarios";

export type StatusType = "ok" | "warn" | "error" | "info";

export default class PlaygroundDemo extends Demo {
    private readonly poly: GPolygon;
    private guardCircles: Circle[] = [];
    private visPolygons: Polygon[] = [];
    private statusCallback: ((msg: string, type: StatusType) => void) | null = null;

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
        this.guardCircles = [];
        this.visPolygons = [];
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
            const { dominatingSet } = computeBoundaryGuardSet(pts);
            this.renderGuards(pts, dominatingSet.guards, "#4c82f7");
            this.emit(
                `Boundary guard: ${dominatingSet.guards.length} guard${dominatingSet.guards.length !== 1 ? "s" : ""} ` +
                `(greedy init: ${dominatingSet.initialGreedySize}, ` +
                `${dominatingSet.iterations} local-search iteration${dominatingSet.iterations !== 1 ? "s" : ""}).`,
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
            const guards = computeFullGuardSet(pts);
            this.renderGuards(pts, guards, "#e63946");
            this.emit(
                `Full guard set: ${guards.length} guard${guards.length !== 1 ? "s" : ""} covering the entire interior.`,
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

    private renderGuards(pts: XY[], guards: number[], color: string) {
        for (const g of guards) {
            const pt = pts[g];

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

    public loadScenario(scenario: Scenario) {
        this.clearOverlay(false);
        this.poly.loadPoints(scenario.points);
        this.emit(`Loaded scenario: ${scenario.name}`, "info");
    }

    protected override onDoubleClick(e: TPointerEventInfo<PointerEvent>): void {
        if (!e.target?.get("isPolyControl")) {
            this.poly.createNewVertex(e.viewportPoint);
        }
    }
}
