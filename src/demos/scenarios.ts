import type { XY } from "fabric";

export interface Scenario {
    id: string;
    name: string;
    description: string;
    points: XY[];
}

/**
 * All points are designed for a 920×520 canvas.
 * p0 / p1 are always the base-edge endpoints (at y ≈ 450).
 * Every polygon is weakly visible from that base edge.
 *
 * These shapes are intentionally crafted so that the boundary-guard
 * set leaves uncovered interior pockets, exercising the hole-guarding
 * stage of the algorithm.
 */
export const SCENARIOS: Scenario[] = [
    // ── 1. W-shape ────────────────────────────────────────────────────────────
    {
        id: "w-shape",
        name: "W-shape",
        description:
            "Classic two-valley W.  The boundary guards sit near the valley floors; " +
            "the trapezoidal pockets above each valley need extra guards to cover.",
        points: [
            { x: 90,  y: 450 },   // p0 — base left
            { x: 830, y: 450 },   // p1 — base right
            { x: 740, y: 120 },   // right peak
            { x: 590, y: 310 },   // right valley
            { x: 460, y: 120 },   // centre peak
            { x: 320, y: 310 },   // left valley
            { x: 180, y: 120 },   // left peak
        ],
    },

    // ── 2. Twin Pockets ───────────────────────────────────────────────────────
    {
        id: "twin-pockets",
        name: "Twin pockets",
        description:
            "Two rectangular notches cut into the ceiling.  Guards placed at the " +
            "shoulder corners cannot see the deep interior of each pocket, " +
            "so hole-guarding must add one guard per pocket.",
        points: [
            { x: 90,  y: 450 },   // p0 — base left
            { x: 830, y: 450 },   // p1 — base right
            { x: 830, y: 100 },   // top-right outer corner
            { x: 670, y: 100 },   // right pocket — right shoulder
            { x: 670, y: 340 },   // right pocket — bottom-right
            { x: 580, y: 340 },   // right pocket — bottom-left
            { x: 580, y: 100 },   // right pocket — left shoulder
            { x: 420, y: 100 },   // left pocket — right shoulder
            { x: 420, y: 340 },   // left pocket — bottom-right
            { x: 330, y: 340 },   // left pocket — bottom-left
            { x: 330, y: 100 },   // left pocket — left shoulder
            { x: 90,  y: 100 },   // top-left outer corner
        ],
    },

    // ── 3. Triple Comb ────────────────────────────────────────────────────────
    {
        id: "triple-comb",
        name: "Triple comb",
        description:
            "Three evenly-spaced downward notches.  The narrow corridors force " +
            "the boundary guard set to grow, and the pockets between teeth " +
            "are ideal stress-tests for the hole-guarding algorithm.",
        points: [
            { x: 90,  y: 450 },   // p0 — base left
            { x: 830, y: 450 },   // p1 — base right
            { x: 830, y: 110 },   // top-right
            { x: 715, y: 110 },   // tooth-3 right shoulder
            { x: 715, y: 355 },   // tooth-3 bottom-right
            { x: 645, y: 355 },   // tooth-3 bottom-left
            { x: 645, y: 110 },   // tooth-3 left shoulder
            { x: 545, y: 110 },   // tooth-2 right shoulder
            { x: 545, y: 355 },   // tooth-2 bottom-right
            { x: 475, y: 355 },   // tooth-2 bottom-left
            { x: 475, y: 110 },   // tooth-2 left shoulder
            { x: 375, y: 110 },   // tooth-1 right shoulder
            { x: 375, y: 355 },   // tooth-1 bottom-right
            { x: 305, y: 355 },   // tooth-1 bottom-left
            { x: 305, y: 110 },   // tooth-1 left shoulder
            { x: 90,  y: 110 },   // top-left
        ],
    },

    // ── 4. Deep Offset Pocket ─────────────────────────────────────────────────
    {
        id: "deep-pocket",
        name: "Deep offset pocket",
        description:
            "One wide, asymmetric pocket placed off-centre.  The guard on the near " +
            "shoulder sees most of the pocket but misses the far corner — a minimal " +
            "case that reliably produces exactly one hole.",
        points: [
            { x: 90,  y: 450 },   // p0 — base left
            { x: 830, y: 450 },   // p1 — base right
            { x: 830, y: 100 },   // top-right
            { x: 560, y: 100 },   // pocket right shoulder
            { x: 560, y: 310 },   // pocket bottom-right
            { x: 390, y: 310 },   // pocket bottom-left
            { x: 390, y: 100 },   // pocket left shoulder
            { x: 90,  y: 100 },   // top-left
        ],
    },

    // ── 5. Mountain Range ─────────────────────────────────────────────────────
    {
        id: "mountain-range",
        name: "Mountain range",
        description:
            "Five alternating peaks and valleys.  Guards land at valley floors; " +
            "the pockets behind each peak interact to form multiple crossing " +
            "constructed edges.",
        points: [
            { x: 90,  y: 450 },   // p0 — base left
            { x: 830, y: 450 },   // p1 — base right
            { x: 790, y: 130 },   // peak 5 (right)
            { x: 680, y: 290 },   // valley 4
            { x: 580, y: 130 },   // peak 4
            { x: 460, y: 290 },   // valley 3
            { x: 370, y: 130 },   // peak 3
            { x: 255, y: 290 },   // valley 2
            { x: 165, y: 130 },   // peak 2 (left)
        ],
    },

    // ── 6. Spiral Staircase ───────────────────────────────────────────────────
    {
        id: "staircase",
        name: "Spiral staircase",
        description:
            "An asymmetric staircase that spirals inward.  Its mix of deep and " +
            "shallow recesses generates a diverse set of constructed edges that " +
            "cross at multiple heights.",
        points: [
            { x: 90,  y: 450 },   // p0 — base left
            { x: 830, y: 450 },   // p1 — base right
            { x: 830, y: 110 },   // top-right
            { x: 650, y: 110 },   // step-3 top
            { x: 650, y: 240 },   // step-3 riser
            { x: 500, y: 240 },   // step-2 top
            { x: 500, y: 350 },   // step-2 riser
            { x: 310, y: 350 },   // step-1 top
            { x: 310, y: 200 },   // step-1 riser (goes back up)
            { x: 180, y: 200 },   // left shelf
            { x: 180, y: 110 },   // top-left-inner
            { x: 90,  y: 110 },   // top-left
        ],
    },
];
