import * as PIXI from 'pixi.js';
import { WhiteboardItem } from '../store';
import { QuadTree, Rect } from '../utils/QuadTree';
import { BoundsCalculator } from '../utils/BoundsCalculator';
import { getProxiedUrl } from '../utils/urlUtils';
import { loadTexture } from '../utils/textureLoader';

/**
 * Handles rendering of whiteboard items (paths, text, images, stamps, post-its)
 */
export class ItemRenderer {
    private app: PIXI.Application;
    private staticLayer: PIXI.Container;
    private quadTree: QuadTree<WhiteboardItem & { getBounds: () => Rect }>;
    private iconTextures: Map<string, PIXI.Texture>;

    constructor(
        app: PIXI.Application,
        staticLayer: PIXI.Container,
        quadTree: QuadTree<WhiteboardItem & { getBounds: () => Rect }>,
        iconTextures: Map<string, PIXI.Texture>
    ) {
        this.app = app;
        this.staticLayer = staticLayer;
        this.quadTree = quadTree;
        this.iconTextures = iconTextures;
    }

    /**
     * Render all items
     */
    renderItems(items: Map<string, WhiteboardItem>, editingItemId?: string | null): void {
        this.quadTree.clear();

        // Proper cleanup: destroy generated textures to prevent memory leaks
        const children = this.staticLayer.removeChildren();
        children.forEach((c: any) => {
            if (c._isErasureRT) {
                c.destroy({ children: true, texture: true });
            } else {
                c.destroy({ children: true });
            }
        });

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
        rootItems.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

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
    }

    /**
     * Add a single item to the render layer
     */
    addItem(item: WhiteboardItem, isEditing: boolean = false): void {
        if (item.isDeleted) return;

        // Insert into QuadTree
        this.quadTree.insert({ ...item, getBounds: () => BoundsCalculator.getItemBounds(item) });

        if (item.type === 'path') {
            this.renderPath(item);
        } else if (item.type === 'text') {
            this.renderText(item, isEditing);
        } else if (item.type === 'image' && item.data.url) {
            this.renderImage(item);
        } else if (item.type === 'stamp') {
            this.renderStamp(item);
        } else if (item.type === 'postit') {
            this.renderPostit(item);
        }
    }

    /**
     * Render a path item
     */
    private renderPath(item: WhiteboardItem): void {
        const g = new PIXI.Graphics();
        const { points, color: itemColor, brushSize: itemBrushSize } = item.data || {};
        const drawColor = typeof itemColor === 'string' ? parseInt(itemColor.replace('#', ''), 16) : (itemColor || 0x000000);
        const drawWidth = itemBrushSize || 2;

        // Handle Eraser items
        if (itemColor === '#ffffff' || itemColor === 0xffffff || itemColor === 'eraser') {
            g.blendMode = 'erase';
        }

        if (points && points.length > 0) {
            g.moveTo(points[0].x, points[0].y);
            // Don't smooth simple shapes (< 10 points)
            if (points.length < 10) {
                points.forEach((p: any) => g.lineTo(p.x, p.y));
            } else {
                // Smooth complex freehand strokes
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

        // Calculate local center
        const bounds = BoundsCalculator.getLocalBounds(item);
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;

        const hasErasures = item.data?.erasures && item.data.erasures.length > 0;

        let content: PIXI.Container | PIXI.Graphics = g;
        const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };

        if (hasErasures) {
            content = this.createPathWithErasures(g, item, bounds) || g;
        } else {
            content.pivot.set(cx, cy);
        }

        // Position is World Center (adjusted by transform)
        content.position.set(t.x + cx, t.y + cy);
        content.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
        content.rotation = t.rotation ?? 0;

        this.staticLayer.addChild(content);
    }

    /**
     * Create path with erasure mask
     */
    private createPathWithErasures(g: PIXI.Graphics, item: WhiteboardItem, bounds: Rect): PIXI.Sprite | null {
        const boundsWidth = Math.ceil(bounds.width);
        const boundsHeight = Math.ceil(bounds.height);

        if (boundsWidth <= 0 || boundsHeight <= 0 || !this.app?.renderer) return null;

        const tempContainer = new PIXI.Container();

        // Add path shifted to local 0,0
        g.position.set(-bounds.x, -bounds.y);
        tempContainer.addChild(g);

        // Add erasures
        const eraserGraphics = new PIXI.Graphics();
        item.data.erasures.forEach((erase: any) => {
            const w = erase.size || 20;
            if (erase.points && erase.points.length > 0) {
                const points = erase.points;
                if (points.length === 1) {
                    eraserGraphics.circle(points[0].x - bounds.x, points[0].y - bounds.y, w / 2);
                    eraserGraphics.fill({ color: 0xffffff });
                } else {
                    eraserGraphics.moveTo(points[0].x - bounds.x, points[0].y - bounds.y);
                    for (let i = 1; i < points.length; i++) {
                        eraserGraphics.lineTo(points[i].x - bounds.x, points[i].y - bounds.y);
                    }
                    eraserGraphics.stroke({ width: w, color: 0xffffff, cap: 'round', join: 'round' });
                }
            }
        });
        eraserGraphics.fill({ color: 0xffffff });
        eraserGraphics.blendMode = 'erase';
        tempContainer.addChild(eraserGraphics);

        // Render to texture
        const rt = PIXI.RenderTexture.create({ width: boundsWidth, height: boundsHeight });
        this.app.renderer.render({ container: tempContainer, target: rt });

        const sprite = new PIXI.Sprite(rt);
        (sprite as any)._isErasureRT = true;

        // Pivot is center of local bounds
        const localCx = bounds.width / 2;
        const localCy = bounds.height / 2;
        sprite.pivot.set(localCx, localCy);

        return sprite;
    }

    /**
     * Render a text item
     */
    private renderText(item: WhiteboardItem, isEditing: boolean): void {
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
        if (!displayText.trim()) return;

        const pixiText = new PIXI.Text({ text: displayText, style: textStyle });
        pixiText.resolution = 2;

        const w = pixiText.width;
        const h = pixiText.height;
        const cx = w / 2;
        const cy = h / 2;

        const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };

        pixiText.pivot.set(cx, cy);
        pixiText.position.set(t.x + cx, t.y + cy);
        pixiText.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
        pixiText.rotation = t.rotation ?? 0;

        if (isEditing) {
            pixiText.visible = false;
            pixiText.alpha = 0;
        }

        this.staticLayer.addChild(pixiText);
    }

    /**
     * Render an image item
     */
    private renderImage(item: WhiteboardItem): void {
        const url = item.data.url;
        const proxiedUrl = getProxiedUrl(url);
        let texture: PIXI.Texture;

        if (PIXI.Assets.cache.has(proxiedUrl)) {
            texture = PIXI.Assets.get(proxiedUrl);
        } else {
            texture = PIXI.Texture.EMPTY;
        }

        if (!texture) texture = PIXI.Texture.EMPTY;

        const sprite = new PIXI.Sprite(texture);
        const w = item.data.width || 100;
        const h = item.data.height || 100;

        const updateSize = () => {
            if (sprite.destroyed) return;
            sprite.width = w;
            sprite.height = h;
        };

        updateSize();

        // Load texture if not cached
        if (!PIXI.Assets.cache.has(proxiedUrl)) {
            loadTexture(proxiedUrl).then((tex) => {
                if (!sprite.destroyed) {
                    sprite.texture = tex;
                    updateSize();
                    if (this.app?.render) this.app.render();
                }
            }).catch(() => { });
        }

        // Handle erasures
        const hasErasures = item.data?.erasures && item.data.erasures.length > 0;
        let content: PIXI.Container | PIXI.Sprite = sprite;

        if (hasErasures && this.app?.renderer) {
            content = this.createImageWithErasures(sprite, item, w, h) || sprite;
        }

        sprite.anchor.set(0);

        const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
        content.pivot.set(w / 2, h / 2);
        content.position.set(t.x + w / 2, t.y + h / 2);
        content.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
        content.rotation = t.rotation ?? 0;

        this.staticLayer.addChild(content);
    }

    /**
     * Create image with erasure mask
     */
    private createImageWithErasures(sprite: PIXI.Sprite, item: WhiteboardItem, w: number, h: number): PIXI.Sprite | null {
        const localBounds = sprite.getLocalBounds();
        const width = Math.ceil(localBounds.width);
        const height = Math.ceil(localBounds.height);

        if (width <= 0 || height <= 0) return null;

        const tempContainer = new PIXI.Container();

        sprite.position.set(w / 2, h / 2);
        tempContainer.addChild(sprite);

        const eraserGraphics = new PIXI.Graphics();
        item.data.erasures.forEach((erase: any) => {
            const ew = erase.size || 20;
            if (erase.points) {
                erase.points.forEach((p: any) => {
                    eraserGraphics.circle(p.x, p.y, ew / 2);
                });
            }
        });
        eraserGraphics.fill({ color: 0xffffff });
        eraserGraphics.blendMode = 'erase';
        tempContainer.addChild(eraserGraphics);

        const rt = PIXI.RenderTexture.create({ width, height });
        this.app.renderer.render({ container: tempContainer, target: rt });

        const result = new PIXI.Sprite(rt);
        (result as any)._isErasureRT = true;
        result.anchor.set(0.5);

        return result;
    }

    /**
     * Render a stamp item
     */
    private renderStamp(item: WhiteboardItem): void {
        const content = this.createStampContent(item);
        if (!content) return;

        const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
        const bounds = BoundsCalculator.getLocalBounds(item);
        const cx = bounds.width / 2;
        const cy = bounds.height / 2;

        const hasErasures = item.data?.erasures && item.data.erasures.length > 0;
        let finalContent: PIXI.Container | PIXI.Sprite = content;

        if (hasErasures && this.app?.renderer) {
            finalContent = this.createStampWithErasures(content, item, bounds, cx, cy) || content;
        }

        finalContent.pivot.set(cx, cy);
        finalContent.position.set(t.x + cx, t.y + cy);
        finalContent.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
        finalContent.rotation = t.rotation ?? 0;

        this.staticLayer.addChild(finalContent);
    }

    /**
     * Create stamp with erasure mask
     */
    private createStampWithErasures(content: PIXI.Container, item: WhiteboardItem, bounds: Rect, cx: number, cy: number): PIXI.Sprite | null {
        const tempContainer = new PIXI.Container();

        content.position.set(cx, cy);
        content.scale.set(1, 1);
        content.rotation = 0;
        tempContainer.addChild(content);

        const eraserGraphics = new PIXI.Graphics();
        item.data.erasures.forEach((erase: any) => {
            const ew = erase.size || 20;
            if (erase.points) {
                erase.points.forEach((p: any) => {
                    eraserGraphics.circle(p.x, p.y, ew / 2);
                });
            }
        });
        eraserGraphics.fill({ color: 0xffffff });
        eraserGraphics.blendMode = 'erase';
        tempContainer.addChild(eraserGraphics);

        const w = Math.ceil(bounds.width);
        const h = Math.ceil(bounds.height);

        if (w <= 0 || h <= 0) return null;

        const rt = PIXI.RenderTexture.create({ width: w, height: h });
        this.app.renderer.render({ container: tempContainer, target: rt });

        const sprite = new PIXI.Sprite(rt);
        (sprite as any)._isErasureRT = true;

        return sprite;
    }

    /**
     * Render a post-it item (without children)
     */
    private renderPostit(item: WhiteboardItem): void {
        const w = item.data?.width || 200;
        const h = item.data?.height || 200;
        const color = item.data?.color || 0xFFEB3B;

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

    /**
     * Render post-it with children in a single container
     */
    addPostitWithChildren(postit: WhiteboardItem, children: WhiteboardItem[], editingItemId?: string | null): void {
        const w = postit.data?.width || 200;
        const h = postit.data?.height || 200;
        const color = postit.data?.color || 0xFFEB3B;

        const mainContainer = new PIXI.Container();

        // Insert Post-it into QuadTree
        this.quadTree.insert({ ...postit, getBounds: () => BoundsCalculator.getItemBounds(postit) });

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

        // Content container for children (clipped)
        const contentContainer = new PIXI.Container();

        // Create clipping mask
        const mask = new PIXI.Graphics();
        mask.roundRect(0, 0, w, h, 4);
        mask.fill({ color: 0xffffff });
        mainContainer.addChild(mask);
        contentContainer.mask = mask;

        // Render children
        children.forEach(child => {
            if (child.isDeleted) return;

            this.quadTree.insert({ ...child, getBounds: () => BoundsCalculator.getItemBounds(child) });

            const childContent = this.createItemContent(child, child.id === editingItemId);
            if (childContent) {
                contentContainer.addChild(childContent);
            }
        });

        mainContainer.addChild(contentContainer);

        // Corner fold (on top of children)
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

        // Apply Post-it transforms
        const t = postit.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
        mainContainer.pivot.set(w / 2, h / 2);
        mainContainer.position.set(t.x + w / 2, t.y + h / 2);
        mainContainer.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
        mainContainer.rotation = t.rotation ?? 0;

        this.staticLayer.addChild(mainContainer);
    }

    /**
     * Create content for an item (used for child items)
     */
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
        return null;
    }

    /**
     * Create path content for nested items
     */
    private createPathContent(item: WhiteboardItem): PIXI.Container | null {
        const g = new PIXI.Graphics();
        const { points, color: itemColor, brushSize: itemBrushSize } = item.data || {};
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

        const lb = BoundsCalculator.getLocalBounds(item);
        const cx = lb.x + lb.width / 2;
        const cy = lb.y + lb.height / 2;
        const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };

        g.pivot.set(cx, cy);
        g.position.set(t.x + cx, t.y + cy);
        g.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);
        g.rotation = t.rotation ?? 0;

        return g;
    }

    /**
     * Create text content for nested items
     */
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

    /**
     * Create image content for nested items
     */
    private createImageContent(item: WhiteboardItem): PIXI.Container | null {
        const url = item.data?.url;
        if (!url) return null;

        const proxiedUrl = getProxiedUrl(url);
        let texture: PIXI.Texture;

        if (PIXI.Assets.cache.has(proxiedUrl)) {
            texture = PIXI.Assets.get(proxiedUrl);
        } else {
            texture = PIXI.Texture.EMPTY;
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

    /**
     * Create stamp content
     */
    createStampContent(item: WhiteboardItem): PIXI.Container | null {
        const stampType = item.data?.stampType || 'thumbs-up';
        const cacheKey = `stamp-${stampType}`;
        const texture = this.iconTextures.get(cacheKey);

        if (!texture) {
            console.warn(`[ItemRenderer] Missing texture for stamp: ${stampType}`);
            return null;
        }

        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5);

        const w = item.data?.width || 200;
        const h = item.data?.height || 200;

        const safeW = w || 50;
        const safeH = h || 50;

        sprite.width = safeW;
        sprite.height = safeH;

        const container = new PIXI.Container();

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

    /**
     * Clear all layers
     */
    clearLayers(): void {
        this.staticLayer.removeChildren();
        this.quadTree.clear();
    }

    /**
     * Update icon textures reference
     */
    setIconTextures(textures: Map<string, PIXI.Texture>): void {
        this.iconTextures = textures;
    }
}
