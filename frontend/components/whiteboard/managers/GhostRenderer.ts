import * as PIXI from 'pixi.js';
import { GhostType, GhostData } from '../types/render-types';
import { loadTexture } from '../utils/textureLoader';
import { getProxiedUrl } from '../utils/urlUtils';

/**
 * Manages ghost/preview rendering for images, post-its, and stamps
 */
export class GhostRenderer {
    private ghostLayer: PIXI.Container;
    private iconTextures: Map<string, PIXI.Texture>;
    private ghostSprite: PIXI.Sprite | null = null;

    constructor(ghostLayer: PIXI.Container, iconTextures: Map<string, PIXI.Texture>) {
        this.ghostLayer = ghostLayer;
        this.iconTextures = iconTextures;
        this.ghostLayer.eventMode = 'none';
    }

    /**
     * Render a ghost preview at the specified position
     */
    render(
        type: GhostType,
        x: number,
        y: number,
        w: number = 0,
        h: number = 0,
        data?: GhostData
    ): void {
        // Clear existing children from ghostLayer first (for Post-it graphics)
        this.ghostLayer.removeChildren();

        if (!type) {
            if (this.ghostSprite) {
                this.ghostSprite.visible = false;
            }
            return;
        }

        if (type === 'image') {
            this.renderImageGhost(x, y, w, h, data?.url);
        } else if (type === 'postit') {
            this.renderPostitGhost(x, y, w, h);
        } else if (type === 'stamp') {
            this.renderStampGhost(x, y, w, h, data?.stampType);
        }
    }

    /**
     * Render image ghost preview
     */
    private renderImageGhost(x: number, y: number, w: number, h: number, url?: string): void {
        if (!this.ghostSprite) {
            this.ghostSprite = new PIXI.Sprite();
            this.ghostSprite.anchor.set(0.5);
            this.ghostLayer.addChild(this.ghostSprite);
        } else {
            if (this.ghostSprite.parent !== this.ghostLayer) {
                this.ghostLayer.addChild(this.ghostSprite);
            }
        }

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
    }

    /**
     * Render post-it ghost preview
     */
    private renderPostitGhost(x: number, y: number, w: number, h: number): void {
        if (this.ghostSprite) this.ghostSprite.visible = false;

        const g = new PIXI.Graphics();
        const halfW = w / 2;
        const halfH = h / 2;

        // Shadow
        g.rect(-halfW + 4, -halfH + 4, w, h);
        g.fill({ color: 0x000000, alpha: 0.1 });

        // Post-it body
        g.rect(-halfW, -halfH, w, h);
        g.fill({ color: 0xFFEB3B, alpha: 0.6 });
        g.stroke({ width: 2, color: 0xFFC107, alpha: 0.8 });

        this.ghostLayer.addChild(g);
        this.ghostLayer.position.set(x, y);
    }

    /**
     * Render stamp ghost preview
     */
    private renderStampGhost(x: number, y: number, w: number, h: number, stampType?: string): void {
        if (this.ghostSprite) this.ghostSprite.visible = false;

        if (!this.ghostSprite) {
            this.ghostSprite = new PIXI.Sprite();
            this.ghostSprite.anchor.set(0.5);
            this.ghostLayer.addChild(this.ghostSprite);
        } else {
            if (this.ghostSprite.parent !== this.ghostLayer) {
                this.ghostLayer.addChild(this.ghostSprite);
            }
        }

        const type = stampType || 'thumbs-up';
        const cacheKey = `stamp-${type}`;
        const texture = this.iconTextures.get(cacheKey);

        if (texture) {
            this.ghostSprite.texture = texture;
            this.ghostSprite.visible = true;
            this.ghostSprite.alpha = 0.6;
            this.ghostSprite.x = x;
            this.ghostSprite.y = y;
            // Use texture size or default if w/h not provided (preview mode)
            this.ghostSprite.width = w || texture.width || 80;
            this.ghostSprite.height = h || texture.height || 80;
        }
    }

    /**
     * Hide all ghost visuals
     */
    hide(): void {
        this.ghostLayer.removeChildren();
        if (this.ghostSprite) {
            this.ghostSprite.visible = false;
        }
    }

    /**
     * Update icon textures reference (for dynamic loading)
     */
    setIconTextures(textures: Map<string, PIXI.Texture>): void {
        this.iconTextures = textures;
    }
}
