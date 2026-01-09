import * as PIXI from 'pixi.js';
import { WhiteboardItem } from './store';
import { QuadTree, Rect } from './utils/QuadTree';

export class RenderManager {
    public app: PIXI.Application;
    public staticLayer: PIXI.Container;
    public dynamicLayer: PIXI.Container;
    public drawingLayer: PIXI.Container;
    public quadTree: QuadTree<WhiteboardItem & { getBounds: () => Rect }>;
    public selectionLayer: PIXI.Container;
    public cursorLayer: PIXI.Container;
    public width: number;
    public height: number;
    private remoteCursors: Map<string, PIXI.Container> = new Map();
    private initialized: boolean = false;
    private destroyed: boolean = false;
    private currentZoom: number = 1;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.app = new PIXI.Application();
        this.staticLayer = new PIXI.Container();
        this.dynamicLayer = new PIXI.Container();
        this.drawingLayer = new PIXI.Container();
        this.selectionLayer = new PIXI.Container();
        this.cursorLayer = new PIXI.Container();
        this.quadTree = new QuadTree({ x: 0, y: 0, width, height });

        // Correct Layering for Erasers
        // Drawing layer will be the target for 'dst-out'
        this.drawingLayer.addChild(this.staticLayer);
        this.drawingLayer.addChild(this.dynamicLayer);
    }

    async init(container: HTMLElement) {
        if (this.destroyed) return;

        try {
            await this.app.init({
                backgroundAlpha: 0,
                resizeTo: container,
                antialias: true,
                autoDensity: true,
                resolution: window.devicePixelRatio || 1,
                preference: 'webgpu'
            });

            if (this.destroyed) {
                this.app.destroy(true, { children: true, texture: true });
                return;
            }

            container.appendChild(this.app.canvas);

            this.app.stage.addChild(this.drawingLayer);
            this.app.stage.addChild(this.selectionLayer);
            this.app.stage.addChild(this.cursorLayer);

            this.initialized = true;

            // Initial Resize
            this.resize(container.clientWidth, container.clientHeight);
        } catch (err) {
            console.error("PixiJS Init Failed", err);
        }
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.app.renderer.resize(width, height);
    }

    // TODO: Implement Baking Logic
    bake() {
        // 1. Snapshot dynamic layer
        // 2. Add to static layer
        // 3. Clear dynamic layer
    }

    private getItemBounds(item: WhiteboardItem): Rect {
        const { points } = item.data || {};
        const drawPoints = Array.isArray(item.data) ? item.data : points;

        if (item.type === 'path' && drawPoints && drawPoints.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            drawPoints.forEach((p: any) => {
                if (p.x < minX) minX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.x > maxX) maxX = p.x;
                if (p.y > maxY) maxY = p.y;
            });
            return {
                x: minX + item.transform.x,
                y: minY + item.transform.y,
                width: maxX - minX,
                height: maxY - minY
            };
        }

        if (item.type === 'image') {
            return { x: item.transform.x, y: item.transform.y, width: 100, height: 100 };
        }

        return { x: item.transform.x, y: item.transform.y, width: 0, height: 0 };
    }

    setZoom(zoom: number) {
        this.currentZoom = zoom;
    }

    renderItems(items: Map<string, WhiteboardItem>) {
        if (!this.initialized) return;
        this.quadTree.clear();
        this.staticLayer.removeChildren();

        // Optimized batch rendering
        const sortedItems = Array.from(items.values()).sort((a, b) => a.zIndex - b.zIndex);

        sortedItems.forEach((item) => {
            // Insert into QuadTree
            this.quadTree.insert({ ...item, getBounds: () => this.getItemBounds(item) });

            if (item.type === 'path') {
                const g = new PIXI.Graphics();
                const { points, color: itemColor, brushSize: itemBrushSize } = item.data || {};
                const drawColor = typeof itemColor === 'string' ? parseInt(itemColor.replace('#', ''), 16) : (itemColor || 0x000000);
                const drawWidth = itemBrushSize || 2;

                // Handle Eraser items in store
                if (itemColor === '#ffffff' || itemColor === 0xffffff) {
                    g.blendMode = 'dst-out' as any;
                }

                if (points && points.length > 0) {
                    g.moveTo(points[0].x, points[0].y);
                    // Don't smooth simple shapes (< 10 points = likely geometric shape from magic pen)
                    if (points.length < 10) {
                        points.forEach((p: any) => g.lineTo(p.x, p.y));
                    } else {
                        // Smooth only complex freehand strokes
                        for (let i = 1; i < points.length - 1; i++) {
                            const p1 = points[i];
                            const p2 = points[i + 1];
                            const midX = (p1.x + p2.x) / 2;
                            const midY = (p1.y + p2.y) / 2;
                            g.quadraticCurveTo(p1.x, p1.y, midX, midY);
                        }
                        g.lineTo(points[points.length - 1].x, points[points.length - 1].y);
                    }
                    g.stroke({ width: drawWidth, color: drawColor, cap: 'round', join: 'round' });
                }
                this.staticLayer.addChild(g);
            }

            if (item.type === 'image' && item.data.url) {
                const sprite = PIXI.Sprite.from(item.data.url);
                sprite.position.set(item.transform.x, item.transform.y);
                sprite.scale.set(item.transform.scaleX, item.transform.scaleY);
                sprite.rotation = item.transform.rotation;
                this.staticLayer.addChild(sprite);
            }
        });
    }

    clearLayers() {
        this.staticLayer.removeChildren();
        this.dynamicLayer.removeChildren();
        this.quadTree.clear();
    }

    renderSelection(selectedIds: Set<string>, items: Map<string, WhiteboardItem>) {
        this.selectionLayer.removeChildren();

        selectedIds.forEach(id => {
            const item = items.get(id);
            if (!item) return;

            // Calculate bounds
            const bounds = this.getItemBounds(item);

            if (bounds) {
                const g = new PIXI.Graphics();
                g.rect(bounds.x, bounds.y, bounds.width, bounds.height);
                g.stroke({ width: 1, color: 0x00A3FF }); // Selection Blue
                // Corner Handles
                g.circle(bounds.x, bounds.y, 4).fill(0xffffff).stroke({ width: 1, color: 0x00A3FF });
                g.circle(bounds.x + bounds.width, bounds.y, 4).fill(0xffffff).stroke({ width: 1, color: 0x00A3FF });
                g.circle(bounds.x + bounds.width, bounds.y + bounds.height, 4).fill(0xffffff).stroke({ width: 1, color: 0x00A3FF });
                g.circle(bounds.x, bounds.y + bounds.height, 4).fill(0xffffff).stroke({ width: 1, color: 0x00A3FF });

                this.selectionLayer.addChild(g);
            }
        });
    }

    updateRemoteCursor(attendeeId: string, data: { x: number; y: number; tool?: string; color?: string; name?: string }) {
        let cursor = this.remoteCursors.get(attendeeId);
        if (!cursor) {
            cursor = new PIXI.Container();
            const dot = new PIXI.Graphics();
            dot.circle(0, 0, 4);
            dot.fill(0x3B82F6); // Blue
            cursor.addChild(dot);

            if (data.name) {
                const text = new PIXI.Text({
                    text: data.name,
                    style: { fontSize: 10, fill: 0xffffff, fontWeight: 'bold' }
                });
                text.position.set(8, -8);
                const bg = new PIXI.Graphics();
                bg.roundRect(6, -10, text.width + 10, 20, 4);
                bg.fill(0x000000, 0.6);
                cursor.addChild(bg);
                cursor.addChild(text);
            }

            this.cursorLayer.addChild(cursor);
            this.remoteCursors.set(attendeeId, cursor);
        }

        cursor.position.set(data.x, data.y);
    }

    destroy() {
        this.destroyed = true;
        if (this.initialized && this.app && this.app.renderer) {
            try {
                this.app.destroy(true, { children: true, texture: true });
            } catch (err) {
                console.warn("PixiJS Destroy Warning", err);
            }
        }
    }
}
