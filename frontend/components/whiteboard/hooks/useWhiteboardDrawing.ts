import { useRef, useCallback, useEffect } from 'react';
import * as PIXI from 'pixi.js';
import { v4 as uuidv4 } from 'uuid';
import { useWhiteboardStore, WhiteboardItem as StoreItem } from '../store';
import { RenderManager } from '../RenderManager';
import { simplifyPoints } from '../utils/simplifyPoints';
import { OneEuroFilter } from '../utils/oneEuroFilter';
import { detectShape } from '../utils/shapeRecognition';
// import { useWhiteboardSync } from './useWhiteboardSync'; // Removed logic duplication
import { Point } from '../types';
import { useParams } from 'next/navigation';
import { throttle } from '../utils/throttle';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useWhiteboardDrawing(
    renderManager: RenderManager | null,
    meetingId: string,
    broadcastEvent?: (type: string, data: any) => boolean,
    broadcastCursor?: (x: number, y: number, tool: string) => void
) {
    // const params = useParams(); // Removed useParams reliance
    // const meetingId = params.meetingId as string; // Passed as argument
    // Removed duplicate useWhiteboardSync call


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
    const broadcastEventRef = useRef(broadcastEvent);

    useEffect(() => {
        broadcastCursorRef.current = broadcastCursor;
        broadcastEventRef.current = broadcastEvent;
    }, [broadcastCursor, broadcastEvent]);

    // BATCHING: Buffer for real-time drawing
    const batchBuffer = useRef<Point[]>([]);
    const batchTimeout = useRef<NodeJS.Timeout | null>(null);

    // Batch Flusher (runs every 50ms if data exists)
    useEffect(() => {
        const flush = () => {
            if (batchBuffer.current.length > 0) {
                const points = [...batchBuffer.current];
                batchBuffer.current = []; // Clear buffer immediately

                // Get current tool state (approximate)
                const { tool, colorStr, penSize, eraserSize, zoom } = stateRef.current;
                const color = parseInt(colorStr.replace('#', ''), 16);
                const width = (tool === 'eraser' ? eraserSize : penSize) / zoom;

                // Send Batch
                if (broadcastEventRef.current) {
                    broadcastEventRef.current('draw_batch', {
                        points,
                        color,
                        width,
                        tool,
                        isNewStroke: false // Can be improved to detect new stroke
                    });
                }
            }
        };

        const interval = setInterval(flush, 50);
        return () => clearInterval(interval);
    }, []);

    // Also flush when pointer up
    const flushBatch = useCallback(() => {
        if (batchBuffer.current.length > 0) {
            const points = [...batchBuffer.current];
            batchBuffer.current = [];
            const { tool, colorStr, penSize, eraserSize, zoom } = stateRef.current;
            const color = parseInt(colorStr.replace('#', ''), 16);
            const width = (tool === 'eraser' ? eraserSize : penSize) / zoom;

            if (broadcastEventRef.current) {
                broadcastEventRef.current('draw_batch', {
                    points,
                    color,
                    width,
                    tool,
                    isNewStroke: false
                });
            }
        }
    }, []);

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
        const { tool: currentTool } = stateRef.current;
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

        if (currentTool === 'magic-pen') {
            // Magic Pen Effect: Create a secondary glow graphics layer
            const glow = new PIXI.Graphics();
            glow.filters = [new PIXI.BlurFilter(8)]; // Glow effect
            renderManager.staticLayer.addChild(glow);
            glowGraphics.current = glow;
        }
    }, [renderManager, getLocalPoint]);

    const throttledBroadcast = useRef(throttle((x: number, y: number, t: string) => {
        if (broadcastCursorRef.current) {
            broadcastCursorRef.current(x, y, t);
        }
    }, 50)).current;

    const onPointerMove = useCallback((e: PointerEvent) => {
        if (!isDrawing.current || !renderManager || !currentGraphics.current) return;

        const { tool: currentTool, zoom: currentZoom, colorStr: currentColorStr, penSize: currentPenSize, eraserSize: currentEraserSize } = stateRef.current;
        const rawPoint = getLocalPoint(e);
        let x = filterX.current.filter(rawPoint.x);
        let y = filterY.current.filter(rawPoint.y);

        // Shift Key Constraint: Straight Lines
        if (e.shiftKey && currentPath.current.length > 0) {
            const startPoint = currentPath.current[0];
            const dx = x - startPoint.x;
            const dy = y - startPoint.y;

            if (Math.abs(dx) > Math.abs(dy)) {
                y = startPoint.y; // Lock Vertical, move Horizontal
            } else {
                x = startPoint.x; // Lock Horizontal, move Vertical
            }
        }

        const point = { x, y };

        const lastPoint = currentPath.current[currentPath.current.length - 1];
        const dist = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
        if (dist < 1 / currentZoom) return;

        currentPath.current.push(point);

        // 1. Broadcast Cursor Position (Throttled)
        throttledBroadcast(point.x, point.y, currentTool);

        // 2. Add to Batch Buffer for Streaming Drawing
        batchBuffer.current.push(point);

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

        // CAPTURE AND CLEAR (Data Safety)
        const capturedPoints = [...currentPath.current];
        currentPath.current = []; // Immediate reset
        lastRenderedIndex.current = 0;

        // Flush any remaining batch data
        flushBatch();

        const { tool: currentTool, colorStr: currentColorStr, penSize: currentPenSize, eraserSize: currentEraserSize, zoom: currentZoom } = stateRef.current;

        // Cleanup Glow immediately
        if (glowGraphics.current) {
            glowGraphics.current.destroy();
            glowGraphics.current = null;
        }

        if (capturedPoints.length >= 1) {
            let finalPoints = capturedPoints;

            // Handle single point (dot) by duplicating it slightly to ensure line rendering
            if (finalPoints.length === 1) {
                finalPoints.push({ x: finalPoints[0].x + 0.01, y: finalPoints[0].y });
            }

            let isRecognized = false;

            // GHOST FILTERING: Ignore tiny dots/strokes
            const minDimension = 10 / currentZoom; // 10px visual threshold
            const xs = finalPoints.map(p => p.x);
            const ys = finalPoints.map(p => p.y);
            const w = Math.max(...xs) - Math.min(...xs);
            const h = Math.max(...ys) - Math.min(...ys);

            // Filter out accidental clicks (dots) unless it's a deliberate dot (e.g. thick pen tap)
            // For Magic Pen, be stricter.
            if (currentTool === 'magic-pen') {
                if (w < 20 / currentZoom && h < 20 / currentZoom) {
                    // Too small for magic pen -> Discard
                    if (currentGraphics.current) {
                        currentGraphics.current.destroy();
                        currentGraphics.current = null;
                    }
                    renderManager.renderItems(useWhiteboardStore.getState().items);
                    return;
                }
            } else {
                // For regular pen, if only 1 point or super tiny, maybe ignore?
                // Current logic handles point length >= 1 check below. 
                // Leaving regular pen capable of dots.
            }

            if (currentTool === 'eraser') {
                // ERASER LOGIC: attached erasure
                // 1. Identify valid unique Eraser Path
                if (!capturedPoints || capturedPoints.length < 2) return;

                // 2. Check Intersection with existing items
                // Simple AABB check for now against the whole stroke AABB
                const xs = capturedPoints.map(p => p.x);
                const ys = capturedPoints.map(p => p.y);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);

                // Expand slightly for stroke width
                const eraseR = (currentEraserSize / currentZoom) / 2;
                const hitArea = { x: minX - eraseR, y: minY - eraseR, width: (maxX - minX) + eraseR * 2, height: (maxY - minY) + eraseR * 2 };

                const hits: any[] = [];
                if (renderManager) {
                    renderManager.quadTree.retrieve(hits, hitArea);
                }

                // Filter true intersections (approximate) and attach
                const intersectedItems = hits.filter(item => {
                    const b = item.getBounds();
                    // Basic AABB intersection
                    return hitArea.x < b.x + b.width && hitArea.x + hitArea.width > b.x &&
                        hitArea.y < b.y + b.height && hitArea.y + hitArea.height > b.y;
                });

                if (intersectedItems.length > 0) {
                    console.log("[Eraser] Hit Items:", intersectedItems.map(i => i.id));
                    // ATTACH MODE
                    intersectedItems.forEach(item => {
                        // Transform Global Points -> Local Points
                        const lBounds = renderManager!.getLocalBounds(item);
                        const cx = lBounds.x + lBounds.width / 2;
                        const cy = lBounds.y + lBounds.height / 2;

                        const sX = item.transform.scaleX || 1;
                        const sY = item.transform.scaleY || 1;
                        const rot = item.transform.rotation || 0;
                        const tx = item.transform.x + cx; // Pivot World X
                        const ty = item.transform.y + cy; // Pivot World Y

                        const cos = Math.cos(-rot);
                        const sin = Math.sin(-rot);

                        const localPoints = capturedPoints.map(p => {
                            // 1. Translate back (World -> Pivot)
                            const dx = p.x - tx;
                            const dy = p.y - ty;
                            // 2. Rotate Inverse
                            const rx = dx * cos - dy * sin;
                            const ry = dx * sin + dy * cos;
                            // 3. Scale Inverse
                            const sx = rx / sX;
                            const sy = ry / sY;
                            // 4. Pivot Offset (Pivot -> Local Origin)
                            // Pivot was at (cx, cy) in local space.
                            // So we are now relative to Pivot. To get absolute local, add Pivot.
                            return { x: sx + cx, y: sy + cy };
                        });

                        const simplifiedLocal = simplifyPoints(localPoints, 0.5 / currentZoom);
                        // Normalize eraser size by scale (approximate average scale) to maintain visual width
                        const avgScale = (Math.abs(sX) + Math.abs(sY)) / 2;
                        const newErasure = {
                            points: simplifiedLocal,
                            size: (currentEraserSize / currentZoom) / (avgScale || 1)
                        };

                        const existingErasures = item.data.erasures || [];
                        const updatePayload = {
                            data: {
                                ...item.data,
                                erasures: [...existingErasures, newErasure]
                            }
                        };

                        // Update Store
                        useWhiteboardStore.getState().updateItem(item.id, updatePayload); // Use getState to avoid closure staleness? updateItem is stable from store hook but good practice

                        // Persist/Broadcast Update
                        if (broadcastEvent) {
                            console.log("[Eraser] Broadcasting Update for", item.id);
                            broadcastEvent('update_item', { id: item.id, ...updatePayload });
                        } else {
                            console.warn("[Eraser] No broadcastEvent available");
                        }
                        // TODO: API Persist (Patch)
                    });

                    // Cleanup current graphics
                    if (currentGraphics.current) {
                        currentGraphics.current.destroy();
                        currentGraphics.current = null;
                    }
                    if (renderManager) renderManager.renderItems(useWhiteboardStore.getState().items);
                    return; // Done, do not create global item
                }

                // If NO valid intersection, fall through to create global 'white' stroke?
                // Or just do nothing? 
                // Let's allow global eraser strokes for background cleaning if desired.
                // Fall through.
            }

            if (currentTool === 'magic-pen') {
                // Magic Pen Logic
                const result = detectShape(capturedPoints);
                // ... same magic pen logic ...
                if (result.type !== 'none' && result.correctedPoints) {
                    finalPoints = result.correctedPoints;
                    isRecognized = true;
                    // ... redraw if needed ...
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
                    // UNRECOGNIZED MAGIC PEN STROKE -> DISCARD
                    if (currentGraphics.current) {
                        currentGraphics.current.destroy();
                        currentGraphics.current = null;
                    }
                    renderManager.renderItems(useWhiteboardStore.getState().items);
                    return; // EARLY RETURN
                }
            }

            const simplified = simplifyPoints(finalPoints, 0.5 / currentZoom);
            const newItem: StoreItem = {
                id: uuidv4(),
                type: 'path',
                data: {
                    points: simplified,
                    color: currentTool === 'eraser' ? '#ffffff' : currentColorStr,
                    brushSize: (currentTool === 'eraser' ? currentEraserSize : currentPenSize) / currentZoom
                },
                transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
                zIndex: Date.now(),
                meetingId: meetingId || 'default',
                userId: 'user' // Placeholder, will be replaced by backend or ignored if unnecessary for broadcast
            };

            addItem(newItem);

            // Hand off persistence to Gateway (via broadcastEvent)
            // Optimistic broadcast
            if (broadcastEvent) {
                const success = broadcastEvent('add_item', newItem);
                if (!success) {
                    console.warn("Broadcast skipped (likely disconnected)");
                }
            } else {
                console.warn("[WhiteboardDrawing] No broadcastEvent function available");
            }
        }

        // Clean up: Remove the progressive graphics strictly
        if (currentGraphics.current) {
            currentGraphics.current.destroy();
            currentGraphics.current = null;
        }

        // Force re-render from store
        if (renderManager) {
            const items = useWhiteboardStore.getState().items;
            renderManager.renderItems(items);
        }
    }, [renderManager, addItem, meetingId, flushBatch, broadcastEvent]);

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
