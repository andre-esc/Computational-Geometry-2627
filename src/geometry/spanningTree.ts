/**
 * Gets the spanning tree of a graph using BFS
 * 
 * @param adjacency Adjacency list of graph
 * 
 * @returns Spanning tree of graph
 */
export function getSpanningTree(adjacency: number[][]) {
    const queue: number[] = [0];
    const visited = new Set<number>();

    // Tree as parent list
    const tree = new Array<number>(adjacency.length).fill(-1);

    while (queue.length > 0) {
        const i = queue.splice(0, 1)[0];
        visited.add(i);

        for (let j of adjacency[i]) {
            if (!visited.has(j)) {
                tree[j] = i;

                queue.push(j);
            }
        }
    }

    return tree;
}