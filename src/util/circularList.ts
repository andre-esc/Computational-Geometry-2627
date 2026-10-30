
// Indexes array circularly
export function getCircular<T>(arr: T[], i: number) {
    return arr[i % arr.length];
}

/**
 * Slices an array circularly, looping back to the start if element count exceeds final array index
 * 
 * @param arr Array to get slice of
 * @param from Starting index
 * @param count Number of elements to slice
 * 
 * @returns The sliced sub-array
 */
export function sliceCircular<T>(arr: T[], from: number, count: number) {
    const res = [];

    for (let i = 0; i < count; i++) {
        res.push(arr[(from + i) % arr.length]);
    }

    return res;
}