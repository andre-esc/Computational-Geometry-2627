

interface Node<T> {
    data: T;
    next: Node<T> | null;
    prev: Node<T> | null;
};

export class Deque<T> {
    private start: Node<T> | null = null;
    private end: Node<T> | null = null;
    
    public push(element: T) {
        const node: Node<T> = { data: element, next: null, prev: null };

        if (this.end === null) {
            this.start = node;
            this.end = node;
        } else {
            node.prev = this.end;
            this.end.next = node;
            this.end = node;
        }
    }

    public pop(): T | undefined {
        if (this.end === null) return;

        const res = this.end.data;

        this.end = this.end.prev;
        if (this.end === null) this.start = null;

        return res;
    }

    public shift(element: T) {
        const node: Node<T> = { data: element, next: null, prev: null };

        if (this.start === null) {
            this.start = node;
            this.end = node;
        } else {
            node.next = this.start;
            this.start.prev = node;
            this.start = node;
        }
    }

    public unshift(): T | undefined {
        if (this.start === null) return;

        const res = this.start.data;

        this.start = this.start.next;
        if (this.start === null) this.end = null;

        return res;
    }

    public peekLeft(index: number = 0): T | undefined {
        if (this.start === null) return;

        let res = this.start;

        for (let i = 0; i < index; i++) {
            if (res.next === null) {
                console.warn("Peeking left farther than deque length");

                return;
            };

            res = res.next;
        }

        return res.data;
    }
    public peekRight(index: number = 0): T | undefined {
        if (this.end === null) return;

        let res = this.end;

        for (let i = 0; i < index; i++) {
            if (res.prev === null) {
                console.warn("Peeking right farther than deque length");

                return;
            };

            res = res.prev;
        }

        return res.data;
    }

    public isEmpty(): boolean { return this.start === null; }

    public copy(): Deque<T> {
        const res = new Deque<T>;

        for (let n = this.start; n !== null; n = n.next) {
            res.push(n.data);
        }

        return res;
    }
}