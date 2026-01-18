import * as PIXI from 'pixi.js';
import { DrawBatchData } from '../types/render-types';

/**
 * Manages real-time remote drawing synchronization
 */
export class RemoteDrawingManager {
    private dynamicLayer: PIXI.Container;
    private remoteGraphics: Map<string, PIXI.Graphics> = new Map();

    constructor(dynamicLayer: PIXI.Container) {
        this.dynamicLayer = dynamicLayer;
    }

    /**
     * Draw a batch of points from a remote user's stroke
     * Used for real-time drawing synchronization
     */
    drawBatch(data: DrawBatchData): void {
        const { senderId, points, color, width, tool } = data;

        // Get or create graphics for this sender
        let graphics = this.remoteGraphics.get(senderId);
        if (!graphics) {
            graphics = new PIXI.Graphics();
            this.dynamicLayer.addChild(graphics);
            this.remoteGraphics.set(senderId, graphics);
        }

        if (points.length < 2) return;

        // Draw the incoming points as a continuous stroke
        if (tool === 'eraser') {
            // Eraser visualization (semi-transparent cyan)
            graphics.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                graphics.lineTo(points[i].x, points[i].y);
            }
            graphics.stroke({ width, color: 0x00FFFF, alpha: 0.3, cap: 'round', join: 'round' });
        } else {
            // Pen / Magic-Pen
            graphics.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                graphics.lineTo(points[i].x, points[i].y);
            }
            graphics.stroke({ width, color, cap: 'round', join: 'round' });
        }
    }

    /**
     * Clear the temporary remote drawing graphics for a specific user
     * Called when their add_item event is received (stroke finalized)
     */
    clearDrags(senderId: string): void {
        const graphics = this.remoteGraphics.get(senderId);
        if (graphics) {
            graphics.clear();
        }
    }

    /**
     * Remove all graphics for a specific user
     * Called when user disconnects
     */
    removeUser(senderId: string): void {
        const graphics = this.remoteGraphics.get(senderId);
        if (graphics) {
            graphics.destroy();
            this.remoteGraphics.delete(senderId);
        }
    }

    /**
     * Clear all remote graphics
     */
    clearAll(): void {
        this.remoteGraphics.forEach(graphics => {
            graphics.destroy();
        });
        this.remoteGraphics.clear();
    }

    /**
     * Get the number of active remote drawers
     */
    get activeCount(): number {
        return this.remoteGraphics.size;
    }
}
