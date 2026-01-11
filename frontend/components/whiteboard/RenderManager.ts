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
    public currentZoom: number = 1;
    private selectionOverride: { cx: number, cy: number, w: number, h: number, rotation: number } | null = null;

    public setSelectionOverride(override: { cx: number, cy: number, w: number, h: number, rotation: number } | null) {
        this.selectionOverride = override;
        // Note: Render loop usually handles drawing, but we can force re-render if needed?
        // Since renderSelection is called by parent usually, we might need to wait for next call 
        // OR we can't easily trigger re-render of selection without `selectedIds` and `items`.
        // BUT: interaction hooks call renderSelection? No. 
        // `WhiteboardCanvas` calls `renderSelection` in `useEffect` on selection change.
        // Interaction hook *modifies items*, which triggers store update -> component re-render -> renderSelection.
        // During Drag, we want *immediate* feedback. 
        // So `RenderManager` should probably be able to re-render selection independently?
        // Issue: `renderSelection` needs `selectedIds` and `items`.
        // Override is used specifically when we HAVE an intense operation (drag).
        // Let's assume we call `renderSelection` manually from Interaction hook? 
        // Actually, `useWhiteboardInteraction` doesn't pass items to `renderManager` functions easily.
        // Better Strategy:
        // `setSelectionOverride` just sets state.
        // We add `updateSelectionOverrideGraphics()` that draws ONLY the override immediately?
        // Yes. `renderSelection` clears layer.
        // If we call `setSelectionOverride`, we want it to draw NOW.
        if (this.selectionOverride) {
            this.drawSelectionBox(
                this.selectionOverride.cx,
                this.selectionOverride.cy,
                this.selectionOverride.w,
                this.selectionOverride.h,
                this.selectionOverride.rotation
            );
        } else {
            this.selectionLayer.removeChildren(); // clear if null
        }
    }

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
        // Drawing layer will be the target for 'dst-out' (erase).
        // For 'erase' blend mode to work properly in some Pixi versions,
        // we might need to ensure alpha channel is handled correctly or use specific filter.
        // However, standard sprite blendMode = 'erase' should work if the background is transparent.
        this.drawingLayer.addChild(this.staticLayer);
        this.drawingLayer.addChild(this.dynamicLayer);

        // Ensure layers don't block clicks unless they have interactive children
        this.staticLayer.eventMode = 'none';
        this.dynamicLayer.eventMode = 'none';
        this.drawingLayer.eventMode = 'none';
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

            this.app.canvas.style.position = 'absolute';
            this.app.canvas.style.top = '0';
            this.app.canvas.style.left = '0';
            this.app.canvas.style.zIndex = '1'; // Ensure canvas is above the grid (z-0)
            this.app.canvas.style.outline = 'none'; // Remove default outline if any

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

    public getLocalBounds(item: WhiteboardItem): Rect {
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
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        }

        if (item.type === 'image') {
            const w = item.data?.width || 100;
            const h = item.data?.height || 100;
            return { x: 0, y: 0, width: w, height: h };
        }

        return { x: 0, y: 0, width: 0, height: 0 };
    }

    private getItemBounds(item: WhiteboardItem): Rect {
        // Approximate AABB for QuadTree (simplification: ignore rotation or naive check)
        // For QuadTree, we need World AABB.
        // Doing full OBB-to-AABB calc is best.
        const local = this.getLocalBounds(item);
        // Apply transform to 4 corners
        // ... (Skipping full math for now, using naive offset logic used before but potentially incorrect for rotation)
        // Previous logic: x = minX + tx. This assumes rotation=0.
        // Let's keep previous logic for global hit test for now, or improve it later.
        // Just return naive bounds for QuadTree hit test.
        return {
            x: local.x + item.transform.x,
            y: local.y + item.transform.y,
            width: local.width * (item.transform.scaleX ?? 1),
            height: local.height * (item.transform.scaleY ?? 1)
        };
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
                if (itemColor === '#ffffff' || itemColor === 0xffffff || itemColor === 'eraser') {
                    g.blendMode = 'erase';
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

                // Apply Transforms with Center Pivot
                // Calculate local center of content
                const bounds = this.getLocalBounds(item);
                const cx = bounds.x + bounds.width / 2;
                const cy = bounds.y + bounds.height / 2;

                g.pivot.set(cx, cy);
                // Position must place the pivot at the correct world location
                // World Pivot = Transform(Pivot) = (tx + cx, ty + cy) (roughly, if we treat tx as offset)
                // Actually: Transform applies to the object coordinate system.
                // If we want rotation around center, we put pivot at center.
                // And we move the container such that pivot matches (tx + cx, ty + cy) IF scaling wasn't involved?
                // Wait, if we scale, we scale around pivot.
                // So position should be:
                // item.transform.x + cx * item.transform.scaleX? No.
                // Let's assume item.transform.x is "Top Left of Original Bounds"?
                // If so, we want to shift to center.
                // Let's stick to: Transform X/Y is global offset.
                // We want to render points at (Points + Offset).
                // Rotation around Center.

                // PIXI Transform Order: Pivot -> Scale -> Rotate -> Translate.
                // If Pivot is (cx, cy).
                // Point (x,y) becomes (x-cx, y-cy).
                // Scaled: (x-cx)*s.
                // Rotated.
                // Translated: + Position.

                // We want result: (x + tx, y + ty) if r=0, s=1.
                // Check: (x - cx) + Position = x + tx.
                // => Position = cx + tx.
                // So g.position.set(item.transform.x + cx, item.transform.y + cy).

                g.position.set(item.transform.x + cx, item.transform.y + cy);
                g.scale.set(item.transform.scaleX ?? 1, item.transform.scaleY ?? 1);
                g.rotation = item.transform.rotation ?? 0;

                this.staticLayer.addChild(g);
            }

            if (item.type === 'image' && item.data.url) {
                const url = item.data.url;
                let texture: PIXI.Texture;

                // Check cache first
                if (PIXI.Assets.cache.has(url)) {
                    texture = PIXI.Assets.get(url);
                } else {
                    // Placeholder while loading
                    texture = PIXI.Texture.WHITE;
                    // Proactive load
                    PIXI.Assets.load(url).then((loadedTexture) => {
                        // Force re-render of this item or just rely on react state update loop?
                        // In current architecture, `renderItems` is called by React `useEffect`.
                        // If we just loaded the texture, the sprite references the OLD simple texture.
                        // We need to update the sprite's texture. 
                        // But we create NEW sprites every render call in this naive implementation.
                        // So we need to trigger a re-render from the component side?
                        // OR: `texture = PIXI.Texture.from(url)` handles this internal promise resolution 
                        // IF we configure it right?
                        // Actually `PIXI.Texture.from(url)` SHOULD work if it handles loading.
                        // The warning "Asset ... was not found in the Cache" suggests we should use Assets.load.
                        // Let's rely on React component to re-render when we might need it? 
                        // No, React doesn't know Pixi loaded an image.
                        // We can force a re-render by dispatching an event or just updating this sprite if we kept reference.
                        // But we accept naive re-creation here. 
                        // PixiJS Texture.from usually returns a placeholder and updates later.
                        // The issue is likely V8 specific strictness.

                        // Better approach for V8:
                        // Just use Assets.load() and when done, if we are still rendering, it will be picked up next frame?
                        // We don't have a game loop here. We render on state change.
                        // So we MUST trigger a visual update. 
                        // Let's use `invalidate()` pattern or similar?
                        // For now: Just ensure it is loaded.
                        if (this.app && this.app.render) {
                            this.app.render(); // Force a render pass if V8 manual render
                        }
                        // Actually, since we re-create sprites in `renderItems`, we rely on `renderItems` being called again.
                        // OR we rely on the `sprite` instance updating its texture.
                        // If we use `PIXI.Texture.from(url)`, it returns a Promise-like object or a valid texture?
                        // In V8, `from` returns a Texture immediately (possibly placeholder).
                    }).catch(console.warn);
                }

                // Try to get texture safely
                try {
                    // If cached, this returns valid texture. If not, it might throw or warn in V8 if strict.
                    // We fallback to `from` if likely cached, or placeholder.
                    if (PIXI.Assets.cache.has(url)) {
                        texture = PIXI.Assets.get(url);
                    } else {
                        // Use a temporary texture to avoid "not in cache" error if `from` behaves badly
                        // or use `Texture.from` which internally calls Assets.load?
                        // In V8, `Texture.from` is deprecated or behaves differently.
                        // We should use `Sprite.from(url)` which is effectively `Texture.from`.
                        // Use empty texture initially to avoid ugly box?
                        texture = PIXI.Texture.EMPTY;
                    }
                } catch (e) {
                    texture = PIXI.Texture.EMPTY;
                }

                const sprite = new PIXI.Sprite(texture);
                sprite.anchor.set(0.5);

                const w = item.data.width || 100;
                const h = item.data.height || 100;

                const updateSize = () => {
                    if (sprite.destroyed) return;
                    sprite.width = w * (item.transform.scaleX ?? 1);
                    sprite.height = h * (item.transform.scaleY ?? 1);
                };

                updateSize();

                // If we used a placeholder, we need to ensure the real texture is swapped in
                if (!PIXI.Assets.cache.has(url)) {
                    PIXI.Assets.load(url).then((tex) => {
                        if (!sprite.destroyed) {
                            sprite.texture = tex;
                            updateSize();
                        }
                    });
                }

                sprite.position.set(item.transform.x + w / 2, item.transform.y + h / 2);
                sprite.rotation = item.transform.rotation || 0;

                this.staticLayer.addChild(sprite);
            }
        });
    }

    clearLayers() {
        this.staticLayer.removeChildren();
        this.dynamicLayer.removeChildren();
        this.quadTree.clear();
    }

    // Temporary Selection Box
    private selectionBoxGraphics: PIXI.Graphics = new PIXI.Graphics();

    // Lazy init or init in constructor? Let's init in constructor or on first use.
    // Let's add it to cursorLayer since it's an overlay interaction.

    updateSelectionBox(rect: Rect | null) {
        if (!this.selectionBoxGraphics.parent) {
            this.cursorLayer.addChild(this.selectionBoxGraphics);
        }

        this.selectionBoxGraphics.clear();

        if (rect) {
            this.selectionBoxGraphics.rect(rect.x, rect.y, rect.width, rect.height);
            this.selectionBoxGraphics.fill({ color: 0x00A3FF, alpha: 0.1 });
            this.selectionBoxGraphics.stroke({ width: 1, color: 0x00A3FF, alpha: 0.5 });
        }
    }

    renderSelection(selectedIds: Set<string>, items: Map<string, WhiteboardItem>) {
        if (this.selectionOverride) return;

        this.selectionLayer.removeChildren();
        if (selectedIds.size === 0) return;

        // Single Selection inside this bloack: Rotate with Item
        if (selectedIds.size === 1) {
            const id = Array.from(selectedIds)[0];
            const item = items.get(id);
            if (item) {
                const b = this.getLocalBounds(item);
                const sx = item.transform.scaleX || 1;
                const sy = item.transform.scaleY || 1;

                const w = b.width * sx;
                const h = b.height * sy;

                // Calculate World Center from Pivot (assuming centered pivot for rotation)
                // In renderItems, pivot is set to center of bounds.
                // Position is set to transform.x + cx, transform.y + cy.
                // So the visual center IS (transform.x + cx, transform.y + cy).

                const cx = b.x + b.width / 2;
                const cy = b.y + b.height / 2;
                const worldCenterX = item.transform.x + cx;
                const worldCenterY = item.transform.y + cy;

                this.drawSelectionBox(worldCenterX, worldCenterY, w, h, item.transform.rotation || 0);
            }
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasSelection = false;

        selectedIds.forEach(id => {
            const item = items.get(id);
            if (item) {
                // Get Local Bounds
                const b = this.getLocalBounds(item);

                const sx = item.transform.scaleX || 1;
                const sy = item.transform.scaleY || 1;
                const cx = b.x + b.width / 2;
                const cy = b.y + b.height / 2;

                // World Center (Pivot Point + Offset)
                const worldCenterX = item.transform.x + cx;
                const worldCenterY = item.transform.y + cy;

                // World Dimensions (Axis Aligned approximation for selection box)
                // Note: If rotated, this AABB might be tighter than optimal, 
                // but matches the interaction logic I just fixed.
                const halfW = (b.width * sx) / 2;
                const halfH = (b.height * sy) / 2;

                const bx = worldCenterX - halfW;
                const by = worldCenterY - halfH;
                const bw = b.width * sx;
                const bh = b.height * sy;

                if (bx < minX) minX = bx;
                if (by < minY) minY = by;
                if (bx + bw > maxX) maxX = bx + bw;
                if (by + bh > maxY) maxY = by + bh;

                hasSelection = true;
            }
        });

        if (hasSelection) {
            const w = maxX - minX;
            const h = maxY - minY;
            const cx = minX + w / 2;
            const cy = minY + h / 2;
            this.drawSelectionBox(cx, cy, w, h, 0);
        }
    }

    private drawSelectionBox(cx: number, cy: number, w: number, h: number, rotation: number) {
        this.selectionLayer.removeChildren();
        const g = new PIXI.Graphics();

        const halfW = w / 2;
        const halfH = h / 2;

        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        const rotate = (x: number, y: number) => ({
            x: cx + (x * cos - y * sin),
            y: cy + (x * sin + y * cos)
        });

        const tl = rotate(-halfW, -halfH);
        const tr = rotate(halfW, -halfH);
        const br = rotate(halfW, halfH);
        const bl = rotate(-halfW, halfH);

        // Box Frame
        g.moveTo(tl.x, tl.y);
        g.lineTo(tr.x, tr.y);
        g.lineTo(br.x, br.y);
        g.lineTo(bl.x, bl.y);
        g.lineTo(tl.x, tl.y);

        g.stroke({ width: 1 / this.currentZoom, color: 0x00A3FF, alpha: 0.8 });

        // Handles
        // Make handles constant screen size (e.g., 8px diameter)
        // hSize is RADIUS. So 4px radius = 8px diameter.
        const hSize = 5 / this.currentZoom;
        const strokeWidth = 1.5 / this.currentZoom;
        const handleStyle = { width: strokeWidth, color: 0x00A3FF };
        const fillStyle = 0xffffff;

        g.circle(tl.x, tl.y, hSize).fill(fillStyle).stroke(handleStyle);
        g.circle(tr.x, tr.y, hSize).fill(fillStyle).stroke(handleStyle);
        g.circle(br.x, br.y, hSize).fill(fillStyle).stroke(handleStyle);
        g.circle(bl.x, bl.y, hSize).fill(fillStyle).stroke(handleStyle);

        // Rotation Handle (Top Center, extended)
        if (h > 40 / this.currentZoom) {
            const topCenter = rotate(0, -halfH - (15 / this.currentZoom));
            // Removed the connecting line "stick"
            g.circle(topCenter.x, topCenter.y, hSize).fill(fillStyle).stroke(handleStyle);
        }

        this.selectionLayer.addChild(g);
    }

    private ghostSprite: PIXI.Sprite | null = null;

    renderGhost(url: string | null, x: number, y: number, w: number, h: number, alpha: number = 0.5) {
        // Cleanup function for previous ghost
        const clearGhost = () => {
            if (this.ghostSprite) {
                this.cursorLayer.removeChild(this.ghostSprite);
                this.ghostSprite.destroy();
                this.ghostSprite = null;
            }
        }

        if (!url) {
            clearGhost();
            return;
        }

        // If we already have a ghost sprite, check if URL matches? 
        // Simpler to just recreate or update texture.
        if (!this.ghostSprite) {
            this.ghostSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
            this.ghostSprite.anchor.set(0.5);
            this.cursorLayer.addChild(this.ghostSprite);
        }

        // Load or Get Texture
        if (PIXI.Assets.cache.has(url)) {
            this.ghostSprite.texture = PIXI.Assets.get(url);
        } else {
            // Load async
            PIXI.Assets.load(url).then(tex => {
                if (this.ghostSprite && !this.ghostSprite.destroyed) {
                    this.ghostSprite.texture = tex;
                    // Re-apply size if needed as texture swap might reset it or we want correct ratio
                    this.ghostSprite.width = w;
                    this.ghostSprite.height = h;
                }
            }).catch(console.warn);
        }

        this.ghostSprite.alpha = alpha;
        this.ghostSprite.position.set(x, y);
        this.ghostSprite.width = w;
        this.ghostSprite.height = h;
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

    // Remote Drawing Cache to continue strokes
    private remoteGraphics: Map<string, PIXI.Graphics> = new Map();

    drawRemoteBatch(data: {
        senderId: string;
        points: { x: number; y: number }[];
        color: number;
        width: number;
        tool: string;
        isNewStroke?: boolean;
    }) {
        if (!this.initialized) return;

        const { senderId, points, color, width, tool, isNewStroke } = data;
        let g = this.remoteGraphics.get(senderId);

        if (isNewStroke || !g) {
            // If new stroke or missing graphics, create new
            g = new PIXI.Graphics();
            // Add to staticLayer directly? No, staticLayer is cleared on re-render.
            // But streaming drawing should be persistent until pointerUp?
            // Actually, we should add to `drawingLayer` (dynamic) or `staticLayer`.
            // If we add to staticLayer, it stays until cleared.
            // BUT: When `add_item` comes later, it will re-render everything and wipe this temporary stroke.
            // So adding to staticLayer is fine, as `renderItems` clears staticLayer first.
            this.staticLayer.addChild(g);
            this.remoteGraphics.set(senderId, g);
        }

        if (tool === 'eraser') {
            g.blendMode = 'erase'; // Or 'dst-out'
        }

        if (points.length >= 2) {
            g.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                g.lineTo(points[i].x, points[i].y);
            }

            if (tool === 'eraser') {
                g.stroke({ width, color: 0xffffff, cap: 'round', join: 'round' });
            } else {
                g.stroke({ width, color, cap: 'round', join: 'round' });
            }
        }
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
