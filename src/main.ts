import "./style.css";

import * as fabric from "fabric";

import { GPolygon } from "./canvas/GPolygon";
import { computeBoundaryGuardSet } from "./geometry/boundaryGuard";
import { isWeaklyVisible } from "./geometry/weakVisibility";
import { triangulate } from "./geometry/triangulation";
import { buildWitnessSet, collectUniqueBoundaryCuts, type WitnessPoint } from "./geometry/witnessSet";
import { buildVisibilityMatrix, type VisibilityMatrix } from "./geometry/visibilityMatrix";
import { localSearchDominatingSet, type DominatingSetResult } from "./geometry/dominatingSet";
import type { BoundaryCoord } from "./geometry/boundaryCoord";

/* ---- Canvas Initialization ---- */

const container = document.getElementById("canvas-container") as HTMLElement;
const canvasElement = document.getElementById("canvas") as HTMLCanvasElement;

const canvas = new fabric.Canvas(canvasElement, {
  backgroundColor: "#ffffff",
  width: container.clientWidth || 900,
  height: container.clientHeight || 500,
  selection: false,
});

// Resize canvas when window resizes
window.addEventListener("resize", () => {
  canvas.setDimensions({
    width: container.clientWidth,
    height: container.clientHeight,
  });
  canvas.requestRenderAll();
});

// Default starting polygon (WV polygon with base on bottom)
const P = new GPolygon(
  [
    { x: 250, y: 380 }, // v0 (u)
    { x: 650, y: 380 }, // v1 (v)
    { x: 720, y: 220 },
    { x: 580, y: 160 },
    { x: 500, y: 240 }, // reflex corner
    { x: 420, y: 120 },
    { x: 340, y: 220 }, // reflex corner
    { x: 200, y: 180 },
  ],
  canvas,
);

canvas.on("mouse:dblclick", (e) => {
  P.createNewVertex(e.viewportPoint);
  clearOverlays();
});

/* ---- UI Element References ---- */

const coordsDisplay = document.getElementById("coords-display") as HTMLElement;
const statusInfo = document.getElementById("status-info") as HTMLElement;
const btnComputeGuards = document.getElementById("btn-compute-guards") as HTMLButtonElement;
const btnTriangulate = document.getElementById("btn-triangulate") as HTMLButtonElement;
const btnClearOverlays = document.getElementById("btn-clear-overlays") as HTMLButtonElement;

const toggleCuts = document.getElementById("toggle-cuts") as HTMLInputElement;
const toggleWitnesses = document.getElementById("toggle-witnesses") as HTMLInputElement;
const toggleSightlines = document.getElementById("toggle-sightlines") as HTMLInputElement;
const toggleLive = document.getElementById("toggle-live") as HTMLInputElement;

// canvas.on("mouse:move", e => {
//     // console.log("FJKLSD");
//     text.set("text", `coords: ${e.viewportPoint}`);
//     canvas.requestRenderAll();
// })


//// TESTING ////

window.addEventListener("keydown", e => {
    // console.log("FJKLDS");
    if (e.key === " ") {
        // triangulate(P.getPoints());

        const points = P.getPoints();

        // const { triangles, dualTree, rootIndex, commonEdgeMatrix } = triangulate(points);

        if (!isWeaklyVisible(points)) {
            console.log("Not weakly visible.");
        } else {
            console.log(`Boundary guard: ${computeBoundaryGuardSet(points).guards}`);
        }
    }
})
canvas.on("mouse:move", (e) => {
  const p = e.viewportPoint;
  coordsDisplay.textContent = `coords: (${Math.round(p.x)}, ${Math.round(p.y)})`;
});

/* ---- Visual Overlay Management ---- */

// Keep track of debug canvas objects to clear/redraw easily
let overlayObjects: fabric.FabricObject[] = [];
let lastCuts: BoundaryCoord[] = [];
let lastWitnesses: WitnessPoint[] = [];
let lastResult: DominatingSetResult | null = null;
let lastMatrix: VisibilityMatrix | null = null;

function clearOverlays(): void {
  for (const obj of overlayObjects) {
    canvas.remove(obj);
  }
  overlayObjects = [];
  canvas.requestRenderAll();
}

function renderVisuals(): void {
  clearOverlays();

  // 1. Render Boundary Cuts B (orange crosses)
  if (toggleCuts.checked && lastCuts.length > 0) {
    for (const cut of lastCuts) {
      const size = 4;
      const line1 = new fabric.Line([cut.point.x - size, cut.point.y - size, cut.point.x + size, cut.point.y + size], {
        stroke: "#f4a261",
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      const line2 = new fabric.Line([cut.point.x - size, cut.point.y + size, cut.point.x + size, cut.point.y - size], {
        stroke: "#f4a261",
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      canvas.add(line1, line2);
      overlayObjects.push(line1, line2);
    }
  }

  // 2. Render Witness Points W (teal dots)
  if (toggleWitnesses.checked && lastWitnesses.length > 0) {
    for (const w of lastWitnesses) {
      const dot = new fabric.Circle({
        left: w.point.x - 3,
        top: w.point.y - 3,
        radius: 3,
        fill: "#2a9d8f",
        stroke: "#1b4332",
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      canvas.add(dot);
      overlayObjects.push(dot);
    }
  }

  // 3. Render Guard Sightlines (faint red dashed lines from guards to covered witnesses)
  if (toggleSightlines.checked && lastResult && lastMatrix) {
    for (const guardIdx of lastResult.guards) {
      const guardPt = lastMatrix.candidates[guardIdx];
      const coveredWitnessIndices = lastMatrix.guardCoverage[guardIdx];

      for (const wIdx of coveredWitnessIndices) {
        const witnessPt = lastMatrix.witnesses[wIdx].point;
        const line = new fabric.Line([guardPt.x, guardPt.y, witnessPt.x, witnessPt.y], {
          stroke: "rgba(230, 57, 70, 0.15)",
          strokeWidth: 1,
          strokeDashArray: [3, 3],
          selectable: false,
          evented: false,
        });
        canvas.add(line);
        overlayObjects.push(line);
      }
    }
  }

  // 4. Render Selected Guard Vertices (prominent red rings)
  if (lastResult) {
    for (const p of lastResult.guardPoints) {
      const outerRing = new fabric.Circle({
        left: p.x - 10,
        top: p.y - 10,
        radius: 10,
        fill: "rgba(230, 57, 70, 0.2)",
        stroke: "#e63946",
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });

      const centerDot = new fabric.Circle({
        left: p.x - 4,
        top: p.y - 4,
        radius: 4,
        fill: "#e63946",
        selectable: false,
        evented: false,
      });

      canvas.add(outerRing, centerDot);
      overlayObjects.push(outerRing, centerDot);
    }
  }

  canvas.requestRenderAll();
}

/* ---- Core Pipeline Trigger ---- */

let liveUpdateFrame: number | null = null;

function scheduleLiveGuarding(): void {
  if (!toggleLive.checked) return;

  if (liveUpdateFrame !== null) {
    cancelAnimationFrame(liveUpdateFrame);
  }

  liveUpdateFrame = requestAnimationFrame(() => {
    liveUpdateFrame = null;
    runBoundaryGuarding();
  });
}

// Hook into GPolygon vertex movement / addition / deletion
P.onUpdate = () => {
  scheduleLiveGuarding();
};

function runBoundaryGuarding(): void {
  const points = P.getPoints();
  if (points.length < 3) {
    statusInfo.textContent = "Polygon must have at least 3 vertices.";
    return;
  }

  const startTime = performance.now();

  // Phase 2/3: Discretize boundary into cut points and witnesses
  lastCuts = collectUniqueBoundaryCuts(points);
  lastWitnesses = buildWitnessSet(points, true);

  // Phase 4: Construct bipartite visibility matrix
  lastMatrix = buildVisibilityMatrix(points, lastWitnesses);

  // Phase 5: Solve Dominating Set via Greedy + k <= 2 local search
  lastResult = localSearchDominatingSet(lastMatrix);

  const durationMs = Math.round(performance.now() - startTime);

  statusInfo.textContent = `Guards: ${lastResult.guards.length} (Greedy was ${lastResult.initialGreedySize}, ${lastResult.iterations} swaps) | |B| = ${lastCuts.length}, |W| = ${lastWitnesses.length} (${durationMs}ms)`;

  renderVisuals();
}

/* ---- Event Listeners ---- */

btnComputeGuards.addEventListener("click", runBoundaryGuarding);

btnTriangulate.addEventListener("click", () => {
  const points = P.getPoints();
  triangulate(points);
  statusInfo.textContent = "Triangulation run; see console for dual graph & weak visibility checks.";
});

btnClearOverlays.addEventListener("click", () => {
  clearOverlays();
  lastResult = null;
  lastCuts = [];
  lastWitnesses = [];
  lastMatrix = null;
  statusInfo.textContent = "Overlays cleared.";
});

toggleCuts.addEventListener("change", renderVisuals);
toggleWitnesses.addEventListener("change", renderVisuals);
toggleSightlines.addEventListener("change", renderVisuals);
toggleLive.addEventListener("change", () => {
  if (toggleLive.checked) {
    runBoundaryGuarding();
  }
});

// Run initial solve so guards appear immediately on load
runBoundaryGuarding();

window.addEventListener("keydown", (e) => {
  if (e.key === "g" || e.key === "G") {
    runBoundaryGuarding();
  } else if (e.key === " ") {
    triangulate(P.getPoints());
  } else if (e.key === "c" || e.key === "C") {
    clearOverlays();
  }
});
