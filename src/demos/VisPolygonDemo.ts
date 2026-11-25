import { type TPointerEventInfo } from "fabric";
import { GPolygon } from "../canvas/GPolygon";
import { GuardDisplay } from "../canvas/GuardDisplay";
import isPolygonSimple from "../geometry/simple";
import Demo from "./Demo";

export default class VisPolygonDemo extends Demo {
    private readonly poly: GPolygon;
    private readonly visibility: GuardDisplay;
    private readonly regionLegend = document.getElementById("visPolyLegend");
    private readonly regionStatus = document.getElementById("visPolyStatus");
    private isPolygonSimple = true;

    private readonly updateRegionControls = () => {
        const visibleGuards = new Set(this.visibility.getVisibleGuards());
        const toggles = this.regionLegend?.querySelectorAll<HTMLInputElement>("[data-guard-index]");

        toggles?.forEach(toggle => {
            const index = Number(toggle.dataset.guardIndex);
            toggle.checked = visibleGuards.has(index);
            toggle.disabled = !this.isPolygonSimple;
        });

        if (!this.regionStatus) return;

        if (!this.isPolygonSimple) {
            this.regionStatus.textContent = "Visibility regions are unavailable while the polygon self-intersects.";
            return;
        }

        const total = this.poly.getPoints().length;
        const count = visibleGuards.size;
        this.regionStatus.textContent = `${count} of ${total} vertex regions shown.`;
    }

    private readonly renderRegionControls = () => {
        if (!this.regionLegend) return;

        this.regionLegend.replaceChildren();
        for (let index = 0; index < this.poly.getPoints().length; index++) {
            const label = document.createElement("label");
            label.className = "vis-region-toggle";

            const input = document.createElement("input");
            input.type = "checkbox";
            input.dataset.guardIndex = String(index);
            input.setAttribute("aria-label", `Show visibility region from vertex p${index}`);
            input.addEventListener("change", () => this.setGuardVisible(index, input.checked));

            const swatch = document.createElement("span");
            swatch.className = "vis-region-swatch";
            swatch.style.backgroundColor = this.visibility.getGuardColor(index);
            swatch.setAttribute("aria-hidden", "true");

            const name = document.createElement("span");
            name.textContent = `p${index}`;

            label.append(input, swatch, name);
            this.regionLegend.append(label);
        }

        this.updateRegionControls();
    }

    private readonly setGuardVisible = (index: number, visible: boolean) => {
        if (!this.isPolygonSimple) return;

        this.visibility.setGuardVisible(index, visible);
        this.poly.setVertexColor(index, visible ? this.visibility.getGuardColor(index) : "white");
        this.updateRegionControls();
    }

    private readonly setAllRegionsVisible = (visible: boolean) => {
        if (!this.isPolygonSimple) return;

        const guards = new Set(visible ? this.poly.getPoints().map((_, index) => index) : []);
        this.visibility.setVisibleGuards(guards);
        this.poly.setVertexColors(guards, "white");
        for (const index of guards) {
            this.poly.setVertexColor(index, this.visibility.getGuardColor(index));
        }
        this.updateRegionControls();
    }

    constructor(canvasId = "visPolyDemo", width = 760, height = 300) {
        super(canvasId, width, height);

        this.poly = new GPolygon([
            { x: 110, y: 265 },
            { x: 650, y: 265 },
            { x: 600, y: 110 },
            { x: 460, y: 185 },
            { x: 380, y: 65 },
            { x: 240, y: 175 },
            { x: 150, y: 95 },
        ], this.canvas);
        this.visibility = new GuardDisplay(this.poly.getPoints(), this.canvas);

        this.visibility.setGuardVisible(3, true);
        this.poly.setVertexColor(3, this.visibility.getGuardColor(3));
        this.renderRegionControls();

        document.getElementById("visPolyShowAll")?.addEventListener("click", () => this.setAllRegionsVisible(true));
        document.getElementById("visPolyHideAll")?.addEventListener("click", () => this.setAllRegionsVisible(false));

        this.poly.onPolygonChanged = ({ polygon, added, removed }) => {
            const points = polygon.getPoints();
            this.visibility.updatePolygon(points, added, removed);
            this.isPolygonSimple = isPolygonSimple(points);

            const visibleGuards = new Set(this.visibility.getVisibleGuards());
            polygon.setVertexColors(visibleGuards, "white");
            for (const guard of visibleGuards) {
                polygon.setVertexColor(guard, this.visibility.getGuardColor(guard));
            }

            polygon.setFill(this.isPolygonSimple ? "rgba(0,0,0,0.06)" : "rgba(230,57,70,0.1)");
            polygon.setStroke(this.isPolygonSimple ? "rgb(80,80,80)" : "rgb(230,57,70)");
            if (added.length > 0 || removed.length > 0) this.renderRegionControls();
            else this.updateRegionControls();
            this.canvas.requestRenderAll();
        };

        this.poly.onVertexDoubleClicked = (_polygon, index) => {
            this.setGuardVisible(index, !this.visibility.isGuardVisible(index));
        };
    }

    protected override onDoubleClick(e: TPointerEventInfo<PointerEvent>): void {
        if (!e.target?.get("isPolyControl")) {
            this.poly.createNewVertex(e.scenePoint);
        }
    }
}
