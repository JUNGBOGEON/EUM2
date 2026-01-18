import * as PIXI from 'pixi.js';
import { WhiteboardItem } from '../store';
import { SelectionOverride, Rect } from '../types/render-types';
import { BoundsCalculator } from '../utils/BoundsCalculator';

/**
 * Manages selection box rendering for whiteboard items
 */
export class SelectionManager {
    private selectionLayer: PIXI.Container;
    private selectionOverride: SelectionOverride | null = null;
    private currentZoom: number = 1;

    constructor(selectionLayer: PIXI.Container) {
        this.selectionLayer = selectionLayer;
        this.selectionLayer.eventMode = 'none';
    }

    /**
     * Set the current zoom level for handle sizing
     */
    setZoom(zoom: number): void {
        this.currentZoom = zoom;
    }

    /**
     * Set override selection box (used during drag operations)
     */
    setOverride(override: SelectionOverride | null): void {
        this.selectionOverride = override;

        if (this.selectionOverride) {
            this.drawSelectionBox(
                this.selectionOverride.cx,
                this.selectionOverride.cy,
                this.selectionOverride.w,
                this.selectionOverride.h,
                this.selectionOverride.rotation
            );
        }
    }

    /**
     * Get current selection override
     */
    getOverride(): SelectionOverride | null {
        return this.selectionOverride;
    }

    /**
     * Render selection for selected items
     */
    render(selectedIds: Set<string>, items: Map<string, WhiteboardItem>): void {
        if (this.selectionOverride) return;

        this.selectionLayer.removeChildren();
        if (selectedIds.size === 0) return;

        // Single selection: rotate with item
        if (selectedIds.size === 1) {
            this.renderSingleSelection(selectedIds, items);
            return;
        }

        // Multiple selection: check for common rotation
        this.renderMultipleSelection(selectedIds, items);
    }

    /**
     * Render selection box for a single item
     */
    private renderSingleSelection(selectedIds: Set<string>, items: Map<string, WhiteboardItem>): void {
        const id = Array.from(selectedIds)[0];
        const item = items.get(id);
        if (!item) return;

        const b = BoundsCalculator.getLocalBounds(item);
        const sx = item.transform.scaleX || 1;
        const sy = item.transform.scaleY || 1;

        const w = b.width * sx;
        const h = b.height * sy;

        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const worldCenterX = item.transform.x + cx;
        const worldCenterY = item.transform.y + cy;

        this.drawSelectionBox(worldCenterX, worldCenterY, w, h, item.transform.rotation || 0);
    }

    /**
     * Render selection box for multiple items
     */
    private renderMultipleSelection(selectedIds: Set<string>, items: Map<string, WhiteboardItem>): void {
        // Check for common rotation
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
                    if (diff > 0.1) { // ~5.7 degrees tolerance
                        isCommon = false;
                    }
                }
            }
        });

        if (isCommon && commonRotation !== null && selectedItems.length > 0) {
            this.renderOBBSelection(selectedItems, commonRotation);
            return;
        }

        // Fallback to AABB
        this.renderAABBSelection(selectedItems);
    }

    /**
     * Render Oriented Bounding Box (OBB) selection for items with common rotation
     */
    private renderOBBSelection(selectedItems: WhiteboardItem[], commonRotation: number): void {
        const cos = Math.cos(-commonRotation);
        const sin = Math.sin(-commonRotation);

        let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;

        selectedItems.forEach(item => {
            const b = BoundsCalculator.getLocalBounds(item);
            const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1 };

            const cx = b.x + b.width / 2;
            const cy = b.y + b.height / 2;
            const wcX = t.x + cx;
            const wcY = t.y + cy;

            const hw = (b.width * (t.scaleX || 1)) / 2;
            const hh = (b.height * (t.scaleY || 1)) / 2;

            // Project world center onto common axes
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

        // Rotate center back to world coordinates
        const rCos = Math.cos(commonRotation);
        const rSin = Math.sin(commonRotation);

        const worldCx = centerU * rCos - centerV * rSin;
        const worldCy = centerU * rSin + centerV * rCos;

        this.drawSelectionBox(worldCx, worldCy, w, h, commonRotation);
    }

    /**
     * Render Axis-Aligned Bounding Box (AABB) selection
     */
    private renderAABBSelection(selectedItems: WhiteboardItem[]): void {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasSelection = false;

        selectedItems.forEach(item => {
            const b = BoundsCalculator.getLocalBounds(item);

            const sx = item.transform.scaleX || 1;
            const sy = item.transform.scaleY || 1;
            const cx = b.x + b.width / 2;
            const cy = b.y + b.height / 2;

            const worldCenterX = item.transform.x + cx;
            const worldCenterY = item.transform.y + cy;

            const rot = item.transform.rotation || 0;
            const iCos = Math.cos(rot);
            const iSin = Math.sin(rot);
            const hw = (b.width * sx) / 2;
            const hh = (b.height * sy) / 2;

            // Corners relative to world center
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

    /**
     * Draw the selection box with handles
     */
    private drawSelectionBox(cx: number, cy: number, w: number, h: number, rotation: number): void {
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

        // Side handles
        const t = rotate(0, -halfH);
        const b = rotate(0, halfH);
        const l = rotate(-halfW, 0);
        const r = rotate(halfW, 0);

        // Box frame
        g.moveTo(tl.x, tl.y);
        g.lineTo(tr.x, tr.y);
        g.lineTo(br.x, br.y);
        g.lineTo(bl.x, bl.y);
        g.lineTo(tl.x, tl.y);

        g.stroke({ width: 1 / this.currentZoom, color: 0x00A3FF, alpha: 0.8 });

        // Handles (constant screen size)
        const hSize = 5 / this.currentZoom;
        const strokeWidth = 1.5 / this.currentZoom;
        const handleStyle = { width: strokeWidth, color: 0x00A3FF };
        const fillStyle = 0xffffff;

        // Corner handles
        g.circle(tl.x, tl.y, hSize).fill(fillStyle).stroke(handleStyle);
        g.circle(tr.x, tr.y, hSize).fill(fillStyle).stroke(handleStyle);
        g.circle(br.x, br.y, hSize).fill(fillStyle).stroke(handleStyle);
        g.circle(bl.x, bl.y, hSize).fill(fillStyle).stroke(handleStyle);

        // Side handles (only if large enough)
        if (w > 20 / this.currentZoom && h > 20 / this.currentZoom) {
            g.circle(t.x, t.y, hSize).fill(fillStyle).stroke(handleStyle);
            g.circle(b.x, b.y, hSize).fill(fillStyle).stroke(handleStyle);
            g.circle(l.x, l.y, hSize).fill(fillStyle).stroke(handleStyle);
            g.circle(r.x, r.y, hSize).fill(fillStyle).stroke(handleStyle);
        }

        // Rotation handle (top center, extended)
        if (h > 40 / this.currentZoom) {
            const topCenter = rotate(0, -halfH - (24 / this.currentZoom));
            g.moveTo(t.x, t.y);
            g.lineTo(topCenter.x, topCenter.y);
            g.stroke({ width: 1 / this.currentZoom, color: 0x00A3FF, alpha: 0.8 });

            g.circle(topCenter.x, topCenter.y, hSize).fill(fillStyle).stroke(handleStyle);
        }

        this.selectionLayer.addChild(g);
    }

    /**
     * Clear selection layer
     */
    clear(): void {
        this.selectionLayer.removeChildren();
        this.selectionOverride = null;
    }
}
