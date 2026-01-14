import * as PIXI from 'pixi.js';
import { v4 as uuidv4 } from 'uuid';
import { getProxiedUrl } from './utils/urlUtils';
import { loadTexture } from './utils/textureLoader';
import { WhiteboardItem } from './store';
import { QuadTree, Rect } from './utils/QuadTree';
import { STAMP_PATHS, STAMP_COLORS } from './utils/stampAssets';

// Use Base64 encoding for SVGs to avoid parsing errors in PixiJS/Browser
const svgToBase64 = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`;

const RAW_ICONS = {
    select: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 10.5H5.375M2.25 12h2.25m9.472 0h.008v.008H13.972V12zm0-4.5h.008v.008H13.972V7.5zm0 9h.008v.008H13.972V16.5z" /></svg>`,
    pan: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>`,
    pen: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>`,
    'magic-pen': `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 5.5l-.5.5M15 4l4 4M4.5 19.5l7-7M17.5 13.5l1 1M14 10l-6.5 6.5a2.121 2.121 0 003 3L17 13M4 4l2 2m0-2l-2 2M7 2h.01M2 7h.01" /></svg>`,
    eraser: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path stroke-linecap="round" stroke-linejoin="round" d="M16 8l-6 6" /></svg>`,
    image: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`,
    shape: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>`,
    text: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 6h14M12 6v13m-3 0h6" /></svg>`
};

const SVG_ICONS: Record<string, string> = Object.fromEntries(
    Object.entries(RAW_ICONS).map(([k, v]) => [k, svgToBase64(v)])
);

export class RenderManager {
    public app: PIXI.Application;
    public staticLayer: PIXI.Container;
    public dynamicLayer: PIXI.Container;
    public drawingLayer: PIXI.Container;
    public quadTree: QuadTree<WhiteboardItem & { getBounds: () => Rect }>;
    public selectionLayer: PIXI.Container;
    public dragLayer: PIXI.Container;
    public ghostLayer: PIXI.Container;
    public effectLayer: PIXI.Container; // New Layer for Effects
    public cursorLayer: PIXI.Container;
    public width: number;
    public height: number;
    private remoteCursors: Map<string, PIXI.Container> = new Map();
    private remoteCursorTargets: Map<string, { x: number; y: number }> = new Map();
    private remoteGraphics: Map<string, PIXI.Graphics> = new Map();
    private socketToSender: Map<string, string> = new Map();
    private localCursor: PIXI.Container | null = null; // Local User Cursor
    private iconTextures: Map<string, PIXI.Texture> = new Map(); // Cache for SVG Icons
    private initialized: boolean = false;
    private destroyed: boolean = false;
    public currentZoom: number = 1;
    private selectionOverride: { cx: number, cy: number, w: number, h: number, rotation: number } | null = null;

    // Animation Effects
    private activeEffects: { update: (dt: number) => boolean }[] = [];

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
        this.dragLayer = new PIXI.Container();
        this.ghostLayer = new PIXI.Container();
        this.effectLayer = new PIXI.Container();
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
                // resizeTo: container, // Causing updateLocalTransform issues in some envs?
                antialias: true,
                autoDensity: true,
                resolution: window.devicePixelRatio || 1,
                // preference: 'webgpu' // Fallback to WebGL for stability
            });

            if (this.destroyed) {
                // safely destroy if already destroyed during init
                this.app?.destroy(true, { children: true, texture: false });
                return;
            }

            // Ensure canvas exists and attach
            if (this.app.canvas) {
                this.app.canvas.style.position = 'absolute';
                this.app.canvas.style.top = '0';
                this.app.canvas.style.left = '0';
                this.app.canvas.style.zIndex = '1';
                this.app.canvas.style.outline = 'none';
                this.app.canvas.style.cursor = 'inherit';
                container.appendChild(this.app.canvas);
            }

            this.app.stage.addChild(this.drawingLayer);
            this.app.stage.addChild(this.ghostLayer);
            this.app.stage.addChild(this.effectLayer); // Add effect layer
            this.app.stage.addChild(this.selectionLayer);
            this.app.stage.addChild(this.dragLayer);
            this.app.stage.addChild(this.cursorLayer);
            this.app.stage.eventMode = 'none';

            // Ensure effect layer doesn't block events
            this.effectLayer.eventMode = 'none';

            // Disable PixiJS internal cursor management
            this.app.renderer.events.cursorStyles.default = 'inherit';
            this.app.renderer.events.setCursor = () => { };

            this.initialized = true;

            // Start Ticker
            this.app.ticker.add(this.tick.bind(this));

            // Initial Resize
            this.resize(container.clientWidth, container.clientHeight);

            // Preload Icons
            this.preloadIcons();
        } catch (err) {
            console.error("PixiJS Init Failed", err);
        }
    }

    private preloadIcons() {
        Object.entries(SVG_ICONS).forEach(([key, url]) => {
            PIXI.Assets.load({ src: url, format: 'svg' })
                .then(tex => this.iconTextures.set(key, tex))
                .catch(err => console.warn("Failed to load icon", key, err));
        });

        // Preload Stamps
        Object.entries(STAMP_PATHS).forEach(([key, path]) => {
            const color = STAMP_COLORS[key] || 0x000000;
            const hex = '#' + color.toString(16).padStart(6, '0');

            // Stamps usage: use Fill for solid shapes, Stroke for outlines.
            // Stamps usage: use Fill for solid shapes, Stroke for outlines.
            // Using higher resolution (200x200) to prevent blurriness when scaled up.
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="${hex}" stroke="${hex}" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="${path}" />
                </svg>`;

            const dataUri = svgToBase64(svg);
            const cacheKey = `stamp-${key}`;

            PIXI.Assets.load({ src: dataUri, format: 'svg' })
                .then(tex => {
                    this.iconTextures.set(cacheKey, tex);
                    console.log(`[RenderManager] Loaded stamp texture: ${key}`);
                })
                .catch(err => console.warn("Failed to load stamp", key, err));
        });
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

        // Update Effects
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            if (!effect.update(1)) { // dt=1 for now, or use ticker.deltaTime
                this.activeEffects.splice(i, 1);
            }
        }
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
            const fontSize = item.data?.fontSize || 24;
            const fontFamily = item.data?.fontFamily || 'Arial, sans-serif';
            const text = item.data?.text || '';
            const lineHeight = fontSize * 1.4;
            const MAX_WIDTH = 376; // Matches PixiJS wordWrapWidth

            if (!text.trim()) {
                // Empty text - minimal bounds
                return { x: 0, y: 0, width: 100, height: fontSize };
            }

            // Use canvas for accurate text measurement
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return { x: 0, y: 0, width: 100, height: fontSize };
            }

            ctx.font = `${fontSize}px ${fontFamily}`;

            // Split by existing newlines and measure each line
            const explicitLines = text.split('\n');
            let totalHeight = 0;
            let maxWidth = 0;

            for (const explicitLine of explicitLines) {
                if (explicitLine.length === 0) {
                    // Empty line
                    totalHeight += lineHeight;
                    continue;
                }

                const linePixelWidth = ctx.measureText(explicitLine).width;

                if (linePixelWidth <= MAX_WIDTH) {
                    // Line fits without wrapping
                    maxWidth = Math.max(maxWidth, linePixelWidth);
                    totalHeight += lineHeight;
                } else {
                    // Line needs wrapping - calculate wrapped lines
                    let currentLine = '';
                    let currentWidth = 0;
                    const words = explicitLine.split(/(\s+)/);

                    for (const word of words) {
                        const wordWidth = ctx.measureText(word).width;

                        if (currentWidth + wordWidth <= MAX_WIDTH) {
                            currentLine += word;
                            currentWidth += wordWidth;
                        } else {
                            if (currentLine.length > 0) {
                                maxWidth = Math.max(maxWidth, currentWidth);
                                totalHeight += lineHeight;
                            }

                            // Handle words longer than MAX_WIDTH
                            if (wordWidth > MAX_WIDTH && word.trim().length > 0) {
                                // Break character by character
                                let charLine = '';
                                let charWidth = 0;
                                for (const char of word) {
                                    const charW = ctx.measureText(char).width;
                                    if (charWidth + charW <= MAX_WIDTH) {
                                        charLine += char;
                                        charWidth += charW;
                                    } else {
                                        if (charLine.length > 0) {
                                            maxWidth = Math.max(maxWidth, charWidth);
                                            totalHeight += lineHeight;
                                        }
                                        charLine = char;
                                        charWidth = charW;
                                    }
                                }
                                currentLine = charLine;
                                currentWidth = charWidth;
                            } else {
                                currentLine = word;
                                currentWidth = wordWidth;
                            }
                        }
                    }

                    if (currentLine.length > 0) {
                        maxWidth = Math.max(maxWidth, currentWidth);
                        totalHeight += lineHeight;
                    }
                }
            }

            return {
                x: 0,
                y: 0,
                width: item.data?.width || Math.max(50, Math.min(maxWidth, MAX_WIDTH)),
                height: item.data?.height || Math.max(fontSize, totalHeight)
            };
        }


        if (item.type === 'shape') {
            const w = item.data?.width || 100;
            const h = item.data?.height || 100;
            return { x: 0, y: 0, width: w, height: h };
        }

        if (item.type === 'postit') {
            const w = item.data?.width || 200;
            const h = item.data?.height || 200;
            return { x: 0, y: 0, width: w, height: h };
        }

        if (item.type === 'stamp') {
            const w = item.data?.width || 200;
            const h = item.data?.height || 200;
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

    renderItems(items: Map<string, WhiteboardItem>, editingItemId?: string | null) {
        if (!this.initialized) {
            console.warn("[RenderManager] renderItems called but not initialized");
            return;
        }

        this.quadTree.clear();
        this.staticLayer.removeChildren();

        // Separate items into root items and child items
        const rootItems: WhiteboardItem[] = [];
        const childrenByParent = new Map<string, WhiteboardItem[]>();

        items.forEach(item => {
            if (item.parentId) {
                const children = childrenByParent.get(item.parentId) || [];
                children.push(item);
                childrenByParent.set(item.parentId, children);
            } else {
                rootItems.push(item);
            }
        });

        // Sort root items by zIndex
        // Sort root items by Priority then zIndex
        // Priority: Path(0) < Content(1) < Stamp(2)
        const getPriority = (type: string) => {
            if (type === 'path') return 0;
            if (type === 'stamp') return 2;
            return 1;
        };

        rootItems.sort((a, b) => {
            const pa = getPriority(a.type);
            const pb = getPriority(b.type);
            if (pa !== pb) return pa - pb;
            return (a.zIndex || 0) - (b.zIndex || 0);
        });

        rootItems.forEach((item) => {
            const isEditing = item.id === editingItemId;

            // For Post-its, render with children as a group
            if (item.type === 'postit') {
                const children = childrenByParent.get(item.id) || [];
                children.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
                this.addPostitWithChildren(item, children, editingItemId);
            } else {
                this.addItem(item, isEditing);
            }
        });

        // Force render if not auto-updating (though ticker should handle it)
        // this.app.render(); 
    }

    addItem(item: WhiteboardItem, isEditing: boolean = false) {
        if (!this.initialized || !this.app || !this.dynamicLayer || !this.staticLayer) return;

        console.log(`[RenderManager] addItem called for: ${item.id} type=${item.type}`); // DEBUG LOG

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
            if (hasErasures) {
                console.log('[RenderManager] Path has erasures:', { id: item.id, count: item.data.erasures.length });
            }

            // Create Content Wrapper
            let content: PIXI.Container | PIXI.Graphics = g;
            const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };

            if (hasErasures) {
                const container = new PIXI.Container();

                // Normalize Global Geometry to Local Space (0,0)
                // This ensures it aligns with Erasure Points which are 0..W
                g.position.set(-bounds.x, -bounds.y);

                container.addChild(g);

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

                container.filters = [new PIXI.AlphaFilter({ alpha: 1 })];
                content = container;

                // For Normalized Container, Pivot is Local Center
                const localCx = bounds.width / 2;
                const localCy = bounds.height / 2;
                content.pivot.set(localCx, localCy);
            } else {
                // Determine Pivot for Global Geometry (World Center)
                content.pivot.set(cx, cy);
            }

            // Position is always World Center (adjusted by transform)
            content.position.set(t.x + cx, t.y + cy);
            content.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
            content.rotation = t.rotation ?? 0;

            this.staticLayer.addChild(content);
        }

        if (item.type === 'text') {
            const { text, fontSize, color, fontFamily } = item.data || {};
            const textStyle = new PIXI.TextStyle({
                fontFamily: fontFamily || 'Arial, sans-serif',
                fontSize: fontSize || 24,
                fill: color || '#000000',
                align: 'left',
                // DISABLED: Let explicit newlines from TextInputOverlay control wrapping
                // This ensures consistency between input, edit, and display
                wordWrap: false,
                lineHeight: (fontSize || 24) * 1.4,
            });

            // Fallback for empty text
            const displayText = text || '';
            if (!displayText.trim()) {
                return; // Don't render empty text items
            }

            const pixiText = new PIXI.Text({ text: displayText, style: textStyle });
            pixiText.resolution = 2; // sharper text

            // Local bounds - use actual Pixi text measurements (accounts for wordWrap)
            const w = pixiText.width;
            const h = pixiText.height;
            console.log(`[RenderManager] Text "${displayText.substring(0, 20)}..." rendered: w=${w}, h=${h}`);
            const cx = w / 2;
            const cy = h / 2;

            const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };

            // Pivot at center
            pixiText.pivot.set(cx, cy);
            // Position at World Center (Transform X/Y + Half Size)
            pixiText.position.set(t.x + cx, t.y + cy);
            pixiText.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
            pixiText.rotation = t.rotation ?? 0;

            if (isEditing) {
                pixiText.visible = false;
                pixiText.alpha = 0;
            }

            this.staticLayer.addChild(pixiText);
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
            }

            // If we retrieved a texture (from cache or placeholder), use it
            // Note: We avoid the try-catch block for simple assignment if our logic above is solid.

            // Ensure texture is valid
            if (!texture) {
                texture = PIXI.Texture.EMPTY;
            }

            const sprite = new PIXI.Sprite(texture);
            // sprite.anchor.set(0.5); // Removed to fix hit detection mismatch

            const w = item.data.width || 100;
            const h = item.data.height || 100;

            const updateSize = () => {
                if (sprite.destroyed) return;
                sprite.width = w;
                sprite.height = h;
            };

            updateSize();

            // If we are using the placeholder, load the real texture
            if (!PIXI.Assets.cache.has(proxiedUrl)) {
                loadTexture(proxiedUrl).then((tex) => {
                    if (!sprite.destroyed) {
                        console.log('[RenderManager] Updating sprite texture:', proxiedUrl);
                        sprite.texture = tex;
                        updateSize();
                        // Force re-render once loaded
                        if (this.app && this.app.render) {
                            this.app.render();
                        }
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


        // STAMP RENDERING
        if (item.type === 'stamp') {
            const content = this.createStampContent(item);
            if (content) {
                const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
                const bounds = this.getLocalBounds(item);
                const cx = bounds.width / 2;
                const cy = bounds.height / 2;

                // Check for erasures
                const hasErasures = item.data?.erasures && item.data.erasures.length > 0;
                let finalContent: PIXI.Container | PIXI.Sprite = content;

                if (hasErasures) {
                    const container = new PIXI.Container();

                    // Reset content transform to be local to the wrapper
                    // Content pivot is (cx, cy).
                    // We place it at (cx, cy) so its top-left (0,0) aligns with wrapper (0,0)
                    content.position.set(cx, cy);
                    content.scale.set(1, 1);
                    content.rotation = 0;

                    container.addChild(content);

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
                    finalContent = container;
                }

                // Apply transforms to the final content wrapper
                finalContent.pivot.set(cx, cy);
                finalContent.position.set(t.x + cx, t.y + cy);
                finalContent.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
                finalContent.rotation = t.rotation ?? 0;

                this.staticLayer.addChild(finalContent);
            }
        }

        // POST-IT RENDERING
        if (item.type === 'postit') {
            const w = item.data?.width || 200;
            const h = item.data?.height || 200;
            const color = item.data?.color || 0xFFEB3B; // Yellow default

            const container = new PIXI.Container();

            // Shadow
            const shadow = new PIXI.Graphics();
            shadow.roundRect(4, 4, w, h, 4);
            shadow.fill({ color: 0x000000, alpha: 0.15 });
            container.addChild(shadow);

            // Main background
            const bg = new PIXI.Graphics();
            bg.roundRect(0, 0, w, h, 4);
            bg.fill({ color: color, alpha: 1 });
            container.addChild(bg);

            // Corner fold effect
            const fold = new PIXI.Graphics();
            const foldSize = 20;
            fold.moveTo(w - foldSize, 0);
            fold.lineTo(w, 0);
            fold.lineTo(w, foldSize);
            fold.lineTo(w - foldSize, 0);
            fold.fill({ color: 0x000000, alpha: 0.1 });
            container.addChild(fold);

            // Border
            const border = new PIXI.Graphics();
            border.roundRect(0, 0, w, h, 4);
            border.stroke({ width: 1, color: 0x000000, alpha: 0.15 });
            container.addChild(border);

            // Apply transforms
            const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
            container.pivot.set(w / 2, h / 2);
            container.position.set(t.x + w / 2, t.y + h / 2);
            container.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
            container.rotation = t.rotation ?? 0;

            this.staticLayer.addChild(container);
        }
    }

    // Render Post-it with its children in a single container (Unity-like parent-child hierarchy)
    addPostitWithChildren(postit: WhiteboardItem, children: WhiteboardItem[], editingItemId?: string | null) {
        if (!this.initialized) return;

        const w = postit.data?.width || 200;
        const h = postit.data?.height || 200;
        const color = postit.data?.color || 0xFFEB3B;

        // Main container that holds everything
        const mainContainer = new PIXI.Container();

        // Insert Post-it into QuadTree
        this.quadTree.insert({ ...postit, getBounds: () => this.getItemBounds(postit) });

        // Shadow
        const shadow = new PIXI.Graphics();
        shadow.roundRect(4, 4, w, h, 4);
        shadow.fill({ color: 0x000000, alpha: 0.15 });
        mainContainer.addChild(shadow);

        // Main background
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, w, h, 4);
        bg.fill({ color: color, alpha: 1 });
        mainContainer.addChild(bg);

        // Content container for children (clipped to Post-it bounds)
        const contentContainer = new PIXI.Container();

        // Create clipping mask
        const mask = new PIXI.Graphics();
        mask.roundRect(0, 0, w, h, 4);
        mask.fill({ color: 0xffffff });
        mainContainer.addChild(mask);
        contentContainer.mask = mask;

        // Render children inside the content container
        children.forEach(child => {
            // Insert child into QuadTree with parent-adjusted bounds
            this.quadTree.insert({ ...child, getBounds: () => this.getItemBounds(child) });

            const childContent = this.createItemContent(child, child.id === editingItemId);
            if (childContent) {
                contentContainer.addChild(childContent);
            }
        });

        mainContainer.addChild(contentContainer);

        // Corner fold effect (on top of children)
        const fold = new PIXI.Graphics();
        const foldSize = 20;
        fold.moveTo(w - foldSize, 0);
        fold.lineTo(w, 0);
        fold.lineTo(w, foldSize);
        fold.lineTo(w - foldSize, 0);
        fold.fill({ color: 0x000000, alpha: 0.1 });
        mainContainer.addChild(fold);

        // Border (on top of children)
        const border = new PIXI.Graphics();
        border.roundRect(0, 0, w, h, 4);
        border.stroke({ width: 1, color: 0x000000, alpha: 0.15 });
        mainContainer.addChild(border);

        // Apply Post-it transforms to entire container
        const t = postit.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
        mainContainer.pivot.set(w / 2, h / 2);
        mainContainer.position.set(t.x + w / 2, t.y + h / 2);
        mainContainer.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
        mainContainer.rotation = t.rotation ?? 0;

        this.staticLayer.addChild(mainContainer);
    }

    // Create content for an item without adding to layer (used for child items)
    private createItemContent(item: WhiteboardItem, isEditing: boolean): PIXI.Container | null {
        if (item.type === 'path') {
            return this.createPathContent(item);
        }
        if (item.type === 'text' && !isEditing) {
            return this.createTextContent(item);
        }
        if (item.type === 'image') {
            return this.createImageContent(item);
        }
        if (item.type === 'stamp') {
            return this.createStampContent(item);
        }
        // Add more types as needed
        return null;
    }

    private createPathContent(item: WhiteboardItem): PIXI.Container | null {
        const g = new PIXI.Graphics();
        const { points, color: itemColor, brushSize: itemBrushSize, erasures } = item.data || {};
        const drawColor = typeof itemColor === 'string' ? parseInt(itemColor.replace('#', ''), 16) : (itemColor || 0x000000);
        const drawWidth = itemBrushSize || 2;

        if (itemColor === '#ffffff' || itemColor === 0xffffff || itemColor === 'eraser') {
            g.blendMode = 'erase';
        }

        if (points && points.length > 0) {
            g.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                const p1 = points[i - 1];
                const p2 = points[i];
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                g.quadraticCurveTo(p1.x, p1.y, midX, midY);
            }
            if (points.length > 1) {
                const last = points[points.length - 1];
                g.lineTo(last.x, last.y);
            }
            g.stroke({ width: drawWidth, color: drawColor, cap: 'round', join: 'round' });
        }

        // Apply transform
        const lb = this.getLocalBounds(item);
        const cx = lb.x + lb.width / 2;
        const cy = lb.y + lb.height / 2;
        const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };

        g.pivot.set(cx, cy);
        g.position.set(t.x + cx, t.y + cy);
        g.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
        g.rotation = t.rotation ?? 0;

        return g;
    }

    private createTextContent(item: WhiteboardItem): PIXI.Container | null {
        const { text, fontSize, color, fontFamily } = item.data || {};
        const textStyle = new PIXI.TextStyle({
            fontFamily: fontFamily || 'Arial, sans-serif',
            fontSize: fontSize || 24,
            fill: color || '#000000',
            align: 'left',
            wordWrap: false,
            lineHeight: (fontSize || 24) * 1.4,
        });

        const displayText = text || '';
        if (!displayText.trim()) return null;

        const pixiText = new PIXI.Text({ text: displayText, style: textStyle });
        pixiText.resolution = 2;

        const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
        pixiText.position.set(t.x, t.y);
        pixiText.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
        pixiText.rotation = t.rotation ?? 0;

        return pixiText;
    }

    private createImageContent(item: WhiteboardItem): PIXI.Container | null {
        const url = item.data?.url;
        if (!url) return null;

        const proxiedUrl = getProxiedUrl(url);
        let texture: PIXI.Texture;

        if (PIXI.Assets.cache.has(proxiedUrl)) {
            texture = PIXI.Assets.get(proxiedUrl);
        } else {
            texture = PIXI.Texture.EMPTY;
            // Load async
            loadTexture(proxiedUrl).catch(() => { });
        }

        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0);

        const w = item.data.width || 100;
        const h = item.data.height || 100;
        sprite.width = w;
        sprite.height = h;

        const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
        const container = new PIXI.Container();
        container.addChild(sprite);
        container.pivot.set(w / 2, h / 2);
        container.position.set(t.x + w / 2, t.y + h / 2);
        container.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
        container.rotation = t.rotation ?? 0;

        return container;
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

                // console.log("RenderSelection Single:", id, "Rot:", item.transform.rotation, "W:", w, "H:", h);
                this.drawSelectionBox(worldCenterX, worldCenterY, w, h, item.transform.rotation || 0);
            } else {
                // console.log("RenderSelection: Item not found for id", id);
            }
            return;
        } else {
            // console.log("RenderSelection Multi:", selectedIds.size);
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
            // Line to handle
            g.moveTo(t.x, t.y);
            g.lineTo(topCenter.x, topCenter.y);
            g.stroke({ width: 1 / this.currentZoom, color: 0x00A3FF, alpha: 0.8 });

            g.circle(topCenter.x, topCenter.y, hSize).fill(fillStyle).stroke(handleStyle);
        }

        this.selectionLayer.addChild(g);
    }

    createCursorVisuals(user: { name?: string, color: string, avatar?: string }) {
        const cursorContainer = new PIXI.Container();

        // Arrow (Is this needed? Maybe just badge for local user, but this function creates for Remote?)
        // Let's create arrow always, and hide it if it's local user?
        // Actually, this method is used by `updateRemoteCursor` AND potentially local cursor logic.

        // Remote Cursor Arrow (SVG Path)
        // Standard "Arrow" pointer
        const arrowG = new PIXI.Graphics();
        arrowG.fill({ color: user.color });
        // arrowG.svg('M0,0 L0,16 L4,12 L9,22 L11,21 L6,11 L12,11 Z'); // Crashes in v8
        arrowG.moveTo(0, 0);
        arrowG.lineTo(0, 16);
        arrowG.lineTo(4, 12);
        arrowG.lineTo(9, 22);
        arrowG.lineTo(11, 21);
        arrowG.lineTo(6, 11);
        arrowG.lineTo(12, 11);
        arrowG.closePath();

        arrowG.rotation = -0.2; // Slight tilt
        arrowG.scale.set(1.2); // Size adjustment
        arrowG.stroke({ width: 1, color: 0xffffff }); // Optional white outline

        const badgeContainer = new PIXI.Container();
        badgeContainer.position.set(16, 16); // Offset from tip

        const nameText = new PIXI.Text({
            text: user.name || 'Anonymous',
            style: {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0xffffff,
                fontWeight: 'bold',
            }
        });
        nameText.resolution = 2; // sharper text

        // Avatar (Circle Mask)
        let avatarSprite: PIXI.Sprite | null = null;
        if (user.avatar) {
            const proxiedAvatar = getProxiedUrl(user.avatar);
            PIXI.Assets.load({ src: proxiedAvatar, format: 'png', parser: 'loadTextures' }).then(tex => {
                const sprite = new PIXI.Sprite(tex);
                sprite.width = 24;
                sprite.height = 24;
                sprite.x = 4;
                sprite.y = 4;

                const mask = new PIXI.Graphics();
                mask.circle(16, 16, 12).fill(0xffffff);
                sprite.mask = mask;

                badgeContainer.addChildAt(sprite, 1); // Insert after background
                badgeContainer.addChild(mask);
            }).catch(() => { });
        }

        // Background Box for Badge
        const padding = 8;
        const textWidth = nameText.width;
        const boxWidth = textWidth + padding * 2 + (user.avatar ? 28 : 0);
        const boxHeight = 24 + padding;

        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, boxWidth, boxHeight, 4).fill({ color: user.color });

        badgeContainer.addChild(bg);
        nameText.position.set(padding + (user.avatar ? 28 : 0), padding / 2 + 2);
        badgeContainer.addChild(nameText);

        cursorContainer.addChild(arrowG);
        cursorContainer.addChild(badgeContainer);

        return { container: cursorContainer, badge: badgeContainer, arrow: arrowG, bg, nameText };
    }

    updateRemoteCursor(id: string, x: number, y: number, user: { name?: string, color?: string, avatar?: string, tool?: string }) {
        if (!this.initialized) return;

        let cursor = this.remoteCursors.get(id);

        if (!cursor) {
            // Assign color if new
            let color = this.userColors.get(id);
            if (!color) {
                color = this.colorPalette[this.userColors.size % this.colorPalette.length];
                this.userColors.set(id, color);
            }

            // Convert color number to hex string for util if needed, but PIXI takes number.
            const visuals = this.createCursorVisuals({
                name: user.name,
                color: '#' + color.toString(16).padStart(6, '0'),
                avatar: user.avatar
            });

            cursor = visuals.container;
            cursor.x = x;
            cursor.y = y;

            this.cursorLayer.addChild(cursor);
            this.remoteCursors.set(id, cursor);
            this.remoteCursorTargets.set(id, { x, y });

            // Store reference to components if needed for updates (like tool icon)
            // For now, we just attach tool icon to badge if changed.
            // We can store metadata on the container.
            (cursor as any).meta = visuals;
        }

        // Update Target for Interpolation
        this.remoteCursorTargets.set(id, { x, y });

        // Update Tool Icon if changed
        const meta = (cursor as any).meta;
        if (meta && user.tool !== undefined && user.tool !== (cursor as any).currentTool) {
            (cursor as any).currentTool = user.tool;
            const tex = this.iconTextures.get(user.tool);

            // Clean up old icon
            const badge = meta.badge as PIXI.Container;
            const nameText = meta.nameText as PIXI.Text;
            const bg = meta.bg as PIXI.Graphics;

            // Remove any existing icon sprites (assuming they are Sprites and not the bg or name)
            // safer way: check children, if strict structure [bg, name, (optional avatar), (optional icon)]
            // We can just look for children that are PIXI.Sprites but NOT the avatar.
            // But avatar is a Container/Sprite?
            // Let's just track the icon sprite if possible.
            if ((cursor as any).iconSprite) {
                badge.removeChild((cursor as any).iconSprite);
                (cursor as any).iconSprite = null;
            }

            if (tex) {
                const iconSprite = new PIXI.Sprite(tex);
                iconSprite.width = 16;
                iconSprite.height = 16;
                iconSprite.tint = 0xffffff;

                // Adjust Layout: 
                // [Avatar (opt)] [Name] [Tool]
                // nameText.x is determined in createCursorVisuals:
                // If avatar: x = 8 + 24 + ? = 28 + 8 = 36? (Original code: padding + 28)
                // If no avatar: x = 8

                const nameRight = nameText.x + nameText.width;
                iconSprite.position.set(nameRight + 6, 4); // centered vertically in 24px box roughly
                // Box height is 24 + 8 = 32. 4 is top padding?
                // Text is at y = 4 + 2 = 6.
                // Let's align icon with text.

                badge.addChild(iconSprite);
                (cursor as any).iconSprite = iconSprite;

                // Update Background Width
                const padding = 8;
                const newWidth = iconSprite.x + iconSprite.width + padding;
                const boxHeight = 24 + padding;

                const color = this.userColors.get(id) || 0x000000;

                bg.clear();
                bg.roundRect(0, 0, newWidth, boxHeight, 4).fill({ color });
            } else {
                // Tool removed or switched to non-icon tool?
                // Restore original background width
                // Re-calculate original width
                const padding = 8;
                // Original logic: textWidth + padding * 2 + (avatar ? 28 : 0)
                // nameText.x is (padding + (avatar ? 28 : 0))
                // so width = nameText.x + nameText.width + padding
                const newWidth = nameText.x + nameText.width + padding;
                const boxHeight = 24 + padding;
                const color = this.userColors.get(id) || 0x000000;

                bg.clear();
                bg.roundRect(0, 0, newWidth, boxHeight, 4).fill({ color });
            }
        }
    }

    removeRemoteCursor(id: string) {
        const cursor = this.remoteCursors.get(id);
        if (cursor) {
            this.cursorLayer.removeChild(cursor);
            cursor.destroy({ children: true });
            this.remoteCursors.delete(id);
            this.remoteCursorTargets.delete(id);
        }
    }

    // --- Added missing methods for remote sync ---

    removeRemoteUserBySocketId(socketId: string) {
        console.warn(`[RenderManager] removeRemoteUserBySocketId not implemented (mapped: ${socketId})`);
    }

    updateLocalCursor(x: number, y: number, user: any) {
        if (!this.initialized) return;

        // If not created, create it
        if (!this.localCursor) {
            // Use same create logic but hide arrow
            // Or create dedicated badge-only setup.
            // Re-using createCursorVisuals but hiding arrow.

            const colorNum = this.colorPalette[0]; // Self is always first or specific?
            // Or use passed color.
            const colorHex = user.color || '#000000';

            const visuals = this.createCursorVisuals({
                name: user.name,
                color: colorHex,
                avatar: user.avatar
            });

            this.localCursor = visuals.container;
            visuals.arrow.visible = false; // Hide Arrow for local user!

            this.cursorLayer.addChild(this.localCursor);
            (this.localCursor as any).meta = visuals;
        }

        // Update Position
        this.localCursor.x = x;
        this.localCursor.y = y;
        this.localCursor.visible = true;

        // Update Tool Icon
        const meta = (this.localCursor as any).meta;
        const currentTool = (this.localCursor as any).currentTool;

        if (meta && user.tool && user.tool !== currentTool) {
            (this.localCursor as any).currentTool = user.tool;
            const tex = this.iconTextures.get(user.tool);

            // Clean up old icon
            if ((this.localCursor as any).toolSprite) {
                ((this.localCursor as any).toolSprite as PIXI.Sprite).destroy();
                (this.localCursor as any).toolSprite = null;
            }

            if (tex) {
                const iconSprite = new PIXI.Sprite(tex);
                iconSprite.width = 16;
                iconSprite.height = 16;
                iconSprite.tint = 0xffffff;
                iconSprite.position.set(4, 6); // visual tweak

                // Add to badge
                meta.badge.addChild(iconSprite);
                (this.localCursor as any).toolSprite = iconSprite;

                // Adjust text position
                meta.nameText.x = 8 + (user.avatar ? 28 : 0) + 20;
                meta.bg.width = meta.nameText.x + meta.nameText.width + 8;
            }
        }
    }

    hideLocalCursor() {
        if (this.localCursor) {
            this.localCursor.visible = false;
        }
    }

    // Interactive Ghost Rendering
    private ghostSprite: PIXI.Sprite | null = null;

    renderGhost(type: 'image' | 'postit' | 'stamp' | null, x: number, y: number, w: number = 0, h: number = 0, data?: any) {
        if (!this.initialized) return;

        // Clear existing children from ghostLayer first (for Post-it graphics)
        this.ghostLayer.removeChildren();

        if (!type) {
            if (this.ghostSprite) {
                this.ghostSprite.visible = false;
            }
            return;
        }

        if (type === 'image') {
            if (!this.ghostSprite) {
                this.ghostSprite = new PIXI.Sprite();
                this.ghostSprite.anchor.set(0.5);
                this.ghostLayer.addChild(this.ghostSprite);
            } else {
                if (this.ghostSprite.parent !== this.ghostLayer) {
                    this.ghostLayer.addChild(this.ghostSprite);
                }
            }

            const url = data?.url;
            if (url) {
                this.ghostSprite.visible = true;
                this.ghostSprite.alpha = 0.5;
                this.ghostSprite.x = x;
                this.ghostSprite.y = y;

                if (this.ghostSprite.label !== url) {
                    const proxied = getProxiedUrl(url);
                    loadTexture(proxied).then(tex => {
                        if (this.ghostSprite && this.ghostSprite.label === url) {
                            this.ghostSprite.texture = tex;
                        }
                    }).catch(() => { });
                    this.ghostSprite.label = url;
                }

                if (w && h) {
                    this.ghostSprite.width = w;
                    this.ghostSprite.height = h;
                }
            }
        } else if (type === 'postit') {
            if (this.ghostSprite) this.ghostSprite.visible = false;

            const g = new PIXI.Graphics();
            const halfW = w / 2;
            const halfH = h / 2;

            g.rect(-halfW + 4, -halfH + 4, w, h);
            g.fill({ color: 0x000000, alpha: 0.1 });

            g.rect(-halfW, -halfH, w, h);
            g.fill({ color: 0xFFEB3B, alpha: 0.6 });
            g.stroke({ width: 2, color: 0xFFC107, alpha: 0.8 });

            this.ghostLayer.addChild(g);
            this.ghostLayer.position.set(x, y);
        } else if (type === 'stamp') {
            if (this.ghostSprite) this.ghostSprite.visible = false;

            // Create stamp ghost if simple sprite handling is insufficient or we want independent instance
            // Reusing ghostSprite for simpler texture swap usually works if we manage state well
            // But stamp uses specific textures. 

            if (!this.ghostSprite) {
                this.ghostSprite = new PIXI.Sprite();
                this.ghostSprite.anchor.set(0.5);
                this.ghostLayer.addChild(this.ghostSprite);
            } else {
                if (this.ghostSprite.parent !== this.ghostLayer) {
                    this.ghostLayer.addChild(this.ghostSprite);
                }
            }

            const stampType = data?.stampType || 'thumbs-up';
            const cacheKey = `stamp-${stampType}`;
            const texture = this.iconTextures.get(cacheKey);

            if (texture) {
                this.ghostSprite.texture = texture;
                this.ghostSprite.visible = true;
                this.ghostSprite.alpha = 0.6;
                this.ghostSprite.x = x;
                this.ghostSprite.y = y;
                this.ghostSprite.width = w;
                this.ghostSprite.height = h;
            }
        }
    }


    destroy() {
        this.destroyed = true;

        // Only destroy if fully initialized to avoid partial-init crash (PixiJS issue)
        // If init is still running, it will check the 'destroyed' flag and cleanup itself.
        if (this.initialized) {
            try {
                this.app?.destroy(true, { children: true, texture: true });
            } catch (err) {
                console.warn("[RenderManager] Error during destroy:", err);
            }
        }
    }
    private createStampContent(item: WhiteboardItem): PIXI.Container | null {
        const stampType = item.data?.stampType || 'thumbs-up';
        const cacheKey = `stamp-${stampType}`;
        const texture = this.iconTextures.get(cacheKey);

        if (!texture) {
            console.warn(`[RenderManager] Missing texture for stamp: ${stampType}`);
            return null;
        }

        console.log(`[RenderManager] Creating stamp content for ${item.id} (${stampType})`);
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5);

        const w = item.data?.width || 200;
        const h = item.data?.height || 200;

        // Ensure non-zero size
        const safeW = w || 50;
        const safeH = h || 50;

        sprite.width = safeW;
        sprite.height = safeH;

        const container = new PIXI.Container();

        // Pivot/Anchor Logic
        // LocalBounds returns x=0, y=0, w, h. Center is w/2, h/2.
        const cx = safeW / 2;
        const cy = safeH / 2;

        sprite.position.set(cx, cy);
        container.addChild(sprite);

        const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
        container.pivot.set(cx, cy);
        container.position.set(t.x + cx, t.y + cy);
        container.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
        container.rotation = t.rotation ?? 0;

        return container;
    }

    public playStampEffect(x: number, y: number) {
        const lines: PIXI.Graphics[] = [];
        const count = 6;
        for (let i = 0; i < count; i++) {
            const g = new PIXI.Graphics();
            g.moveTo(0, 0);
            g.lineTo(15, 0);
            g.stroke({ width: 2, color: 0xFFD700 });
            g.position.set(x, y);
            g.rotation = (i / count) * Math.PI * 2;
            lines.push(g);
            this.effectLayer.addChild(g);
        }

        let time = 0;
        this.activeEffects.push({
            update: (dt: number) => {
                time += dt;
                const progress = Math.min(time / 20, 1);

                lines.forEach(l => {
                    l.position.x += Math.cos(l.rotation) * 2 * dt;
                    l.position.y += Math.sin(l.rotation) * 2 * dt;
                    l.alpha = 1 - progress;
                });

                if (progress >= 1) {
                    lines.forEach(l => l.destroy());
                    return false;
                }
                return true;
            }
        });
    }
}
