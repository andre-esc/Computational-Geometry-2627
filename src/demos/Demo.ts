import { Canvas, type TPointerEventInfo } from "fabric";

/**
 * Base class for demos. Takes in a canvas id and dimensions, and automatically initializes
 * the fabric.js canvas.
 * 
 * Also contains modifiable callbacks for various input events.
 */
export default abstract class Demo {
    protected readonly canvasElement: HTMLCanvasElement;
    protected readonly canvas: Canvas;

    protected readonly infoText: HTMLElement | null;

    constructor(canvasId: string, width: number, height: number, infoTextId?: string) {
        const htmlCanvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (htmlCanvas === null) throw new Error("Canvas ID doesn't exist");

        this.canvasElement = htmlCanvas;
        this.canvas = new Canvas(htmlCanvas, {
            width,
            height,
            backgroundColor: "#fff",
            selection: false,
        });

        if (infoTextId !== undefined) {
            const htmlInfoText = document.getElementById(infoTextId);
            if (htmlInfoText === null) throw new Error("Info text ID doesn't exist");
    
            this.infoText = htmlInfoText;
        } else {
            this.infoText = null;
        }

        this.canvas.on("mouse:dblclick", this.onDoubleClick.bind(this));
    }

    protected onDoubleClick(_: TPointerEventInfo<PointerEvent>): void {};

    protected readonly updateInfoText = (text: string) => {
        if (this.infoText === null) {
            console.warn("Trying to set info text of demo that doesn't have info text");
        } else {
            this.infoText.innerText = text;
            MathJax.typesetClear([this.infoText]);
            MathJax.typesetPromise([this.infoText]);
        }
    }
};