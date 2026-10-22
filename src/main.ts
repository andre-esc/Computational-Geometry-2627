import "./style.css";

// import { Canvas, FabricText, Polygon } from "fabric";
import * as fabric from "fabric";
import { GPolygon } from "./geometry/GPolygon";
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


//// TESTING ////

// window.addEventListener("keydown", e => {
//     // console.log("FJKLDS");
//     if (e.key === " ") {
//         isPolygonSimple(P.points);
//     }
// })