import { useRef, useCallback, useEffect } from 'react';
import * as PIXI from 'pixi.js';
import { v4 as uuidv4 } from 'uuid';
import { useWhiteboardStore, WhiteboardItem as StoreItem } from '../store';
import { RenderManager } from '../RenderManager';
import { simplifyPoints } from '../utils/simplifyPoints';
import { OneEuroFilter } from '../utils/oneEuroFilter';
import { detectShape } from '../utils/shapeRecognition';
import { useWhiteboardSync } from './useWhiteboardSync';
import { Point } from '../types';
import { useParams } from 'next/navigation';
import { throttle } from '../utils/throttle';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useWhiteboardDrawing(renderManager: RenderManager | null) {
    const params = useParams();
    const meetingId = params.meetingId as string;
    const { broadcastEvent, broadcastCursor } = useWhiteboardSync(renderManager);

    const {
        tool, color: colorStr, penSize, eraserSize, zoom, pan, addItem
    } = useWhiteboardStore();

    // Stable State Ref
    const stateRef = useRef({ tool, colorStr, penSize, eraserSize, zoom, pan });
    useEffect(() => {
        stateRef.current = { tool, colorStr, penSize, eraserSize, zoom, pan };
    }, [tool, colorStr, penSize, eraserSize, zoom, pan]);

    const isDrawing = useRef(false);
    const currentPath = useRef<Point[]>([]);
    const currentGraphics = useRef<PIXI.Graphics | null>(null);
    const glowGraphics = useRef<PIXI.Graphics | null>(null); // For Magic Pen effect
    const lastRenderedIndex = useRef(0); // Track which points we've already rendered

    // Filters for Jitter Reduction
    const filterX = useRef(new OneEuroFilter(1.0, 0.23));
    const filterY = useRef(new OneEuroFilter(1.0, 0.23));

    const broadcastCursorRef = useRef(broadcastCursor);
    useEffect(() => {
        broadcastCursorRef.current = broadcastCursor;
    }, [broadcastCursor]);

    const throttledBroadcast = useRef(throttle((x: number, y: number, t: string) => {
        broadcastCursorRef.current(x, y, t);
    }, 50)).current;

    const getLocalPoint = useCallback((e: PointerEvent) => {
        if (!renderManager) return { x: 0, y: 0 };
        const rect = renderManager.app.canvas.getBoundingClientRect();
        const { pan: currentPan, zoom: currentZoom } = stateRef.current;
        return {
            x: (e.clientX - rect.left - currentPan.x) / currentZoom,
            y: (e.clientY - rect.top - currentPan.y) / currentZoom
        };
    }, [renderManager]);

    const onPointerDown = useCallback((e: PointerEvent) => {
        if (!renderManager) return;
        const { tool: currentTool, colorStr: currentColorStr } = stateRef.current;
        if (currentTool !== 'pen' && currentTool !== 'magic-pen' && currentTool !== 'eraser') return;

        isDrawing.current = true;
        currentPath.current = [];
        lastRenderedIndex.current = 0;

        filterX.current.reset();
        filterY.current.reset();

        const point = getLocalPoint(e);
        currentPath.current.push(point);
        filterX.current.filter(point.x);
        filterY.current.filter(point.y);

        // Create graphics that will be ADDED TO STATIC LAYER for real-time rendering
        const g = new PIXI.Graphics();
        renderManager.staticLayer.addChild(g);
        currentGraphics.current = g;

        if (currentTool === 'eraser') {
            g.blendMode = 'erase';
        } else if (currentTool === 'magic-pen') {
            // Magic Pen Effect: Create a secondary glow graphics layer
            const glow = new PIXI.Graphics();
            glow.filters = [new PIXI.BlurFilter(8)]; // Glow effect
            // Insert glow behind the main stroke if possible, or just add it
            // Adding it first to staticLayer makes it appear behind if we didn't add g yet, 
            // but we added g. Let's add glow before g?
            // renderManager.staticLayer.addChildAt(glow, renderManager.staticLayer.getChildIndex(g));
            // Simply adding it to staticLayer works.
            renderManager.staticLayer.addChild(glow);
            glowGraphics.current = glow;
        }
    }, [renderManager, getLocalPoint]);

    const onPointerMove = useCallback((e: PointerEvent) => {
        if (!isDrawing.current || !renderManager || !currentGraphics.current) return;

        const { tool: currentTool, zoom: currentZoom, colorStr: currentColorStr, penSize: currentPenSize, eraserSize: currentEraserSize } = stateRef.current;
        const rawPoint = getLocalPoint(e);
        const x = filterX.current.filter(rawPoint.x);
        const y = filterY.current.filter(rawPoint.y);
        const point = { x, y };

        const lastPoint = currentPath.current[currentPath.current.length - 1];
        const dist = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
        if (dist < 1 / currentZoom) return;

        currentPath.current.push(point);
        throttledBroadcast(point.x, point.y, currentTool);

        const g = currentGraphics.current;
        const glow = glowGraphics.current;

        const color = parseInt(currentColorStr.replace('#', ''), 16);
        const width = (currentTool === 'eraser' ? currentEraserSize : currentPenSize) / currentZoom;

        // PROGRESSIVE RENDERING: Draw only the NEW segment from last rendered point
        const startIdx = lastRenderedIndex.current;
        const newPoints = currentPath.current.slice(startIdx);

        if (newPoints.length >= 2) {
            // Draw the new segment
            const p1 = newPoints[0];

            // Draw Main Stroke
            g.moveTo(p1.x, p1.y);
            for (let i = 1; i < newPoints.length; i++) {
                g.lineTo(newPoints[i].x, newPoints[i].y);
            }
            if (currentTool === 'eraser') {
                g.stroke({ width, color: 0xffffff, cap: 'round', join: 'round' });
            } else {
                g.stroke({ width, color, cap: 'round', join: 'round' });
            }

            // Draw Magic Pen Glow
            if (currentTool === 'magic-pen' && glow) {
                glow.moveTo(p1.x, p1.y);
                for (let i = 1; i < newPoints.length; i++) {
                    glow.lineTo(newPoints[i].x, newPoints[i].y);
                }
                // Glow uses same color but wider and possibly lighter/different? 
                // Let's use the same color with blur filter applied to the graphics container.
                // We just draw a thicker line here.
                glow.stroke({ width: width + 10 / currentZoom, color, alpha: 0.6, cap: 'round', join: 'round' });
            }

            lastRenderedIndex.current = currentPath.current.length - 1;
        }
    }, [renderManager, getLocalPoint, throttledBroadcast]);

    const onPointerUp = useCallback((e: PointerEvent) => {
        if (!isDrawing.current || !renderManager) return;
        isDrawing.current = false;

        const { tool: currentTool, colorStr: currentColorStr, penSize: currentPenSize, eraserSize: currentEraserSize, zoom: currentZoom } = stateRef.current;
        const points = currentPath.current;

        // Cleanup Glow immediately
        if (glowGraphics.current) {
            glowGraphics.current.destroy();
            glowGraphics.current = null;
        }

        if (points.length >= 1) {
            let finalPoints = points;
            let isRecognized = false;

            if (currentTool === 'magic-pen') {
                // Magic Pen Logic
                const result = detectShape(points);

                // Requirements:
                // 1. If shape detected -> Use corrected shape.
                // 2. If NO shape detected -> Disappear immediately. Do NOT add to history.

                if (result.type !== 'none' && result.correctedPoints) {
                    finalPoints = result.correctedPoints;
                    isRecognized = true;

                    // Redraw with perfect shape (optional visual feedback before finalize)
                    if (currentGraphics.current) {
                        currentGraphics.current.clear();
                        const g = currentGraphics.current;
                        const color = parseInt(currentColorStr.replace('#', ''), 16);
                        const width = currentPenSize / currentZoom;

                        g.moveTo(finalPoints[0].x, finalPoints[0].y);
                        for (let i = 1; i < finalPoints.length; i++) {
                            g.lineTo(finalPoints[i].x, finalPoints[i].y);
                        }
                        g.stroke({ width, color, cap: 'round', join: 'round' });
                    }
                } else {
                    // NO SHAPE DETECTED
                    // Discard everything.
                    if (currentGraphics.current) {
                        currentGraphics.current.destroy();
                        currentGraphics.current = null;
                    }
                    // Force re-render to clear the static layer junk from screen if any remains (though destroy should handle it)
                    renderManager.renderItems(useWhiteboardStore.getState().items);
                    return; // EARLY RETURN - Do not add item, do not save.
                }
            }

            const simplified = simplifyPoints(finalPoints, 0.5 / currentZoom);
            const newItem: StoreItem = {
                id: uuidv4(),
                type: 'path',
                data: {
                    points: simplified,
                    color: currentTool === 'eraser' ? '#ffffff' : currentColorStr,
                    brushSize: (currentTool === 'eraser' ? currentEraserSize : currentPenSize) / currentZoom  // Save world-space size
                },
                transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
                zIndex: Date.now()
            };

            addItem(newItem);
            // Disabled: Chime has 2KB limit, items can exceed this
            // broadcastEvent('add_item', newItem);

            fetch(`${API_URL}/api/whiteboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newItem, meetingId, userId: 'local-user' }),
                credentials: 'include'
            }).catch(err => console.error("Failed to persist item", err));
        }

        // Clean up: Remove the progressive graphics since it's now in the store and will be re-rendered
        if (currentGraphics.current) {
            currentGraphics.current.destroy();
            currentGraphics.current = null;
        }

        // Force re-render from store to update with smoothed/final version
        if (renderManager) {
            const items = useWhiteboardStore.getState().items;
            renderManager.renderItems(items);
        }
    }, [renderManager, addItem, meetingId, broadcastEvent]);

    useEffect(() => {
        if (!renderManager) return;
        const canvas = renderManager.app.canvas;
        canvas.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        return () => {
            canvas.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [renderManager, onPointerDown, onPointerMove, onPointerUp]);
}
