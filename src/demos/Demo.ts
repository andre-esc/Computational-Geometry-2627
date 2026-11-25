import { Canvas, Point, type TPointerEventInfo } from "fabric";

/**
 * Base class for demos. Takes in a canvas id and dimensions, and automatically initializes
 * the fabric.js canvas.
 * 
 * Also contains modifiable callbacks for various input events.
 */
export default abstract class Demo {
    protected readonly canvasElement: HTMLCanvasElement;
    protected readonly canvas: Canvas;
    private spacePressed = false;
    private isPanning = false;
    private lastPanX = 0;
    private lastPanY = 0;

    constructor(canvasId: string, width: number, height: number) {
        const htmlCanvas = document.getElementById(canvasId) as HTMLCanvasElement;

        if (htmlCanvas === null) throw new Error("Canvas ID doesn't exist");

        this.canvasElement = htmlCanvas;
        this.canvas = new Canvas(htmlCanvas, {
            width,
            height,
            backgroundColor: "#fff",
            selection: false,
        });

        this.canvas.on("mouse:dblclick", this.onDoubleClick.bind(this));
        this.canvas.on("mouse:wheel", ({ e }) => {
            const event = e as WheelEvent;
            const zoom = Math.min(5, Math.max(0.25, this.canvas.getZoom() * 0.999 ** event.deltaY));
            this.canvas.zoomToPoint(new Point(event.offsetX, event.offsetY), zoom);
            event.preventDefault();
            event.stopPropagation();
        });
        this.canvas.on("mouse:down", ({ e }) => {
            const event = e as MouseEvent;
            if (!this.spacePressed && event.button !== 1) return;

            this.isPanning = true;
            this.lastPanX = event.clientX;
            this.lastPanY = event.clientY;
            this.canvas.setCursor("grabbing");
            event.preventDefault();
        });
        this.canvas.on("mouse:move", ({ e }) => {
            if (!this.isPanning) return;

            const event = e as MouseEvent;
            const transform = this.canvas.viewportTransform;
            transform[4] += event.clientX - this.lastPanX;
            transform[5] += event.clientY - this.lastPanY;
            this.lastPanX = event.clientX;
            this.lastPanY = event.clientY;
            this.canvas.requestRenderAll();
        });
        this.canvas.on("mouse:up", () => {
            this.isPanning = false;
            this.canvas.setCursor("default");
        });

        window.addEventListener("keydown", event => {
            if (event.code === "Space" && this.canvasElement.matches(":hover")) {
                this.spacePressed = true;
                this.canvas.skipTargetFind = true;
                event.preventDefault();
            }
        });
        window.addEventListener("keyup", event => {
            if (event.code === "Space") {
                this.spacePressed = false;
                this.canvas.skipTargetFind = false;
            }
        });
        window.addEventListener("blur", () => {
            this.spacePressed = false;
            this.canvas.skipTargetFind = false;
        });
    }

    public zoomIn(): void {
        this.zoomBy(1.2);
    }

    public zoomOut(): void {
        this.zoomBy(1 / 1.2);
    }

    public resetViewport(): void {
        this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        this.canvas.requestRenderAll();
    }

    private zoomBy(factor: number): void {
        const zoom = Math.min(5, Math.max(0.25, this.canvas.getZoom() * factor));
        this.canvas.zoomToPoint(new Point(this.canvas.getWidth() / 2, this.canvas.getHeight() / 2), zoom);
    }

    protected onDoubleClick(_: TPointerEventInfo<PointerEvent>): void {};
};