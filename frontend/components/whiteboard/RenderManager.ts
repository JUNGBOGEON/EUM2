import * as PIXI from 'pixi.js';
import { WhiteboardItem } from './store';
import { QuadTree, Rect } from './utils/QuadTree';
import { STAMP_ICONS, STAMP_PATHS, STAMP_COLORS } from './utils/stampAssets';

// Import managers
import {
    LayerManager,
    ItemRenderer,
    SelectionManager,
    CursorManager,
    GhostRenderer,
    EffectSystem,
    RemoteDrawingManager,
} from './managers';
import { AssetManager } from './utils/AssetManager';
import { BoundsCalculator } from './utils/BoundsCalculator';
import { USER_COLOR_PALETTE, GhostType, GhostData, SelectionOverride } from './types/render-types';

/**
 * RenderManager - Facade for whiteboard rendering system
 *
 * This class coordinates all rendering subsystems while maintaining
 * backward compatibility with the existing API.
 */
export class RenderManager {
    // Public properties for backward compatibility
    public app: PIXI.Application;
    public staticLayer: PIXI.Container;
    public dynamicLayer: PIXI.Container;
    public drawingLayer: PIXI.Container;
    public quadTree: QuadTree<WhiteboardItem & { getBounds: () => Rect }>;
    public selectionLayer: PIXI.Container;
    public dragLayer: PIXI.Container;
    public ghostLayer: PIXI.Container;
    public effectLayer: PIXI.Container;
    public cursorLayer: PIXI.Container;
    public width: number;
    public height: number;
    public currentZoom: number = 1;

    // Private state
    private iconTextures: Map<string, PIXI.Texture> = new Map();
    private initialized: boolean = false;
    private destroyed: boolean = false;
    private localCursor: PIXI.Container | null = null;
    private selectionBoxGraphics: PIXI.Graphics = new PIXI.Graphics();

    // Managers
    private layerManager: LayerManager;
    private assetManager: AssetManager;
    private itemRenderer!: ItemRenderer;
    private selectionManager!: SelectionManager;
    private cursorManager!: CursorManager;
    private ghostRenderer!: GhostRenderer;
    private effectSystem!: EffectSystem;
    private remoteDrawingManager!: RemoteDrawingManager;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.app = new PIXI.Application();

        // Initialize layer manager
        this.layerManager = new LayerManager();
        const layers = this.layerManager.getLayers();

        // Set public layer references for backward compatibility
        this.staticLayer = layers.static;
        this.dynamicLayer = layers.dynamic;
        this.drawingLayer = layers.drawing;
        this.selectionLayer = layers.selection;
        this.dragLayer = layers.drag;
        this.ghostLayer = layers.ghost;
        this.effectLayer = layers.effect;
        this.cursorLayer = layers.cursor;

        // Initialize QuadTree
        this.quadTree = new QuadTree({ x: 0, y: 0, width, height });

        // Initialize asset manager
        this.assetManager = new AssetManager();
    }

    public setSelectionOverride(override: SelectionOverride | null) {
        this.selectionManager?.setOverride(override);

        if (!override) {
            this.selectionLayer.removeChildren();
        }
    }

    async init(container: HTMLElement) {
        if (this.destroyed) return;

        try {
            await this.app.init({
                backgroundAlpha: 0,
                antialias: true,
                autoDensity: true,
                resolution: window.devicePixelRatio || 1,
            });

            if (this.destroyed) {
                this.app?.destroy(true, { children: true, texture: false });
                return;
            }

            // Attach canvas
            if (this.app.canvas) {
                this.app.canvas.style.position = 'absolute';
                this.app.canvas.style.top = '0';
                this.app.canvas.style.left = '0';
                this.app.canvas.style.zIndex = '1';
                this.app.canvas.style.outline = 'none';
                this.app.canvas.style.cursor = 'inherit';
                container.appendChild(this.app.canvas);
            }

            // Attach layers to stage
            this.layerManager.attachToStage(this.app.stage);

            // Disable PixiJS cursor management
            this.app.renderer.events.cursorStyles.default = 'inherit';
            this.app.renderer.events.setCursor = () => { };

            // Initialize managers that need app reference
            this.itemRenderer = new ItemRenderer(
                this.app,
                this.staticLayer,
                this.quadTree,
                this.iconTextures
            );

            this.selectionManager = new SelectionManager(this.selectionLayer);
            this.cursorManager = new CursorManager(this.cursorLayer, this.iconTextures, USER_COLOR_PALETTE);
            this.ghostRenderer = new GhostRenderer(this.ghostLayer, this.iconTextures);
            this.effectSystem = new EffectSystem(this.effectLayer);
            this.remoteDrawingManager = new RemoteDrawingManager(this.dynamicLayer);

            this.initialized = true;

            // Start ticker
            this.app.ticker.add(this.tick.bind(this));

            // Initial resize
            this.resize(container.clientWidth, container.clientHeight);

            // Preload assets
            await this.preloadIcons();
        } catch (err) {
            console.error("PixiJS Init Failed", err);
        }
    }

    private async preloadIcons() {
        await this.assetManager.preloadAll();

        // Copy textures to iconTextures map for backward compatibility
        this.assetManager.textures.forEach((tex, key) => {
            this.iconTextures.set(key, tex);
        });

        // Update managers with loaded textures
        this.itemRenderer?.setIconTextures(this.iconTextures);
        this.cursorManager?.setIconTextures(this.iconTextures);
        this.ghostRenderer?.setIconTextures(this.iconTextures);
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.app?.renderer?.resize(width, height);
    }

    tick(ticker: PIXI.Ticker) {
        if (!this.initialized || this.destroyed) return;

        const dt = ticker.deltaTime;

        // Update effect system
        this.effectSystem?.tick(dt);

        // Update cursor interpolation
        this.cursorManager?.tick(0.25);
    }

    bake() {
        // Placeholder for potential future use
    }

    public getLocalBounds(item: WhiteboardItem): Rect {
        return BoundsCalculator.getLocalBounds(item);
    }

    private getItemBounds(item: WhiteboardItem): Rect {
        return BoundsCalculator.getItemBounds(item);
    }

    setZoom(zoom: number) {
        this.currentZoom = zoom;
        this.selectionManager?.setZoom(zoom);
    }

    renderItems(items: Map<string, WhiteboardItem>, editingItemId?: string | null) {
        if (!this.initialized) {
            console.warn("[RenderManager] renderItems called but not initialized");
            return;
        }
        this.itemRenderer?.renderItems(items, editingItemId);
    }

    addItem(item: WhiteboardItem, isEditing: boolean = false) {
        if (!this.initialized) return;
        this.itemRenderer?.addItem(item, isEditing);
    }

    addPostitWithChildren(postit: WhiteboardItem, children: WhiteboardItem[], editingItemId?: string | null) {
        if (!this.initialized) return;
        this.itemRenderer?.addPostitWithChildren(postit, children, editingItemId);
    }

    clearLayers() {
        this.staticLayer.removeChildren();
        this.dynamicLayer.removeChildren();
        this.quadTree.clear();
    }

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
        if (!this.initialized) return;
        this.selectionManager?.render(selectedIds, items);
    }

    createCursorVisuals(user: { name?: string; color: string; avatar?: string }) {
        return this.cursorManager?.createCursorVisuals(user);
    }

    updateRemoteCursor(id: string, x: number, y: number, user: { name?: string; color?: string; avatar?: string; tool?: string; socketId?: string }) {
        if (!this.initialized) return;
        this.cursorManager?.update(id, x, y, user);
    }

    removeRemoteCursor(id: string) {
        this.cursorManager?.remove(id);
    }

    removeRemoteUserBySocketId(socketId: string) {
        const senderId = this.cursorManager?.removeBySocketId(socketId);
        if (senderId) {
            this.remoteDrawingManager?.clearDrags(senderId);
            console.log(`[RenderManager] Removed remote user: ${senderId} (socket: ${socketId})`);
        } else {
            console.log(`[RenderManager] No senderId found for socketId: ${socketId}`);
        }
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
        this.remoteDrawingManager?.drawBatch(data);
    }

    clearRemoteDrags(senderId: string) {
        this.remoteDrawingManager?.clearDrags(senderId);
    }

    updateLocalCursor(x: number, y: number, user: any) {
        if (!this.initialized) return;

        if (!this.localCursor) {
            const colorHex = user.color || '#000000';
            const visuals = this.cursorManager?.createCursorVisuals({
                name: user.name,
                color: colorHex,
                avatar: user.avatar
            });

            if (visuals) {
                this.localCursor = visuals.container;
                visuals.arrow.visible = false;
                this.cursorLayer.addChild(this.localCursor);
            }
        }

        if (this.localCursor) {
            this.localCursor.x = x;
            this.localCursor.y = y;
            this.localCursor.visible = true;
        }
    }

    hideLocalCursor() {
        if (this.localCursor) {
            this.localCursor.visible = false;
        }
    }

    renderGhost(type: GhostType, x: number, y: number, w: number = 0, h: number = 0, data?: GhostData) {
        if (!this.initialized) return;
        this.ghostRenderer?.render(type, x, y, w, h, data);
    }

    public playStampEffect(x: number, y: number) {
        this.effectSystem?.playStampEffect(x, y);
    }

    public getStampTexture(stampType: string): PIXI.Texture | undefined {
        return this.assetManager.getStampTexture(stampType) || this.iconTextures.get(`stamp-${stampType}`);
    }

    destroy() {
        this.destroyed = true;

        // Clear managers
        this.cursorManager?.clearAll();
        this.remoteDrawingManager?.clearAll();
        this.effectSystem?.clearAll();
        this.layerManager?.destroy();

        // Destroy PixiJS app
        this.app?.ticker?.stop();
        this.app?.destroy(true, {
            children: true,
            texture: false,
        });

        // Clear references
        this.iconTextures.clear();
        this.quadTree.clear();
    }
}
