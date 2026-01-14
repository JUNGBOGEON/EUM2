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

    const currentParentId = useRef<string | null>(null);
    const currentParentOrigin = useRef<{ x: number, y: number } | null>(null);
    const currentParentColor = useRef<string | null>(null);

    const currentErasureId = useRef<string | null>(null);

    const onPointerDown = useCallback((e: PointerEvent) => {
        if (!renderManager) return;
        const { tool: currentTool } = stateRef.current;
        if (currentTool !== 'pen' && currentTool !== 'magic-pen' && currentTool !== 'eraser') return;

        isDrawing.current = true;
        currentPath.current = [];
        lastRenderedIndex.current = 0;
        currentParentId.current = null;
        currentParentOrigin.current = null;
        currentParentColor.current = null;

        // Reset Erasure ID for new stroke
        if (currentTool === 'eraser') {
            currentErasureId.current = uuidv4();
        } else {
            currentErasureId.current = null;
        }

        filterX.current.reset();
        filterY.current.reset();

        const point = getLocalPoint(e);

        // Check if starting inside a Post-it
        const hitArea = { x: point.x - 1, y: point.y - 1, width: 2, height: 2 };
        const hits: any[] = [];
        renderManager.quadTree.retrieve(hits, hitArea);

        const postitHit = hits.find(item => {
            if (item.type !== 'postit') return false;
            const lb = renderManager.getLocalBounds(item);
            const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1 };
            const worldMinX = t.x;
            const worldMinY = t.y;
            const worldMaxX = t.x + lb.width * (t.scaleX || 1);
            const worldMaxY = t.y + lb.height * (t.scaleY || 1);
            return point.x >= worldMinX && point.x <= worldMaxX &&
                point.y >= worldMinY && point.y <= worldMaxY;
        });

        if (postitHit) {
            currentParentId.current = postitHit.id;
            currentParentOrigin.current = { x: postitHit.transform.x, y: postitHit.transform.y };
            // Ensure hex string format
            const rawColor = postitHit.data?.color || 0xFFEB3B;
            currentParentColor.current = typeof rawColor === 'number' ? '#' + rawColor.toString(16).padStart(6, '0') : rawColor;
            console.log('[Drawing] Starting inside Post-it:', postitHit.id, 'Color:', currentParentColor.current);
        }

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

        // NOTE: Real-time deletion logic removed to prevent re-renders. 
        // All mutations happen in onPointerUp.

        const g = currentGraphics.current;
        const glow = glowGraphics.current;

        let color = parseInt(currentColorStr.replace('#', ''), 16);
        // Eraser Color Logic
        if (currentTool === 'eraser') {
            if (currentParentColor.current) {
                // Use Post-it background color to mimic erasing inside it
                color = parseInt(currentParentColor.current.replace('#', ''), 16);
            } else {
                color = 0xffffff; // Default White Eraser
            }
        }

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

            // GHOST FILTERING: Ignore tiny dots/strokes
            const minDimension = 10 / currentZoom; // 10px visual threshold
            const xs = finalPoints.map(p => p.x);
            const ys = finalPoints.map(p => p.y);
            const w = Math.max(...xs) - Math.min(...xs);
            const h = Math.max(...ys) - Math.min(...ys);

            if (currentTool === 'magic-pen') {
                if (w < 20 / currentZoom && h < 20 / currentZoom) {
                    // Too small for magic pen -> Discard
                    if (currentGraphics.current) {
                        currentGraphics.current.destroy();
                        currentGraphics.current = null;
                    }
                    if (renderManager) renderManager.renderItems(useWhiteboardStore.getState().items);
                    return;
                }

                // Recognize Shape
                const result = detectShape(capturedPoints);
                if (result.type !== 'none' && result.correctedPoints) {
                    finalPoints = result.correctedPoints;
                    // Redraw recognized shape temporarily
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
                    // Unrecognized magic pen stroke -> Discard
                    if (currentGraphics.current) {
                        currentGraphics.current.destroy();
                        currentGraphics.current = null;
                    }
                    if (renderManager) renderManager.renderItems(useWhiteboardStore.getState().items);
                    return;
                }
            }

            if (currentTool === 'eraser') {
                console.log('[Eraser] onPointerUp triggered. Points:', capturedPoints.length);

                // ERASER LOGIC: attached erasure for paths, deletion for other items
                const eraseR = (currentEraserSize / currentZoom) / 2;
                // Bounding box of the entire stroke
                const xs = capturedPoints.map(p => p.x);
                const ys = capturedPoints.map(p => p.y);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);

                const hitArea = { x: minX - eraseR, y: minY - eraseR, width: (maxX - minX) + eraseR * 2, height: (maxY - minY) + eraseR * 2 };

                const hits: any[] = [];
                if (renderManager) {
                    renderManager.quadTree.retrieve(hits, hitArea);
                }
                console.log('[Eraser] QuadTree hits:', hits.length);

                // Filter true intersections
                const intersectedItems = hits.filter(item => {
                    const lBounds = renderManager!.getLocalBounds(item);
                    const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1 };
                    const worldMinX = t.x + (lBounds.x * (t.scaleX || 1));
                    const worldMinY = t.y + (lBounds.y * (t.scaleY || 1));
                    const worldMaxX = t.x + ((lBounds.x + lBounds.width) * (t.scaleX || 1));
                    const worldMaxY = t.y + ((lBounds.y + lBounds.height) * (t.scaleY || 1));

                    return hitArea.x < worldMaxX && hitArea.x + hitArea.width > worldMinX &&
                        hitArea.y < worldMaxY && hitArea.y + hitArea.height > worldMinY;
                });

                console.log('[Eraser] Intersected items (after bounds check):', intersectedItems.length);

                if (intersectedItems.length > 0) {
                    const erasableItems = intersectedItems.filter(item =>
                        item.type === 'path' || item.type === 'image' || item.type === 'stamp'
                    );
                    const deletableItems = intersectedItems.filter(item =>
                        item.type === 'shape'
                    );

                    // DELETE text/shape items
                    deletableItems.forEach(item => {
                        console.log(`[Eraser] Deleting ${item.type} item:`, item.id);
                        useWhiteboardStore.getState().deleteItem(item.id);
                        if (broadcastEventRef.current) {
                            broadcastEventRef.current('delete_item', { id: item.id });
                        }
                    });

                    // ATTACH erasures
                    erasableItems.forEach(hitItem => {
                        console.log('[Eraser] Processing hit item:', hitItem.id);
                        const item = useWhiteboardStore.getState().items.get(hitItem.id);
                        if (!item) return;

                        const lBounds = renderManager!.getLocalBounds(item);
                        const halfW = lBounds.width / 2;
                        const halfH = lBounds.height / 2;
                        const cx = lBounds.x + halfW;
                        const cy = lBounds.y + halfH;
                        const sX = item.transform.scaleX || 1;
                        const sY = item.transform.scaleY || 1;
                        const rot = item.transform.rotation || 0;
                        const tx = item.transform.x + cx;
                        const ty = item.transform.y + cy;
                        const cos = Math.cos(-rot);
                        const sin = Math.sin(-rot);

                        const localPoints = capturedPoints.map(p => {
                            const dx = p.x - tx;
                            const dy = p.y - ty;
                            const rx = dx * cos - dy * sin;
                            const ry = dx * sin + dy * cos;
                            const sx = rx / sX;
                            const sy = ry / sY;
                            return { x: sx + halfW, y: sy + halfH };
                        });

                        const simplifiedLocal = simplifyPoints(localPoints, 0.5 / currentZoom);
                        const avgScale = (Math.abs(sX) + Math.abs(sY)) / 2;

                        // Use currentErasureId if available, or generate a new one for this stroke
                        const erasureId = currentErasureId.current || uuidv4();

                        const newErasure = {
                            id: erasureId,
                            points: simplifiedLocal,
                            size: (currentEraserSize / currentZoom) / (avgScale || 1)
                        };

                        const existingErasures = item.data.erasures || [];
                        const existingIndex = existingErasures.findIndex((e: any) => e.id === erasureId);

                        let newErasuresList;
                        if (existingIndex !== -1) {
                            newErasuresList = [...existingErasures];
                            newErasuresList[existingIndex] = newErasure;
                        } else {
                            newErasuresList = [...existingErasures, newErasure];
                        }

                        const updatePayload = {
                            data: {
                                ...item.data,
                                erasures: newErasuresList
                            }
                        };

                        console.log('[Eraser] Updating item with new erasure:', {
                            itemId: item.id,
                            erasureCount: updatePayload.data.erasures.length
                        });
                        useWhiteboardStore.getState().updateItem(item.id, updatePayload);

                        if (broadcastEventRef.current) {
                            broadcastEventRef.current('update_item', { id: item.id, ...updatePayload });
                        }
                    });
                }

                // Clean up graphics and return (Do NOT create path item)
                if (currentGraphics.current) {
                    currentGraphics.current.destroy();
                    currentGraphics.current = null;
                }
                if (renderManager) renderManager.renderItems(useWhiteboardStore.getState().items);
                return;
            }

            // --- Create New Path Item (Pen/Magic Pen/Stamp?? No stamp handled usage separately) ---
            let simplified = simplifyPoints(finalPoints, 0.5 / currentZoom);

            // If inside Post-it, convert World Points to Local Points
            if (currentParentOrigin.current) {
                const ox = currentParentOrigin.current.x;
                const oy = currentParentOrigin.current.y;
                simplified = simplified.map(p => ({ x: p.x - ox, y: p.y - oy }));
            }

            const newItem: StoreItem = {
                id: uuidv4(),
                type: 'path',
                data: {
                    points: simplified,
                    color: currentColorStr,
                    brushSize: currentPenSize / currentZoom
                },
                transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
                zIndex: Date.now(),
                meetingId: meetingId || 'default',
                userId: 'user',
                parentId: currentParentId.current || undefined // Link to parent Post-it if drawing inside one
            };

            addItem(newItem);

            // Hand off persistence to Gateway (via broadcastEvent)
            if (broadcastEventRef.current) {
                broadcastEventRef.current('add_item', newItem);
            } else {
                console.warn("[WhiteboardDrawing] No broadcastEvent function available");
            }
        }

        // Cleanup current graphics
        if (currentGraphics.current) {
            currentGraphics.current.destroy();
            currentGraphics.current = null;
        }

        // Force re-render from store
        if (renderManager) {
            const items = useWhiteboardStore.getState().items;
            renderManager.renderItems(items);
        }
    }, [renderManager, addItem, meetingId, flushBatch]);

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
