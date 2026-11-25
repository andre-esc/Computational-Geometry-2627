import "./style.css";

import WVDemo from "./demos/WVDemo";
import BoundaryGuardingDemo from "./demos/BoundaryGuardingDemo";
import PlaygroundDemo from "./demos/PlaygroundDemo";
import HoleGuardingDemo from "./demos/HoleGuardingDemo";
import { SCENARIOS } from "./demos/scenarios";

// ── Article demos ────────────────────────────────────────────────────────────

function tryInit<T>(fn: () => T): T | null {
    try { return fn(); }
    catch (e) { console.warn("Demo init skipped:", e); return null; }
}

void tryInit(() => new WVDemo("wvDemo", 760, 300));
void tryInit(() => new BoundaryGuardingDemo("boundaryGuardingDemo", 760, 300));
void tryInit(() => new HoleGuardingDemo("holeGuardDemo", 760, 300));
const playgroundDemo = tryInit(() => new PlaygroundDemo("playgroundCanvas", 920, 520));

// ── Status bar for playground ─────────────────────────────────────────────────

const statusEl = document.getElementById("pg-status");
const statusTextEl = document.getElementById("pg-status-text");

function setStatus(msg: string, type: "ok" | "warn" | "error" | "info") {
    if (!statusEl || !statusTextEl) return;
    statusEl.className = `pg-status pg-status--${type}`;
    statusTextEl.textContent = msg;
}

playgroundDemo?.setStatusCallback(setStatus);

// ── Tab switching ─────────────────────────────────────────────────────────────

const tabArticle    = document.getElementById("tab-article")!;
const tabPlayground = document.getElementById("tab-playground")!;
const btnArticle    = document.getElementById("btn-tab-article")!;
const btnPlayground = document.getElementById("btn-tab-playground")!;

function activateTab(tab: "article" | "playground") {
    if (tab === "article") {
        tabArticle.classList.remove("hidden");
        tabPlayground.classList.add("hidden");
        btnArticle.classList.add("tab-active");
        btnPlayground.classList.remove("tab-active");
    } else {
        tabArticle.classList.add("hidden");
        tabPlayground.classList.remove("hidden");
        btnArticle.classList.remove("tab-active");
        btnPlayground.classList.add("tab-active");
        // Force fabric to re-render after the container becomes visible
        setTimeout(() => {
            playgroundDemo?.clearOverlay(false);
        }, 50);
    }
}

btnArticle?.addEventListener("click", () => activateTab("article"));
btnPlayground?.addEventListener("click", () => activateTab("playground"));

// Respect hash navigation
if (window.location.hash === "#playground") activateTab("playground");

// ── Playground toolbar buttons ────────────────────────────────────────────────

document.getElementById("pg-btn-wv")?.addEventListener("click", () => {
    playgroundDemo?.checkWV();
});

document.getElementById("pg-btn-boundary")?.addEventListener("click", () => {
    playgroundDemo?.computeBoundaryGuards();
});

document.getElementById("pg-btn-full")?.addEventListener("click", () => {
    playgroundDemo?.computeAllGuards();
});

document.getElementById("pg-btn-clear")?.addEventListener("click", () => {
    playgroundDemo?.clearOverlay();
});

// ── Scenario selector ─────────────────────────────────────────────────────────

const scenarioSelect = document.getElementById("pg-scenario-select") as HTMLSelectElement | null;

if (scenarioSelect) {
    // Populate the <select> from the scenarios array
    for (const s of SCENARIOS) {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.name;
        scenarioSelect.appendChild(opt);
    }

    scenarioSelect.addEventListener("change", () => {
        const id = scenarioSelect.value;
        if (!id) return;
        const scenario = SCENARIOS.find(s => s.id === id);
        if (scenario && playgroundDemo) {
            activateTab("playground");
            // Small delay so the canvas is visible before we reload points
            setTimeout(() => {
                playgroundDemo.loadScenario(scenario);
            }, 60);
        }
        // Reset select to placeholder so the same item can be re-loaded
        scenarioSelect.value = "";
    });
}
