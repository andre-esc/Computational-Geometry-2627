import { Canvas, type TPointerEventInfo } from "fabric";

export default abstract class Demo {
    protected readonly canvasElement: HTMLCanvasElement;
    protected readonly canvas: Canvas;

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
        // this.canvas.on("mouse:down", this.onClick);
    }

    // protected abstract onClick(e: TPointerEventInfo<PointerEvent>): void;
    protected onDoubleClick(_: TPointerEventInfo<PointerEvent>): void {};
    // protected abstract onRightClick(e: TPointerEventInfo<PointerEvent>): void;
};