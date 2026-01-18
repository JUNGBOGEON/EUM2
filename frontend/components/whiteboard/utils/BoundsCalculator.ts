import { WhiteboardItem } from '../store';
import { Rect } from './QuadTree';

/**
 * Utility class for calculating bounds of whiteboard items
 */
export class BoundsCalculator {
    private static readonly MAX_TEXT_WIDTH = 376; // Matches PixiJS wordWrapWidth

    /**
     * Get local bounds of an item (before transform is applied)
     */
    static getLocalBounds(item: WhiteboardItem): Rect {
        const { points } = item.data || {};
        const drawPoints = Array.isArray(item.data) ? item.data : points;

        if (item.type === 'path' && drawPoints && drawPoints.length > 0) {
            return this.getPathBounds(drawPoints);
        }

        if (item.type === 'image') {
            const w = item.data?.width || 100;
            const h = item.data?.height || 100;
            return { x: 0, y: 0, width: w, height: h };
        }

        if (item.type === 'text') {
            return this.getTextBounds(item);
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

    /**
     * Get world bounds of an item (with transform applied)
     */
    static getItemBounds(item: WhiteboardItem): Rect {
        const local = this.getLocalBounds(item);
        const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
        return {
            x: local.x + t.x,
            y: local.y + t.y,
            width: local.width * (t.scaleX ?? 1),
            height: local.height * (t.scaleY ?? 1)
        };
    }

    /**
     * Calculate bounds for path items
     */
    private static getPathBounds(points: { x: number; y: number }[]): Rect {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        points.forEach((p: { x: number; y: number }) => {
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

    /**
     * Calculate bounds for text items with word wrapping
     */
    private static getTextBounds(item: WhiteboardItem): Rect {
        const fontSize = item.data?.fontSize || 24;
        const fontFamily = item.data?.fontFamily || 'Arial, sans-serif';
        const text = item.data?.text || '';
        const lineHeight = fontSize * 1.4;

        if (!text.trim()) {
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
                totalHeight += lineHeight;
                continue;
            }

            const linePixelWidth = ctx.measureText(explicitLine).width;

            if (linePixelWidth <= this.MAX_TEXT_WIDTH) {
                maxWidth = Math.max(maxWidth, linePixelWidth);
                totalHeight += lineHeight;
            } else {
                const result = this.measureWrappedLine(ctx, explicitLine, lineHeight);
                maxWidth = Math.max(maxWidth, result.maxWidth);
                totalHeight += result.totalHeight;
            }
        }

        return {
            x: 0,
            y: 0,
            width: item.data?.width || Math.max(50, Math.min(maxWidth, this.MAX_TEXT_WIDTH)),
            height: item.data?.height || Math.max(fontSize, totalHeight)
        };
    }

    /**
     * Measure a line that needs word wrapping
     */
    private static measureWrappedLine(
        ctx: CanvasRenderingContext2D,
        line: string,
        lineHeight: number
    ): { maxWidth: number; totalHeight: number } {
        let totalHeight = 0;
        let maxWidth = 0;
        let currentLine = '';
        let currentWidth = 0;
        const words = line.split(/(\s+)/);

        for (const word of words) {
            const wordWidth = ctx.measureText(word).width;

            if (currentWidth + wordWidth <= this.MAX_TEXT_WIDTH) {
                currentLine += word;
                currentWidth += wordWidth;
            } else {
                if (currentLine.length > 0) {
                    maxWidth = Math.max(maxWidth, currentWidth);
                    totalHeight += lineHeight;
                }

                // Handle words longer than MAX_WIDTH
                if (wordWidth > this.MAX_TEXT_WIDTH && word.trim().length > 0) {
                    const charResult = this.measureCharByChar(ctx, word, lineHeight);
                    maxWidth = Math.max(maxWidth, charResult.maxWidth);
                    totalHeight += charResult.totalHeight;
                    currentLine = charResult.remainingLine;
                    currentWidth = charResult.remainingWidth;
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

        return { maxWidth, totalHeight };
    }

    /**
     * Break word character by character when it exceeds MAX_WIDTH
     */
    private static measureCharByChar(
        ctx: CanvasRenderingContext2D,
        word: string,
        lineHeight: number
    ): { maxWidth: number; totalHeight: number; remainingLine: string; remainingWidth: number } {
        let totalHeight = 0;
        let maxWidth = 0;
        let charLine = '';
        let charWidth = 0;

        for (const char of word) {
            const charW = ctx.measureText(char).width;
            if (charWidth + charW <= this.MAX_TEXT_WIDTH) {
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

        return {
            maxWidth,
            totalHeight,
            remainingLine: charLine,
            remainingWidth: charWidth
        };
    }
}
