export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class QuadTree<T extends { id: string; getBounds: () => Rect }> {
    private objects: T[] = [];
    private nodes: QuadTree<T>[] = [];
    private level: number;
    private bounds: Rect;
    private maxObjects: number;
    private maxLevels: number;

    constructor(bounds: Rect, maxObjects = 10, maxLevels = 5, level = 0) {
        this.bounds = bounds;
        this.maxObjects = maxObjects;
        this.maxLevels = maxLevels;
        this.level = level;
    }

    // Split the node into 4 subnodes
    split() {
        const subWidth = this.bounds.width / 2;
        const subHeight = this.bounds.height / 2;
        const x = this.bounds.x;
        const y = this.bounds.y;

        this.nodes[0] = new QuadTree({ x: x + subWidth, y: y, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[1] = new QuadTree({ x: x, y: y, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[2] = new QuadTree({ x: x, y: y + subHeight, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[3] = new QuadTree({ x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, this.level + 1);
    }

    // Determine which quadrant the object belongs to
    getIndex(rect: Rect): number[] {
        const indexes: number[] = [];
        const verticalMidpoint = this.bounds.x + (this.bounds.width / 2);
        const horizontalMidpoint = this.bounds.y + (this.bounds.height / 2);

        const startIsTop = rect.y < horizontalMidpoint;
        const startIsBottom = rect.y + rect.height > horizontalMidpoint;
        const startIsLeft = rect.x < verticalMidpoint;
        const startIsRight = rect.x + rect.width > verticalMidpoint;

        // Top-right
        if (startIsTop && startIsRight) indexes.push(0);
        // Top-left
        if (startIsTop && startIsLeft) indexes.push(1);
        // Bottom-left
        if (startIsBottom && startIsLeft) indexes.push(2);
        // Bottom-right
        if (startIsBottom && startIsRight) indexes.push(3);

        return indexes;
    }

    insert(obj: T) {
        if (this.nodes.length) {
            const indexes = this.getIndex(obj.getBounds());
            for (let i = 0; i < indexes.length; i++) {
                this.nodes[indexes[i]].insert(obj);
            }
            return;
        }

        this.objects.push(obj);

        if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
            if (!this.nodes.length) {
                this.split();
            }

            for (let i = 0; i < this.objects.length; i++) {
                const indexes = this.getIndex(this.objects[i].getBounds());
                for (let k = 0; k < indexes.length; k++) {
                    this.nodes[indexes[k]].insert(this.objects[i]);
                }
            }
            this.objects = [];
        }
    }

    retrieve(returnObjects: T[], rect: Rect): T[] {
        const indexes = this.getIndex(rect);
        if (this.nodes.length) {
            for (let i = 0; i < indexes.length; i++) {
                this.nodes[indexes[i]].retrieve(returnObjects, rect);
            }
        }

        // Add unique objects
        for (const obj of this.objects) {
            if (!returnObjects.find(o => o.id === obj.id)) {
                returnObjects.push(obj);
            }
        }

        return returnObjects;
    }

    clear() {
        this.objects = [];
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i]) {
                this.nodes[i].clear();
            }
        }
        this.nodes = [];
    }
}
