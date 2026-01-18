import * as PIXI from 'pixi.js';
import { RemoteCursorUser, CursorVisuals, USER_COLOR_PALETTE } from '../types/render-types';
import { getProxiedUrl } from '../utils/urlUtils';

/**
 * Manages remote user cursors with interpolation
 */
export class CursorManager {
    private cursorLayer: PIXI.Container;
    private iconTextures: Map<string, PIXI.Texture>;

    private remoteCursors: Map<string, PIXI.Container> = new Map();
    private remoteCursorTargets: Map<string, { x: number; y: number }> = new Map();
    private socketToSender: Map<string, string> = new Map();
    private userColors: Map<string, number> = new Map();
    private colorPalette: number[];

    constructor(
        cursorLayer: PIXI.Container,
        iconTextures: Map<string, PIXI.Texture>,
        colorPalette: number[] = USER_COLOR_PALETTE
    ) {
        this.cursorLayer = cursorLayer;
        this.iconTextures = iconTextures;
        this.colorPalette = colorPalette;
        this.cursorLayer.eventMode = 'none';
    }

    /**
     * Interpolate cursor positions for smooth movement (called from ticker)
     */
    tick(lerpFactor: number = 0.25): void {
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

    /**
     * Update or create a remote cursor
     */
    update(id: string, x: number, y: number, user: RemoteCursorUser): void {
        // Store socketId -> senderId mapping for cleanup when user disconnects
        if (user.socketId) {
            this.socketToSender.set(user.socketId, id);
        }

        let cursor = this.remoteCursors.get(id);

        if (!cursor) {
            // Assign color if new
            let color = this.userColors.get(id);
            if (!color) {
                color = this.colorPalette[this.userColors.size % this.colorPalette.length];
                this.userColors.set(id, color);
            }

            // Convert color number to hex string
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

            // Store reference to components for updates
            (cursor as any).meta = visuals;
        }

        // Update target for interpolation
        this.remoteCursorTargets.set(id, { x, y });

        // Update tool icon if changed
        this.updateToolIcon(cursor, id, user.tool);
    }

    /**
     * Update the tool icon on a cursor
     */
    private updateToolIcon(cursor: PIXI.Container, id: string, tool?: string): void {
        const meta = (cursor as any).meta;
        if (!meta || tool === undefined || tool === (cursor as any).currentTool) {
            return;
        }

        (cursor as any).currentTool = tool;
        const tex = this.iconTextures.get(tool);

        const badge = meta.badge as PIXI.Container;
        const nameText = meta.nameText as PIXI.Text;
        const bg = meta.bg as PIXI.Graphics;

        // Clean up old icon
        if ((cursor as any).iconSprite) {
            badge.removeChild((cursor as any).iconSprite);
            (cursor as any).iconSprite = null;
        }

        if (tex) {
            const iconSprite = new PIXI.Sprite(tex);
            iconSprite.width = 16;
            iconSprite.height = 16;
            iconSprite.tint = 0xffffff;

            const nameRight = nameText.x + nameText.width;
            iconSprite.position.set(nameRight + 6, 4);

            badge.addChild(iconSprite);
            (cursor as any).iconSprite = iconSprite;

            // Update background width
            const padding = 8;
            const newWidth = iconSprite.x + iconSprite.width + padding;
            const boxHeight = 24 + padding;
            const color = this.userColors.get(id) || 0x000000;

            bg.clear();
            bg.roundRect(0, 0, newWidth, boxHeight, 4).fill({ color });
        } else {
            // Tool removed or non-icon tool - restore original width
            const padding = 8;
            const newWidth = nameText.x + nameText.width + padding;
            const boxHeight = 24 + padding;
            const color = this.userColors.get(id) || 0x000000;

            bg.clear();
            bg.roundRect(0, 0, newWidth, boxHeight, 4).fill({ color });
        }
    }

    /**
     * Create cursor visuals (arrow + badge)
     */
    createCursorVisuals(user: { name?: string; color: string; avatar?: string }): CursorVisuals {
        const cursorContainer = new PIXI.Container();

        // Arrow pointer
        const arrowG = new PIXI.Graphics();
        arrowG.fill({ color: user.color });
        arrowG.moveTo(0, 0);
        arrowG.lineTo(0, 16);
        arrowG.lineTo(4, 12);
        arrowG.lineTo(9, 22);
        arrowG.lineTo(11, 21);
        arrowG.lineTo(6, 11);
        arrowG.lineTo(12, 11);
        arrowG.closePath();

        arrowG.rotation = -0.2;
        arrowG.scale.set(1.2);
        arrowG.stroke({ width: 1, color: 0xffffff });

        // Badge container
        const badgeContainer = new PIXI.Container();
        badgeContainer.position.set(16, 16);

        const nameText = new PIXI.Text({
            text: user.name || 'Anonymous',
            style: {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0xffffff,
                fontWeight: 'bold',
            }
        });
        nameText.resolution = 2;

        // Avatar (if provided)
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

                badgeContainer.addChildAt(sprite, 1);
                badgeContainer.addChild(mask);
            }).catch(() => { });
        }

        // Background box
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

    /**
     * Remove a remote cursor by ID
     */
    remove(id: string): void {
        const cursor = this.remoteCursors.get(id);
        if (cursor) {
            this.cursorLayer.removeChild(cursor);
            cursor.destroy({ children: true });
            this.remoteCursors.delete(id);
            this.remoteCursorTargets.delete(id);
        }
    }

    /**
     * Remove a user by their socket ID
     */
    removeBySocketId(socketId: string): string | undefined {
        const senderId = this.socketToSender.get(socketId);
        if (!senderId) {
            return undefined;
        }

        this.remove(senderId);
        this.socketToSender.delete(socketId);
        this.userColors.delete(senderId);

        return senderId;
    }

    /**
     * Get the senderId for a socketId
     */
    getSenderIdBySocket(socketId: string): string | undefined {
        return this.socketToSender.get(socketId);
    }

    /**
     * Remove color assignment for a user
     */
    removeUserColor(senderId: string): void {
        this.userColors.delete(senderId);
    }

    /**
     * Get color for a user
     */
    getUserColor(id: string): number | undefined {
        return this.userColors.get(id);
    }

    /**
     * Clear all cursors
     */
    clearAll(): void {
        this.remoteCursors.forEach(cursor => {
            cursor.destroy({ children: true });
        });
        this.remoteCursors.clear();
        this.remoteCursorTargets.clear();
        this.socketToSender.clear();
        this.userColors.clear();
    }

    /**
     * Get active cursor count
     */
    get activeCount(): number {
        return this.remoteCursors.size;
    }

    /**
     * Update icon textures reference
     */
    setIconTextures(textures: Map<string, PIXI.Texture>): void {
        this.iconTextures = textures;
    }
}
