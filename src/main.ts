import { Polyline } from "fabric";
import "./style.css";

// import { Canvas, FabricText, Polygon } from "fabric";
import * as fabric from "fabric";
import { PointControl } from "./canvas/PointControl";

/* ---- Initialization ---- */

const canvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const canvas = new fabric.Canvas(canvasElement, {
    backgroundColor: "#fff",
    width: 800,
    height: 300
});

canvas.selection = false;

const P = new fabric.Polygon([
    { x: 300, y: 250 },
    { x: 500, y: 250 },
    { x: 400, y: 50 },
], {
    stroke: "black",
    strokeWidth: 3,
    fill: "rgba(0,0,0,0.1)",
    selectable: false,
    evented: false,
})
canvas.add(P);

const bottomEdge = new Polyline([P.points[0], P.points[1]], {
    stroke: "red",
    strokeWidth: 3,
    selectable: false,
    evented: false,
});
canvas.add(bottomEdge);

/* ---- Control creation/deletion ---- */

const controls: PointControl[] = [];

const removeControl = (c: PointControl) => {
    const controlIndex = c.getIndex();

    if (controlIndex < 2 || P.points.length <= 3) return;

    for (let j = controlIndex+1; j < controls.length; j++) {
        controls[j].setIndex(j-1);

        console.log(controls[j].getIndex());
    }

    controls.splice(controlIndex, 1);

    P.points.splice(controlIndex, 1);
    P.setBoundingBox(true);
    P.dirty = true;

    canvas.remove(c.getControl());

    canvas.requestRenderAll();

    console.log(P.points);
};

function createControl(index: number): void {
    const c = new PointControl(P, index, removeControl);

    canvas.add(c.getControl());

    controls.push(c);
}

for (let i = 0; i < P.points.length; i++) {
    createControl(i);
}

canvas.on("mouse:dblclick", e => {
    console.log(e.viewportPoint);

    P.points.push(e.viewportPoint);
    P.setBoundingBox(true);
    P.dirty = true;

    createControl(P.points.length - 1);

    canvas.requestRenderAll();
});