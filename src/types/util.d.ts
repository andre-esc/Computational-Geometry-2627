export type LinkedList<T> = {
    point: T,
    next: LinkedList | null,
    prev: LinkedList | null
};