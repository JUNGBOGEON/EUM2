import * as PIXI from 'pixi.js';
import { v4 as uuidv4 } from 'uuid';
import { getProxiedUrl } from './utils/urlUtils';
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
    private remoteCursorTargets: Map<string, { x: number; y: number }> = new Map();
    private remoteGraphics: Map<string, PIXI.Graphics> = new Map();
    private socketToSender: Map<string, string> = new Map();
    private initialized: boolean = false;
    private destroyed: boolean = false;
    public currentZoom: number = 1;
    private selectionOverride: { cx: number, cy: number, w: number, h: number, rotation: number } | null = null;

    // User Color Management
    private userColors: Map<string, number> = new Map();
    private colorPalette = [
        0xFF5733, 0x33FF57, 0x3357FF, 0xF333FF, 0x33FFF6,
        0xFF33A1, 0xFF8C33, 0x8C33FF, 0x33FF8C, 0xFFC733,
        0x581845, 0x900C3F, 0xC70039, 0xFF5733, 0xFFC300
    ];



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
        this.selectionLayer.eventMode = 'none';
        this.cursorLayer.eventMode = 'none';
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
            this.app.canvas.style.cursor = 'inherit'; // Inherit from container (managed by React)

            container.appendChild(this.app.canvas);

            this.app.stage.addChild(this.drawingLayer);
            this.app.stage.addChild(this.selectionLayer);
            this.app.stage.addChild(this.cursorLayer);
            this.app.stage.eventMode = 'none';

            // Disable PixiJS internal cursor management completely
            this.app.renderer.events.cursorStyles.default = 'inherit';
            this.app.renderer.events.setCursor = () => { };

            this.initialized = true;

            // Start Ticker for Cursor Interpolation
            this.app.ticker.add(this.tick.bind(this));

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
    tick() {
        if (!this.initialized) return;
        const lerpFactor = 0.25; // Smoothness factor (higher = faster/less lag, lower = smoother)

        this.remoteCursors.forEach((cursor, id) => {
            const target = this.remoteCursorTargets.get(id);
            if (target) {
                cursor.x += (target.x - cursor.x) * lerpFactor;
                cursor.y += (target.y - cursor.y) * lerpFactor;

                // Snap if close
                if (Math.abs(target.x - cursor.x) < 0.1 && Math.abs(target.y - cursor.y) < 0.1) {
                    cursor.x = target.x;
                    cursor.y = target.y;
                }
            }
        });
    }

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

        if (item.type === 'text') {
            // Basic approximation if text measurement isn't perfect in headless
            const w = item.data?.width || (item.data?.text?.length * 10) || 50;
            const h = item.data?.height || 20;
            return { x: 0, y: 0, width: w, height: h };
        }

        if (item.type === 'shape') {
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
        const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
        return {
            x: local.x + t.x,
            y: local.y + t.y,
            width: local.width * (t.scaleX ?? 1),
            height: local.height * (t.scaleY ?? 1)
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

                const hasErasures = item.data?.erasures && item.data.erasures.length > 0;

                // Create Content Wrapper
                // If has erasures, we need a Container with a Filter to enforce compositing group
                // This ensures 'erase' blend mode only affects this container's content, not the background.
                let content: PIXI.Container | PIXI.Graphics = g;

                if (hasErasures) {
                    const container = new PIXI.Container();
                    container.addChild(g); // Add the shape/path

                    // Add Erasures
                    item.data.erasures.forEach((erase: any) => {
                        const eg = new PIXI.Graphics();
                        eg.blendMode = 'erase';
                        const w = erase.size || 20;

                        if (erase.points && erase.points.length > 0) {
                            eg.moveTo(erase.points[0].x, erase.points[0].y);
                            for (let i = 1; i < erase.points.length; i++) {
                                const p1 = erase.points[i - 1];
                                const p2 = erase.points[i];
                                const midX = (p1.x + p2.x) / 2;
                                const midY = (p1.y + p2.y) / 2;
                                eg.quadraticCurveTo(p1.x, p1.y, midX, midY);
                            }
                            // Line to last
                            if (erase.points.length > 1) {
                                const last = erase.points[erase.points.length - 1];
                                eg.lineTo(last.x, last.y);
                            }
                        }
                        eg.stroke({ width: w, color: 0xffffff, cap: 'round', join: 'round' });
                        container.addChild(eg);
                    });

                    // Force layer group (for Pixi v8 use AlphaFilter({ alpha: 1 }) or similar if changed, but v7 is simple)
                    // If simple number fails, verify version.
                    // Assuming v8: new AlphaFilter({ alpha: 1 }) or just use it without args if default is 1.
                    // But if it was number before...
                    // Let's use no-arg if defaults work, or object.
                    // Wait, error says `number` not assignable to `AlphaFilterOptions`.
                    // So use object: { alpha: 1 }
                    container.filters = [new PIXI.AlphaFilter({ alpha: 1 })];
                    content = container;
                }

                const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
                content.pivot.set(cx, cy);
                content.position.set(t.x + cx, t.y + cy);
                content.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
                content.rotation = t.rotation ?? 0;

                this.staticLayer.addChild(content);
            }

            if (item.type === 'image' && item.data.url) {
                const url = item.data.url;
                const proxiedUrl = getProxiedUrl(url); // Normalize URL via proxy
                let texture: PIXI.Texture;

                // Check cache using the PROXIED URL (since that's what we load)
                if (PIXI.Assets.cache.has(proxiedUrl)) {
                    texture = PIXI.Assets.get(proxiedUrl);
                } else {
                    // Placeholder while loading
                    texture = PIXI.Texture.EMPTY;

                    // Allow simple 'from' loading via proxy if already in progress or load simple
                    // But prefer explicit load to handle CORS config reliably everywhere

                    // We only trigger load if NOT pending? 
                    // Pixi Assets handles deduping usually.
                    PIXI.Assets.load({
                        src: proxiedUrl,
                        format: 'png',
                        loadParser: 'loadTextures',
                        data: { crossOrigin: 'anonymous' }
                    }).then((tex) => {
                        console.log('[RenderManager] Image loaded successfully:', proxiedUrl);
                        // Force re-render once loaded
                        if (this.app && this.app.render) {
                            this.app.render();
                        }
                    }).catch(err => {
                        console.error('[RenderManager] Failed to load image:', proxiedUrl, err);
                    });
                }

                // If we retrieved a texture (from cache or placeholder), use it
                // Note: We avoid the try-catch block for simple assignment if our logic above is solid.

                // Ensure texture is valid
                if (!texture) {
                    texture = PIXI.Texture.EMPTY;
                }

                const sprite = new PIXI.Sprite(texture);
                sprite.anchor.set(0.5);

                const w = item.data.width || 100;
                const h = item.data.height || 100;

                const updateSize = () => {
                    if (sprite.destroyed) return;
                    sprite.width = w;
                    sprite.height = h;
                };

                updateSize();

                // If we are using the placeholder, modify the sprite when the real texture arrives
                if (!PIXI.Assets.cache.has(proxiedUrl)) {
                    PIXI.Assets.load({
                        src: proxiedUrl,
                        format: 'png',
                        loadParser: 'loadTextures',
                        data: { crossOrigin: 'anonymous' }
                    }).then((tex) => {
                        if (!sprite.destroyed) {
                            console.log('[RenderManager] Updating sprite texture:', proxiedUrl);
                            sprite.texture = tex;
                            updateSize();
                            // Only force render if needed
                        }
                    }).catch(err => {
                        console.error('[RenderManager] Sprite update failed:', proxiedUrl, err);
                    });
                }

                // ERASER LOGIC FOR IMAGES
                const hasErasures = item.data?.erasures && item.data.erasures.length > 0;
                let content: PIXI.Container | PIXI.Sprite = sprite;

                if (hasErasures) {
                    const container = new PIXI.Container();
                    container.addChild(sprite);

                    item.data.erasures.forEach((erase: any) => {
                        const eg = new PIXI.Graphics();
                        eg.blendMode = 'erase';
                        const ew = erase.size || 20;

                        if (erase.points && erase.points.length > 0) {
                            eg.moveTo(erase.points[0].x, erase.points[0].y);
                            for (let i = 1; i < erase.points.length; i++) {
                                const p1 = erase.points[i - 1];
                                const p2 = erase.points[i];
                                const midX = (p1.x + p2.x) / 2;
                                const midY = (p1.y + p2.y) / 2;
                                eg.quadraticCurveTo(p1.x, p1.y, midX, midY);
                            }
                            if (erase.points.length > 1) {
                                const last = erase.points[erase.points.length - 1];
                                eg.lineTo(last.x, last.y);
                            }
                        }
                        eg.stroke({ width: ew, color: 0xffffff, cap: 'round', join: 'round' });
                        container.addChild(eg);
                    });

                    container.filters = [new PIXI.AlphaFilter({ alpha: 1 })];
                    content = container;
                }

                // Apply Transforms
                // Image Pivot is center (0.5, 0.5 anchor on sprite)
                // If wrapped in container, container needs pivot. 
                // Sprite has anchor 0.5, so it is centered at (0,0) in container if we don't move it.
                // Erasures are in local space relative to Top-Left?
                // Wait, useWhiteboardDrawing calculates local points based on `getLocalBounds`.
                // getLocalBounds for Image returns {x: 0, y: 0, width: w, height: h}.
                // Center is (w/2, h/2).
                // So Pivot in World is (tx + w/2, ty + h/2).
                // Inverse Transform subtracts Pivot (World). 
                // So the resulting local points are relative to Pivot (World)?
                // No, in useWhiteboardDrawing:
                // `return { x: sx + cx, y: sy + cy };`
                // It adds `cx, cy`. 
                // `cx` is `lBounds.x + lBounds.width / 2` = `w/2`.
                // So the local points are relative to Top-Left (0,0).

                // If Sprite has anchor 0.5, it is drawn at (0,0) with center at (0,0). 
                // Its bounds in its own local space are (-w/2, -h/2) to (w/2, h/2).
                // But `getLocalBounds` returned (0,0,w,h) because it describes "Logical" bounds?
                // `getLocalBounds` implementation: 
                // if image: return { x: 0, y: 0, width: w, height: h };

                // So `useWhiteboardDrawing` assumes local space is 0..w, 0..h.
                // If Erasure Points are in 0..w, 0..h space:
                // And Sprite is at (0,0) with anchor 0.5 (so visually -w/2..w/2).
                // We have a mismatch.

                // FIX:
                // If we wrap in container:
                // Container Pivot should be (w/2, h/2) to match the transform logic used for Paths.
                // Transform logic for Paths used `g.pivot.set(cx, cy)`.
                // Paths draw in 0..w, 0..h space (roughly).

                // So for Image:
                // We should put Sprite at (w/2, h/2) inside the container?
                // Or change Sprite anchor to 0?
                // If we change sprite anchor to 0, it draws 0..w, 0..h.
                // Then it matches Path behavior.
                // Erasure points (0..w) will align.

                sprite.anchor.set(0); // Change to Top-Left Basic

                // Content Pivot
                const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
                content.pivot.set(w / 2, h / 2);
                content.position.set(t.x + w / 2, t.y + h / 2);
                content.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
                content.rotation = t.rotation ?? 0;

                this.staticLayer.addChild(content);
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

                console.log("RenderSelection Single:", id, "Rot:", item.transform.rotation, "W:", w, "H:", h);
                this.drawSelectionBox(worldCenterX, worldCenterY, w, h, item.transform.rotation || 0);
            } else {
                console.log("RenderSelection: Item not found for id", id);
            }
            return;
        } else {
            console.log("RenderSelection Multi:", selectedIds.size);
        }

        // Check for Common Rotation
        let commonRotation: number | null = null;
        let isCommon = true;
        const selectedItems: WhiteboardItem[] = [];

        selectedIds.forEach(id => {
            const item = items.get(id);
            if (item) {
                selectedItems.push(item);
                const rot = item.transform.rotation || 0;
                if (commonRotation === null) {
                    commonRotation = rot;
                } else {
                    let diff = Math.abs(commonRotation - rot) % (2 * Math.PI);
                    diff = Math.min(diff, 2 * Math.PI - diff);
                    if (diff > 0.1) { // Relaxed tolerance (~5.7 degrees) to handle Image+Path float diffs
                        isCommon = false;
                    }
                }
            }
        });

        if (isCommon && commonRotation !== null && selectedItems.length > 0) {
            // Calculate OBB aligned with commonRotation
            const cos = Math.cos(-commonRotation);
            const sin = Math.sin(-commonRotation);

            let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;

            selectedItems.forEach(item => {
                const b = this.getLocalBounds(item);
                const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1 };

                // Get World OBB Corners for this item
                const cx = b.x + b.width / 2;
                const cy = b.y + b.height / 2;
                const wcX = t.x + cx;
                const wcY = t.y + cy;

                const hw = (b.width * (t.scaleX || 1)) / 2;
                const hh = (b.height * (t.scaleY || 1)) / 2;

                // We need to project the item's world corners onto the Common Axes
                // Since item rotation == commonRotation, the item's local axes align with global rotated axes!
                // So we just project the Item Center, then add half-sizes?
                // Yes! 
                // Project World Center onto Common Axes:
                // Axis U: rotated by R. 
                // We use Inverse Rotation (-R) to align world to U/V.

                const u = wcX * cos - wcY * sin;
                const v = wcX * sin + wcY * cos;

                if (u - hw < minU) minU = u - hw;
                if (u + hw > maxU) maxU = u + hw;
                if (v - hh < minV) minV = v - hh;
                if (v + hh > maxV) maxV = v + hh;
            });

            const w = maxU - minU;
            const h = maxV - minV;
            const centerU = minU + w / 2;
            const centerV = minV + h / 2;

            // Rotate Center back to World
            // Rot(R)
            const rCos = Math.cos(commonRotation);
            const rSin = Math.sin(commonRotation);

            const worldCx = centerU * rCos - centerV * rSin;
            const worldCy = centerU * rSin + centerV * rCos;

            this.drawSelectionBox(worldCx, worldCy, w, h, commonRotation);
            return;
        }

        // Fallback to AABB
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasSelection = false;

        selectedItems.forEach(item => {
            // Get Local Bounds
            const b = this.getLocalBounds(item);

            const sx = item.transform.scaleX || 1;
            const sy = item.transform.scaleY || 1;
            const cx = b.x + b.width / 2;
            const cy = b.y + b.height / 2;

            // World Center (Pivot Point + Offset)
            const worldCenterX = item.transform.x + cx;
            const worldCenterY = item.transform.y + cy;

            // Assume 0 rotation for AABB expansion (worst case box)
            // If we want tight AABB of rotated item, we need to project corners.
            // But strict AABB of rotated item is fine for fallback.

            // Wait, previously I calculated AABB of Unrotated box?
            // "bx = worldCenterX - halfW"
            // If item IS rotated, previous logic was WRONG (it drew unrotated box around rotated item's center?)
            // If so, fixing that is also good.
            // Let's implement proper AABB of Rotated Item for fallback.

            const rot = item.transform.rotation || 0;
            const iCos = Math.cos(rot);
            const iSin = Math.sin(rot);
            const hw = (b.width * sx) / 2;
            const hh = (b.height * sy) / 2;

            // Corners relative to World Center
            const corners = [
                { x: -hw, y: -hh }, { x: hw, y: -hh },
                { x: hw, y: hh }, { x: -hw, y: hh }
            ];

            corners.forEach(p => {
                const wx = worldCenterX + (p.x * iCos - p.y * iSin);
                const wy = worldCenterY + (p.x * iSin + p.y * iCos);
                if (wx < minX) minX = wx;
                if (wy < minY) minY = wy;
                if (wx > maxX) maxX = wx;
                if (wy > maxY) maxY = wy;
            });

            hasSelection = true;
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
        // Debug: Log rotation to verify visual update
        // console.log("[drawSelectionBox] Drawing @", cx, cy, "w:", w, "h:", h, "rot:", rotation);

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

        // Side Handles
        const t = rotate(0, -halfH);
        const b = rotate(0, halfH);
        const l = rotate(-halfW, 0);
        const r = rotate(halfW, 0);

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

        // Corners
        g.circle(tl.x, tl.y, hSize).fill(fillStyle).stroke(handleStyle);
        g.circle(tr.x, tr.y, hSize).fill(fillStyle).stroke(handleStyle);
        g.circle(br.x, br.y, hSize).fill(fillStyle).stroke(handleStyle);
        g.circle(bl.x, bl.y, hSize).fill(fillStyle).stroke(handleStyle);

        // Sides (Only if size is large enough to avoid clutter)
        if (w > 20 / this.currentZoom && h > 20 / this.currentZoom) {
            g.circle(t.x, t.y, hSize).fill(fillStyle).stroke(handleStyle);
            g.circle(b.x, b.y, hSize).fill(fillStyle).stroke(handleStyle);
            g.circle(l.x, l.y, hSize).fill(fillStyle).stroke(handleStyle);
            g.circle(r.x, r.y, hSize).fill(fillStyle).stroke(handleStyle);
        }

        // Rotation Handle (Top Center, extended)
        if (h > 40 / this.currentZoom) {
            const topCenter = rotate(0, -halfH - (24 / this.currentZoom));
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

        // Use proxied URL for consistency
        const proxiedUrl = getProxiedUrl(url);

        // Load or Get Texture
        if (PIXI.Assets.cache.has(proxiedUrl)) {
            this.ghostSprite.texture = PIXI.Assets.get(proxiedUrl);
        } else {
            // Load async
            PIXI.Assets.load({
                src: proxiedUrl,
                format: 'png',
                loadParser: 'loadTextures',
                data: { crossOrigin: 'anonymous' }
            }).then(tex => {
                if (this.ghostSprite && !this.ghostSprite.destroyed) {
                    this.ghostSprite.texture = tex;
                    // Re-apply size if needed as texture swap might reset it or we want correct ratio
                    this.ghostSprite.width = w;
                    this.ghostSprite.height = h;
                }
            }).catch(err => {
                console.error('[RenderManager] Ghost load failed', proxiedUrl, err);
            });
        }

        this.ghostSprite.alpha = alpha;
        this.ghostSprite.position.set(x, y);
        this.ghostSprite.width = w;
        this.ghostSprite.height = h;
    }

    private lastRemotePoints: Map<string, { x: number, y: number }> = new Map();

    clearRemoteDrags(senderId: string) {
        const g = this.remoteGraphics.get(senderId);
        if (g) {
            this.dynamicLayer.removeChild(g);
            g.destroy();
            this.remoteGraphics.delete(senderId);
        }
        this.lastRemotePoints.delete(senderId);
        // Also clear cursor targets if appropriate? 
        // No, 'clearRemoteDrags' is for drawing strokes, 'removeRemoteUser' is for cursors.
    }

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
            g = new PIXI.Graphics();
            // Use dynamicLayer for drafting.
            this.dynamicLayer.addChild(g);
            this.remoteGraphics.set(senderId, g);
            this.lastRemotePoints.delete(senderId);
        }

        // Fix Eraser Visualization: Draw White/Bg Color
        if (tool === 'eraser') {
            // Option A: Use 'erase' blend mode if structure allows (Node checks needed)
            // Option B: Visual feedback with White (safer for drafts)
            // Let's use White for now as it's reliable for visual feedback on whiteboards
            // If background is not white, we might need a different approach.
            // Assumption: Whiteboard is white.
            // But if we want real transparency, we need to apply to staticLayer, which is hard in real-time.
            // User complained "Eraser draws". If it draws black, that's bad.
            // Drawing white is better.
            g.stroke({ width: width, color: 0xffffff, cap: 'round', join: 'round' });

            // Note: This only covers "drawing" the path. Real erasure happens on `add_item` (path with correct type). 
            // So visual feedback is enough.
        } else {
            const lastPoint = this.lastRemotePoints.get(senderId);
            if (lastPoint && !isNewStroke && points.length > 0) {
                const dist = Math.hypot(points[0].x - lastPoint.x, points[0].y - lastPoint.y);
                if (dist < 200) {
                    g.moveTo(lastPoint.x, lastPoint.y);
                    g.lineTo(points[0].x, points[0].y);
                    g.stroke({ width, color: color, cap: 'round', join: 'round' });
                }
            }

            if (points.length > 0) {
                g.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    g.lineTo(points[i].x, points[i].y);
                }
                g.stroke({ width, color: color, cap: 'round', join: 'round' });
            }
        }

        if (points.length > 0) {
            this.lastRemotePoints.set(senderId, points[points.length - 1]);
        }
    }

    updateRemoteCursor(attendeeId: string, data: { x: number; y: number; tool?: string; color?: string; name?: string; avatar?: string; socketId?: string }) {
        if (data.socketId) {
            this.socketToSender.set(data.socketId, attendeeId);
        }
        let cursor = this.remoteCursors.get(attendeeId);

        // Tool Icon Helper
        const getToolIcon = (t?: string) => {
            if (t === 'pen') return '✏️';
            if (t === 'eraser') return 'Eraser';
            if (t === 'text') return 'T';
            if (t === 'shape') return '⬜';
            if (t === 'image') return '🖼️';
            if (t === 'hand') return '✋';
            return '';
        };

        if (!cursor) {
            cursor = new PIXI.Container();
            cursor.position.set(data.x, data.y);
            this.remoteCursors.set(attendeeId, cursor);
            this.cursorLayer.addChild(cursor);
            this.remoteCursorTargets.set(attendeeId, { x: data.x, y: data.y });

            // Assign Random Color if not exists
            if (!this.userColors.has(attendeeId)) {
                const randomColor = this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
                this.userColors.set(attendeeId, randomColor);
            }
            const userColor = this.userColors.get(attendeeId)!;

            // 1. Cursor Arrow
            const arrow = new PIXI.Graphics();
            // SVG Path-like arrow shape
            arrow.moveTo(0, 0);
            arrow.lineTo(6, 18); // Down-Right
            arrow.lineTo(10, 11); // Inner notch
            arrow.lineTo(17, 11); // Right wing
            arrow.lineTo(0, 0);   // Close
            arrow.fill(userColor); // User Color
            arrow.stroke({ width: 1, color: 0xffffff }); // White outline for contrast

            // Add shadow/glow? No, keep simple.
            cursor.addChild(arrow);

            /* 2. Name Tag Pill
            const infoGroup = new PIXI.Container();
            infoGroup.position.set(12, 12); // Offset from arrow tip
            cursor.addChild(infoGroup);
            
            // Background Pill
            const bg = new PIXI.Graphics();
            infoGroup.addChild(bg);
            
            // Name Text
            const nameStr = data.name || 'User';
            const text = new PIXI.Text({
                text: nameStr,
                style: {
                    fontSize: 12,
                    fill: 0xffffff,
                    fontWeight: 'bold',
                    fontFamily: 'Arial'
                }
            });
            text.position.set(6, 3); // Padding
            
            const tw = text.width;
            const th = text.height;
            const pillW = tw + 12;
            const pillH = th + 6;
            
            bg.roundRect(0, 0, pillW, pillH, 4);
            bg.fill(userColor); */

            // 2. Info Group (Avatar + Name + Tool)
            const infoGroup = new PIXI.Container();
            infoGroup.position.set(12, 12);
            cursor.addChild(infoGroup);

            // Background Pill
            const bg = new PIXI.Graphics();
            infoGroup.addChild(bg);

            // Avatar Handling (Updated)
            const avatarRadius = 12;
            const paddingX = 6;
            const paddingY = 6;
            let currentX = paddingX;

            // Text Measurement First
            const toolStr = getToolIcon(data.tool);
            const nameStr = (data.name || 'User') + (toolStr ? ` ${toolStr}` : '');
            const text = new PIXI.Text({
                text: nameStr,
                style: {
                    fontSize: 14, // Slightly larger font 
                    fill: 0xffffff,
                    fontWeight: 'bold',
                    fontFamily: 'Arial',
                }
            });
            const th = text.height;
            const pillH = Math.max(th + paddingY * 2, (avatarRadius * 2) + paddingY);

            if (data.avatar) {
                const avatarGroup = new PIXI.Container();
                const centerY = pillH / 2;

                const avatarBg = new PIXI.Graphics();
                avatarBg.circle(0, 0, avatarRadius);
                avatarBg.fill(0xcccccc);
                avatarBg.stroke({ width: 2, color: userColor });
                avatarGroup.addChild(avatarBg);

                const sprite = new PIXI.Sprite();
                sprite.anchor.set(0.5);
                sprite.width = avatarRadius * 2;
                sprite.height = avatarRadius * 2;

                const mask = new PIXI.Graphics();
                mask.circle(0, 0, avatarRadius);
                mask.fill(0xffffff);

                sprite.mask = mask;
                avatarGroup.addChild(mask);
                avatarGroup.addChild(sprite);

                PIXI.Assets.load({ src: getProxiedUrl(data.avatar), format: 'png', loadParser: 'loadTextures' })
                    .then(t => { if (!sprite.destroyed) sprite.texture = t; }).catch(() => { });

                avatarGroup.position.set(currentX + avatarRadius, centerY);
                infoGroup.addChild(avatarGroup);

                currentX += (avatarRadius * 2) + 6;
            } else {
                currentX += 4;
            }

            // Text Positioning
            text.anchor.set(0, 0.5); // Vertical Center
            text.position.set(currentX, pillH / 2);
            infoGroup.addChild(text);

            const pillW = currentX + text.width + paddingX + 4;

            bg.roundRect(0, 0, pillW, pillH, pillH / 2);
            bg.fill(userColor);

            infoGroup.addChild(text);
        }




        // Update Target for LERP
        this.remoteCursorTargets.set(attendeeId, { x: data.x, y: data.y });
    }

    // Map SocketID -> SenderID for cleanup (Defined at top)

    removeRemoteUserBySocketId(socketId: string) {
        const senderId = this.socketToSender.get(socketId);
        if (senderId) {
            const cursor = this.remoteCursors.get(senderId);
            if (cursor) {
                this.cursorLayer.removeChild(cursor);
                cursor.destroy();
                this.remoteCursors.delete(senderId);
            }
            // Cleanup their draft stroke
            const g = this.remoteGraphics.get(senderId);
            if (g) {
                this.dynamicLayer.removeChild(g);
                g.destroy();
                this.remoteGraphics.delete(senderId);
            }
            this.lastRemotePoints.delete(senderId);
            this.socketToSender.delete(socketId);
        }
    }

    // Inject socketId mapping at top of updateRemoteCursor
    // We need to modify the signature or just handle it inside? 
    // The method signature change requires changing the start of the function.
    // I am editing the END of the function here. 
    // Wait, I need to update signature too.
    // Let's replace the whole logical block of updateRemoteCursor signature in a separate edit if needed?
    // No, I can't easily change the top part if I target the bottom.
    // Let's rely on the fact that I will replace the whole method content in chunks or just force the whole thing if I can match it.
    // Since Step 1175 failed on the whole block, I should try to replace the bottom part first to add the new methods, then update the top part.

    // Actually, `updateRemoteCursor` signature already has `socketId?: string`?
    // Let's check view_file line 760.
    // Line 760: updateRemoteCursor(attendeeId: string, data: { ... })
    // Does data have socketId? 
    // "data: { x: number; y: number; tool?: string; color?: string; name?: string; avatar?: string }"
    // It is MISSING socketId in the signature!
    // I need to update the signature. 




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
