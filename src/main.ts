import "./style.css";

// import { Canvas, FabricText, Polygon } from "fabric";
import * as fabric from "fabric";
import { GPolygon } from "./canvas/GPolygon";
import { triangulate } from "./geometry/triangulation";
// import { isPolygonSimple } from "./geometry/simple";

/* ---- Initialization ---- */

const canvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const canvas = new fabric.Canvas(canvasElement, {
    backgroundColor: "#fff",
    width: 800,
    height: 300
});

canvas.selection = false;

const P = new GPolygon([
    { x: 300, y: 250 },
    { x: 500, y: 250 },
    { x: 400, y: 50 },
], canvas);

canvas.on("mouse:dblclick", e => {
    P.createNewVertex(e.viewportPoint);
})

const text = new fabric.Textbox("coords", {
    top: 20, left: 200, width: 300
});
canvas.add(text);

canvas.on("mouse:move", e => {
    // console.log("FJKLSD");
    text.set("text", `coords: ${e.viewportPoint}`);
    canvas.requestRenderAll();
})


//// TESTING ////

window.addEventListener("keydown", e => {
    // console.log("FJKLDS");
    if (e.key === " ") {
        triangulate(P.getPoints());
    }
})