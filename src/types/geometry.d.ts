import type { XY } from "fabric";

export type Triangle = [XY, XY, XY];
export type Edge = [XY, XY];

// To separate the two index types for readability
export type PointIndex = number;
export type TriangleIndex = number;

export type IndexTriangle = [PointIndex, PointIndex, PointIndex];