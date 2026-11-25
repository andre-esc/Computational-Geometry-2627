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

    // ── 2. Mountain Range ─────────────────────────────────────────────────────
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
];
