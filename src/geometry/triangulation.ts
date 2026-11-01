import type { XY } from "fabric";
import { getCircular, sliceCircular } from "../util/circularList";
import { isConvex, isInTriangle, orient, toSortedEdge } from "./misc";
import type { Edge } from "../types/geometry";
import { getSpanningTree } from "./spanningTree";

// To separate the two index types for readability
type PointIndex = number;
type TriangleIndex = number;

type IndexTriangle = [PointIndex, PointIndex, PointIndex];

function isAnEar(index: number, pointRef: XY[], availablePoints: number[]) {
    if (availablePoints.length <= 3) return true;
    
    const p = pointRef[availablePoints[index]];
    const n1 = pointRef[getCircular(availablePoints, index - 1)];
    const n2 = pointRef[getCircular(availablePoints, index + 1)];

    if (!isConvex(n1, p, n2)) return false;

    for (let q of availablePoints) {
        if (isInTriangle(pointRef[q], n1, p, n2)) return false;
    }

    console.log(`${getCircular(availablePoints, index - 1)} ${availablePoints[index]} ${getCircular(availablePoints, index + 1)} is an ear`);

    return true;
}

/**
 * Finds an ear in a simple polygon.
 * 
 * @param pointRef Dictionary of points
 * @param availablePoints Index of the points of the polygon (actual coordinates are stored in pointRef)
 * 
 * @returns Index of a point that is an ear
 */
function findEarIndex(pointRef: XY[], availablePoints: number[]): number {
    let i = 0;

    for (; i < availablePoints.length; i++) {
        if (isAnEar(i, pointRef, availablePoints)) {
            console.log("Found ear", availablePoints[i], "at index", i, "of polygon", availablePoints);

            return i;
        }
    }

    throw new Error("Ear not found!!!");

    // Base case
    // if (availablePoints.length === 3) return 1;

    // const half = Math.ceil(availablePoints.length / 2);

    // let convexIndex = -1;



    // // Find first convex vertex opposite to first edge
    // for (let i = 0; i < availablePoints.length / 2; i++) {
    //     if (convexIndex !== -1) break;
        
    //     for (let d of [-1, 1]) {
    //         const ii = half + d * i;

    //         const p = pointRef[availablePoints[ii]];
    //         const n1 = pointRef[getCircular(availablePoints, ii - 1)];
    //         const n2 = pointRef[getCircular(availablePoints, ii + 1)];
    //         console.log("convex test", getCircular(availablePoints, ii - 1), availablePoints[ii], getCircular(availablePoints, ii + 1), isConvex(n1, p, n2));

    //         if (isConvex(n1, p, n2)) {
    //             convexIndex = ii;
    //             break;
    //         }
    //     }
    // }

    // // There is always a convex edge, so no need to check existence
    // const conv = pointRef[availablePoints[convexIndex]];
    // const n1 = pointRef[getCircular(availablePoints, convexIndex - 1)];
    // const n2 = pointRef[getCircular(availablePoints, convexIndex + 1)];

    // // Vertex that (potentially) makes this not an ear
    // let offendingVertexIndex = -1;

    // // console.log("convexIndex", convexIndex);
    // // console.log("triangle points", n1, conv, n2);

    // // Check if ear
    // for (let i = 0; i < availablePoints.length; i++) {
    //     const testVertex = pointRef[availablePoints[i]];
    //     const testN1 = pointRef[getCircular(availablePoints, i - 1)];
    //     const testN2 = pointRef[getCircular(availablePoints, i + 1)];

    //     console.log(getCircular(availablePoints, i - 1), availablePoints[i], getCircular(availablePoints, i + 1));

    //     if (!isConvex(testN1, testVertex, testN2) && isInTriangle(pointRef[availablePoints[i]], n1, conv, n2)) {
    //         offendingVertexIndex = i;

    //         break;
    //     }
    // }

    // if (offendingVertexIndex === -1) {
    //     return convexIndex;    // Already an ear
    // } else {
    //     let newBad = 
    //         offendingVertexIndex > convexIndex ? 
    //             [convexIndex, offendingVertexIndex] : 
    //             [offendingVertexIndex, convexIndex];

    //     // If this order would give the larger sub-polygon, invert
    //     if (newBad[1] - newBad[0] > availablePoints.length/2) {
    //         newBad = [newBad[1], newBad[0]];
    //     }

    //     const subPolygon = sliceCircular(availablePoints, newBad[0], newBad[1]);
    //     console.log("new bad index", newBad);
    //     console.log("polygon", availablePoints, "tested ear", availablePoints[convexIndex], "offending", availablePoints[offendingVertexIndex], "new bad", [availablePoints[newBad[0]], availablePoints[newBad[1]]], "subpolygon", subPolygon);
    //     const earIndex = findEarIndex(pointRef, subPolygon);
    //     // Add back the index offset lost when passing to sub-polygon indices
    //     return (earIndex + newBad[0]) % availablePoints.length;
    // }
}

// Returns a string representation of an edge
function stringifyEdge(edge: [PointIndex, PointIndex]) {
    return `${edge[0]} ${edge[1]}`;
}
// Returns the edge from a string representation
function destringifyEdge(edgeString: string) {
    return edgeString.split(" ").map(Number) as [number, number];
}

/**
 * 
 * @param points Points of the polygon
 */
export function triangulate(points: XY[]) {
    
    // edgeMap.get("i j") gives the index of all triangles sharing the edge [points[i], points[j]]
    const edgeMap = new Map<string, TriangleIndex[]>();
    const dualGraphAdjacencyList: number[][] = [];

    function _triangulate(availablePoints: PointIndex[]): IndexTriangle[] {
        let triangle: IndexTriangle, res: IndexTriangle[], triangleIndex: number;

        // Base case
        if (availablePoints.length === 3) {
            triangle = [...(availablePoints as [PointIndex, PointIndex, PointIndex])];

            res = [];
            triangleIndex = 0;
        } else {
            const earIndex = findEarIndex(points, availablePoints);

            const n1 = getCircular(availablePoints, earIndex - 1);
            const n2 = getCircular(availablePoints, earIndex + 1);

            const newPoints = availablePoints.slice();
            newPoints.splice(earIndex, 1);
            console.log("removed ear", availablePoints[earIndex], "new poly", newPoints);

            triangle = [n1, availablePoints[earIndex], n2];

            res = _triangulate(newPoints);
            triangleIndex = res.length;
        }
        
        dualGraphAdjacencyList.push([]);
        
        for (let p1 = 0; p1 < 3; p1++) {
            const p2 = (p1 + 1) % 3;
            
            const t1 = triangle[p1], t2 = triangle[p2];
            const edge = (t1 < t2 ? [t1, t2] : [t2, t1]) as [PointIndex, PointIndex];  // Consistent index ordering
            const edgeString = stringifyEdge(edge);
            
            let mapping = edgeMap.get((edgeString));

            if (mapping === undefined) {
                edgeMap.set(edgeString, [triangleIndex]);
            } else {
                // Build adjacency list of dual graph as we go
                for (let adjIndex of mapping) {
                    dualGraphAdjacencyList[triangleIndex].push(adjIndex);
                    dualGraphAdjacencyList[adjIndex].push(triangleIndex);
                }

                edgeMap.set(edgeString, [...mapping, triangleIndex]);
            }
        }

        res.push(triangle);

        return res
    }

    const triangles = _triangulate(points.map((_, i) => i));

    console.log("triangulation", triangles);
    console.log("root index", edgeMap.get("0 1"));
    
    // Adjacency matrix storing the common edges
    const commonEdgeMatrix = new Array(triangles.length).fill(null).map(() => new Array<[PointIndex, PointIndex] | null>(triangles.length).fill(null));

    for (let [edgeString, indices] of edgeMap) {
        // Note: This length is never greater than 2
        if (indices.length == 2) {
            const edge = destringifyEdge(edgeString);

            commonEdgeMatrix[indices[0]][indices[1]] = edge;
            commonEdgeMatrix[indices[1]][indices[0]] = edge;
        }
    }

    // console.log("common edge matrix", commonEdgeMatrix);

    const rootIndex = edgeMap.get("0 1")![0];  // Boundary edges always have one element (triangle) in edgeMap
    const tree = getSpanningTree(dualGraphAdjacencyList, rootIndex);

    // console.log("root index", rootIndex);
    // console.log("adjacency list", dualGraphAdjacencyList);
    // console.log("dual tree", tree);

    console.log("Weakly visible ?", isWeaklyVisible(points, triangles, tree, commonEdgeMatrix, rootIndex));

    return []
}

type Funnel = {
    L: PointIndex[],
    R: PointIndex[],
    apex: PointIndex,
}

// const initFunnels = (): [Funnel, Funnel] => [{ L: -1, R: -1, apex: 0 }, { L: -1, R: -1, apex: 1 }];
const initFunnel = (start: PointIndex): Funnel => ({ L: [], R: [], apex: start });

type SPTTraverse = {
    portal: [PointIndex, PointIndex],
    triangle: TriangleIndex | null,
    funnel: Funnel
}

function getShortestPathTree(
    polygon: XY[], triangles: IndexTriangle[], 
    dualTree: number[][], commonEdgeMatrix: ([PointIndex, PointIndex] | null)[][],
    startPointIndex: PointIndex, startTriangleIndex: TriangleIndex
) {
    const stack: SPTTraverse[] = [{
        portal: [startPointIndex, startPointIndex],
        triangle: startTriangleIndex,
        funnel: initFunnel(startPointIndex)
    }];

    const spt: PointIndex[] = new Array(polygon.length).fill(-1);

    while (stack.length > 0) {
        const { portal, triangle, funnel } = stack.pop()!;
        console.log("Through portal", portal, "funnel", funnel)
        const { L, R, apex } = funnel;

        const lastL = L.at(-1) ?? -1;
        const lastR = R.at(-1) ?? -1;

        const newFunnel: Funnel = { L: [...L], R: [...R], apex };

        let dLeftIndex: number, dLeft: XY;
        let dRightIndex: number, dRight: XY;

        // Determine left-path and right-path diagonal points 
        if (portal[1] === lastL || portal[0] === lastR || orient(polygon[portal[0]], polygon[apex], polygon[portal[1]]) < 0) {
            dLeftIndex = portal[1]; dLeft = polygon[portal[1]];
            dRightIndex = portal[0]; dRight = polygon[portal[0]];
        } else {
            dLeftIndex = portal[0]; dLeft = polygon[portal[0]];
            dRightIndex = portal[1]; dRight = polygon[portal[1]];
        }


        console.log("oriented portal:", dLeftIndex, dRightIndex)
        console.log("funnel mouth:", lastL, lastR);

        // const lastL = L.at(-1);
        // const lastL = L.at(-1);

        

        // Update left funnel
        if (L.length === 0) {
            newFunnel.L = [dLeftIndex];
            spt[dLeftIndex] = apex;
        }
        else if (lastL !== dLeftIndex) {
            // Funnel tightens
            if (orient(polygon[apex], polygon[lastL], dLeft) <= 0) {
                console.log("Tighten left");
                // Unwrap path around concave chain ("pulling the path taut")
                if (newFunnel.L.length > 1) {
                    while (newFunnel.L.length > 1) {
                        const l1 = newFunnel.L.at(-1)!;
                        const l2 = newFunnel.L.at(-2)!;

                        if (orient(polygon[l2], polygon[l1], dLeft) > 0) break;
                        else {
                            newFunnel.L.pop();
                        }
                    }

                    // spt[dLeftIndex] = newFunnel.L.at(-1) ?? apex;
                    newFunnel.L[0] = (dLeftIndex);
                }
                

                // newFunnel.L = [newFunnel.L[0]];
                // while (newFunnel.L.length > 1) {
                //     console.log("test unwrap", newFunnel.L.at(-2)!, newFunnel.L.at(-1)!, dLeftIndex)
                //     if (orient(polygon[newFunnel.L.at(-2)!], polygon[newFunnel.L.at(-1)!], polygon[dLeftIndex]) > 0) break;
                    
                //     console.log("Unwrapped", newFunnel.L.at(-1))
                //     const l =newFunnel.L.pop()!;
                //     spt[l] = newFunnel.L.at(-1)!;
                // }

                // console.log("new L after unwrapping:", newFunnel.L)

                // Check if funnel was pinched
                if (orient(polygon[apex], polygon[lastR], dLeft) < 0) {
                    newFunnel.apex = lastR;
                    newFunnel.L = [lastR];
                    newFunnel.R = [lastR];
                    // spt[dLeftIndex] = R;
                    console.log("Pinch from left! New funnel:", newFunnel);

                    stack.push({
                        portal, triangle, funnel: newFunnel
                    });

                    continue;
                }
                else {
                    newFunnel.L[newFunnel.L.length - 1] = dLeftIndex;

                    spt[dLeftIndex] = apex;
                }
                
            }
            else {
                // Extend concave chain ("wrap path around" concave portion)
                spt[dLeftIndex] = newFunnel.L.at(-1)!;

                newFunnel.L.push(dLeftIndex);
            }
        }

        console.log("SPT after left", spt);
        
        // There is no right funnel, initialize it
        if (R.length === 0) {
            newFunnel.R.push(dRightIndex);
            spt[dRightIndex] = apex;
        } 
        // The new right point is not the same as the current funnel right point
        else if (lastR !== dRightIndex) {
            // Funnel tightens
            if (orient(polygon[apex], polygon[lastR], dRight) >= 0) {
                 console.log("Tighten right");
                // Wrap path around concave chain ("pulling the path taut")
                // newFunnel.R = [newFunnel.R[0]];
                if (newFunnel.R.length > 1) console.log("Unwrapping concave chain", newFunnel.R);
                // while (newFunnel.R.length > 1) {
                //     if (orient(polygon[newFunnel.R.at(-2)!], polygon[newFunnel.R.at(-1)!], polygon[dRightIndex]) < 0) break;
                //     console.log("Unwrapped", newFunnel.R.at(-1))
                //     newFunnel.R.pop();
                //     // spt[r] = newFunnel.R.at(-1)!;
                // }
                // Unwrap path around concave chain ("pulling the path taut")
                while (newFunnel.R.length > 1) {
                    const r1 = newFunnel.R.at(-1)!;
                    const r2 = newFunnel.R.at(-2)!;

                    if (orient(polygon[r2], polygon[r1], dRight) < 0) break;
                    else {
                        newFunnel.R.pop();
                    }
                }

                // Check if funnel was pinched
                if (orient(polygon[apex], polygon[lastL], dRight) > 0) {
                    // while (newFunnel.L.length > 1) {
                    //     console.log("test unwrap", newFunnel.L.at(-2)!, newFunnel.L.at(-1)!, dLeftIndex)
                    //     if (orient(polygon[newFunnel.L.at(-2)!], polygon[newFunnel.L.at(-1)!], polygon[dLeftIndex]) > 0) break;
                        
                    //     console.log("Unwrapped", newFunnel.L.at(-1))
                    //     const l =newFunnel.L.pop()!;
                    //     spt[l] = newFunnel.L.at(-1)!;
                    // }

                    while (newFunnel.L.length > 1) {
                        const l1 = newFunnel.L.at(-1)!;
                        const l2 = newFunnel.L.at(-2)!;

                        if (orient(polygon[l2], polygon[l1], dLeft) > 0) break;
                        else {
                            newFunnel.L.pop();
                        }
                    }

                    const newL = newFunnel.L.at(-1)!;

                    newFunnel.apex = newL;
                    newFunnel.L = [newL];
                    newFunnel.R = [newL];
                    console.log("Pinch from right! New funnel:", newFunnel);

                    stack.push({
                        portal, triangle, funnel: newFunnel
                    });

                    continue;
                }
                else {
                    newFunnel.R[newFunnel.R.length - 1] = dRightIndex;
                    spt[dRightIndex] = apex;
                }
            }
            else {
                // Extend concave chain
                spt[dRightIndex] = newFunnel.R.at(-1)!;

                newFunnel.R.push(dRightIndex);
            }
        }

        console.log("SPT after right", spt);

        console.log("Updated funnel:", newFunnel);

        if (triangle !== null) {
            if (dualTree[triangle].length === 0) {
                let stop: [PointIndex, PointIndex];

                if (newFunnel.L.at(-1) === newFunnel.R.at(-1)) {
                    stop = triangles[triangle].filter(vertex => vertex != apex) as [PointIndex, PointIndex];
                }
                else {
                    const endpoint = triangles[triangle].find(vertex => vertex !== dLeftIndex && vertex !== dRightIndex)!;
                    stop = [endpoint, endpoint];
                }

                stack.push({
                    portal: stop,
                    triangle: null,
                    funnel: newFunnel
                })
            }
            else {
                for (let neighbor of dualTree[triangle]) {
                    stack.push({
                        portal: commonEdgeMatrix[triangle][neighbor]!,
                        triangle: neighbor,
                        funnel: newFunnel
                    })
                }
            }
        }
    }

    return spt;
}

export function isWeaklyVisible(
    polygon: XY[], triangles: IndexTriangle[], 
    dualTree: number[][], commonEdgeMatrix: ([PointIndex, PointIndex] | null)[][], rootIndex: number
) {

    // const queue: SPTTraverse[] = [];

    console.log("SPT from p0", getShortestPathTree(polygon, triangles, dualTree, commonEdgeMatrix, 0, rootIndex));

    // // BFS queue that also stores the funnel states for both base edge vertex SPTs
    // const queue: [number, [Funnel, Funnel]][] = [[rootIndex, initFunnels()]]

    // // Shortest-path trees for each root edge vertex (as parent lists)
    // const spt: [number[], number[]] = [
    //     new Array(polygon.length).fill(-1),
    //     new Array(polygon.length).fill(-1),
    // ];

    // while (queue.length > 0) {
    //     const [i, funnels] = queue.shift()!;

    //     console.log("funneling", triangles[i], funnels);
        
    //     // For all neighboring triangles...
    //     for (let j of dualTree[i]) {
    //         const newFunnels: Funnel[] = [];

    //         // For each base edge vertex...
    //         for (let p = 0; p < 2; p++) {
    //             // The edge shared by current and neighbor triangle (guaranteed to exist by construction)
    //             let [d1Index, d2Index] = commonEdgeMatrix[i][j]!;
    //             let d1 = polygon[d1Index], d2 = polygon[d2Index];

    //             const { L, R, apex } = funnels[p];
    //             const newFunnel: Funnel = { L, R, apex };  // Clone of old funnel

    //             let dLeftIndex: number, dLeft: XY;
    //             let dRightIndex: number, dRight: XY;

    //             // Determine left-path and right-path diagonal points 
    //             if (orient(d1, polygon[apex], d2) >= 0) {
    //                 dLeftIndex = d1Index; dLeft = d1;
    //                 dRightIndex = d2Index; dRight = d2;
    //             } else {
    //                 dLeftIndex = d2Index; dLeft = d2;
    //                 dRightIndex = d1Index; dRight = d1;
    //             }

    //             console.log("diagonal", dLeftIndex, dRightIndex);

    //             // There is no left funnel, initialize it
    //             if (L === -1) {
    //                 newFunnel.L = dLeftIndex;
    //                 spt[p][dLeftIndex] = apex;
    //             } 
    //             // The new left point is not the same as the current funnel left point
    //             else if (L !== dLeftIndex) {
    //                 // Funnel tightens
    //                 if (orient(polygon[apex], polygon[L], dLeft) <= 0) {
    //                     // Check if funnel was pinched
    //                     if (orient(polygon[apex], polygon[R], dLeft) < 0) {
    //                         newFunnel.apex = R;
    //                         newFunnel.R = -1;
    //                     }

    //                     newFunnel.L = dLeftIndex;
    //                     spt[p][dLeftIndex] = apex;
    //                 }
    //             }

    //             console.log("SPTs after left", spt[0], spt[1]);
    //             // If shortest path from both base edge vertices take the same edge, visibility was pinched
    //             if (spt[0][dLeftIndex] === spt[1][dLeftIndex] && spt[0][dLeftIndex] !== -1) return false;

    //              // There is no right funnel, initialize it
    //             if (R === -1) {
    //                 newFunnel.R = dRightIndex;
    //                 spt[p][dRightIndex] = apex;
    //             } 
    //             // The new left point is not the same as the current funnel left point
    //             else if (R !== dRightIndex) {
    //                 // Funnel tightens
    //                 if (orient(polygon[apex], polygon[R], dRight) >= 0) {
    //                     // Check if funnel was pinched
    //                     if (orient(polygon[apex], polygon[L], dRight) > 0) {
    //                         newFunnel.apex = L;
    //                         newFunnel.L = -1;
    //                     }

    //                     newFunnel.R = dRightIndex;
    //                     spt[p][dRightIndex] = apex;
    //                 }
    //             }

    //             newFunnels.push(newFunnel);

    //             console.log("SPTs after right", spt[0], spt[1]);
    //             // If shortest path from both base edge vertices take the same edge, visibility was pinched
    //             if (spt[0][dRightIndex] === spt[1][dRightIndex] && spt[0][dLeftIndex] !== -1) return false;
    //         }

            
    //         queue.push([j, (newFunnels as [Funnel, Funnel])]);
    //     }
    // }

    // return true;

    // Using DFS, identify sleeves (chains with no branching)
        // Store path while traversing
        // When hitting leaf node, pause traversal and process current path (see next step)
        // After, erase current path and continue DFS traversal
    
    // For each sleeve
        // (Construct shortest-path trees from base edge vertices to all vertices touched by sleeve) :
        // For each base edge vertex V
            // Init L = R = APEX = V
            // Init CurrentPathToApex = []
            // For each crossed diagonal edge along the sleeve (inner edge formed by triangulation, i.e. an edge on the dual tree)
                // Let d1, d2 = vertices of diagonal edge, with d1 being the edge not yet in funnel (since one will always already be in funnel)
                    // d1 is on the left path if (d1, APEX, d2) = left turn
                    // Else d1 is on the right path
                // If d1 is on the left path
                    // If (APEX, L, d1) = right turn (convex)
                        // L <- d1
                        // Shortest path from V to d1 = (V -> CurrentPathToApex -> d1)
                    // If (APEX, L, R) = left turn (we pinched the funnel)
                        // CurrentPathToApex.push(APEX)
                        // APEX <- R
                // Else if d1 is on the right path
                    // If (APEX, R, d1) = left turn (convex)
                        // R <- d1
                        // Shortest path from V to d1 = (V -> CurrentPathToApex -> d1)
                    // If (APEX, R, L) = right turn (we pinched the funnel)
                        // CurrentPathToApex.push(APEX)
                        // APEX <- L
        // If at any vertex P, the shortest path (V1 -> P) and the shortest path (V2 -> P) share an edge, return FALSE
    
    // Return TRUE
    
}