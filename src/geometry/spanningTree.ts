/**
 * Gets the spanning tree of a graph using BFS
 * 
 * @param adjacency Adjacency list of graph
 * @param root Index of the root of the tree
 * 
 * @returns Spanning tree of graph
 */
export function getSpanningTree(adjacency: number[][], root: number) {
    const queue: number[] = [root];
    const visited = new Set<number>([root]);

    const tree = new Array(adjacency.length).fill(null).map(() => new Array<number>());

    while (queue.length > 0) {
        const i = queue.shift()!;

        for (let j of adjacency[i]) {
            if (!visited.has(j)) {
                visited.add(i);

                tree[i].push(j);
                queue.push(j);
            }
        }
    }

    return tree;
}