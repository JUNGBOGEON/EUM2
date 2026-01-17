import { useRef, useCallback, useEffect } from 'react';
import * as PIXI from 'pixi.js';
import { v4 as uuidv4 } from 'uuid';
import { useWhiteboardStore, WhiteboardItem as StoreItem } from '../store';
import { RenderManager } from '../RenderManager';
import { simplifyPoints } from '../utils/simplifyPoints';
import { OneEuroFilter } from '../utils/oneEuroFilter';
import { detectShape } from '../utils/shapeRecognition';
import { STAMP_ICONS } from '../utils/stampAssets';
import { getProxiedUrl } from '../utils/urlUtils';
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
        tool, color: colorStr, penSize, eraserSize, zoom, pan, addItem,
        currentStamp, pendingImage
    } = useWhiteboardStore();

    // Stable State Ref
    const stateRef = useRef({ tool, colorStr, penSize, eraserSize, zoom, pan, currentStamp, pendingImage });
    useEffect(() => {
        stateRef.current = { tool, colorStr, penSize, eraserSize, zoom, pan, currentStamp, pendingImage };
    }, [tool, colorStr, penSize, eraserSize, zoom, pan, currentStamp, pendingImage]);

    const isDrawing = useRef(false);
    const currentPath = useRef<Point[]>([]);
    const currentGraphics = useRef<PIXI.Graphics | null>(null);
    const glowGraphics = useRef<PIXI.Graphics | null>(null); // For Magic Pen effect
    const lastRenderedIndex = useRef(0); // Track which points we've already rendered

    // Track eraser coverage for items (id -> covered area in pixels²)
    const eraserCoverage = useRef<Map<string, { covered: number, total: number }>>(new Map());
    // Glow overlays for items with 50%+ coverage (red warning glow)
    const eraserGlowGraphics = useRef<Map<string, PIXI.Container>>(new Map());

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
        useWhiteboardStore.getState().setIsDrawing(true); // Trigger UI Fade
        currentPath.current = [];
        lastRenderedIndex.current = 0;
        currentParentId.current = null;
        currentParentOrigin.current = null;
        currentParentColor.current = null;
        eraserCoverage.current.clear(); // Reset coverage tracking for eraser
        // Cleanup any existing eraser glow effects
        eraserGlowGraphics.current.forEach(g => g.destroy());
        eraserGlowGraphics.current.clear();

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
        if (!renderManager) return;

        const {
            tool: currentTool,
            zoom: currentZoom,
            colorStr: currentColorStr,
            penSize: currentPenSize,
            eraserSize: currentEraserSize,
            currentStamp,
            pendingImage
        } = stateRef.current;

        const rawPoint = getLocalPoint(e);
        let x = filterX.current.filter(rawPoint.x);
        let y = filterY.current.filter(rawPoint.y);

        // Preview Ghost Updates
        // Note: When mouse button is pressed (e.buttons & 1), useWhiteboardInteraction handles stamp preview
        // with its own animate loop (grow effect). Skip here to avoid size conflict.
        if (currentTool === 'stamp' && !(e.buttons & 1)) {
            renderManager.renderGhost('stamp', x, y, 100, 100, { stampType: currentStamp });
        } else if (currentTool === 'image' && pendingImage) {
            renderManager.renderGhost('image', x, y, pendingImage.width, pendingImage.height, { url: pendingImage.url });
        } else if (currentTool === 'postit') {
            renderManager.renderGhost('postit', x, y, 200, 200);
        } else if (currentTool !== 'stamp') {
            renderManager.renderGhost(null, 0, 0);
        }

        if (!isDrawing.current || !currentGraphics.current) {
            // Even if not drawing, broadcast cursor
            const point = { x, y };
            throttledBroadcast(point.x, point.y, currentTool);
            return;
        }

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

        // 3. REAL-TIME ERASER: Delete/erase items immediately when touched
        if (currentTool === 'eraser') {
            const eraseR = (currentEraserSize / currentZoom) / 2;
            const hitArea = {
                x: point.x - eraseR,
                y: point.y - eraseR,
                width: eraseR * 2,
                height: eraseR * 2
            };

            const hits: any[] = [];
            renderManager.quadTree.retrieve(hits, hitArea);

            // Track coverage for deletable items (shape, stamp, image, text)
            // They will be deleted in onPointerUp if 50%+ is covered
            hits.forEach(item => {
                if (item.type !== 'shape' && item.type !== 'stamp' && item.type !== 'image' && item.type !== 'text') {
                    return;
                }
                const lBounds = renderManager.getLocalBounds(item);
                const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1 };
                const worldMinX = t.x;
                const worldMinY = t.y;
                const worldWidth = lBounds.width * (t.scaleX || 1);
                const worldHeight = lBounds.height * (t.scaleY || 1);
                const worldMaxX = worldMinX + worldWidth;
                const worldMaxY = worldMinY + worldHeight;

                // Check if eraser intersects this item
                if (hitArea.x < worldMaxX && hitArea.x + hitArea.width > worldMinX &&
                    hitArea.y < worldMaxY && hitArea.y + hitArea.height > worldMinY) {

                    // Calculate intersection area
                    const overlapMinX = Math.max(hitArea.x, worldMinX);
                    const overlapMinY = Math.max(hitArea.y, worldMinY);
                    const overlapMaxX = Math.min(hitArea.x + hitArea.width, worldMaxX);
                    const overlapMaxY = Math.min(hitArea.y + hitArea.height, worldMaxY);
                    const overlapArea = Math.max(0, overlapMaxX - overlapMinX) * Math.max(0, overlapMaxY - overlapMinY);

                    const totalArea = worldWidth * worldHeight;

                    // Accumulate coverage for this item
                    const existing = eraserCoverage.current.get(item.id);
                    if (existing) {
                        existing.covered = Math.min(existing.covered + overlapArea, totalArea);
                    } else {
                        eraserCoverage.current.set(item.id, { covered: overlapArea, total: totalArea });
                    }
                }
            });

            // Check coverage and render glow effect for items > 50% covered
            eraserCoverage.current.forEach((value, id) => {
                const percent = value.covered / value.total;
                if (percent >= 0.5) {
                    // If not already glowing, create glow graphic
                    if (!eraserGlowGraphics.current.has(id)) {
                        const item = useWhiteboardStore.getState().items.get(id);
                        if (item) {
                            let glow: PIXI.Container;
                            const lBounds = renderManager.getLocalBounds(item);
                            const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1 };

                            // UNIFIED GLOW CONFIGURATION
                            const GLOW = {
                                color: 0xFF2060,
                                outlineThickness: 4,  // Matches Sprite offset
                                textStroke: 8,       // Matches Text stroke (approx 2x outline)
                                bloomBlur: 10,
                                bloomAlpha: 0.4,
                                coreBlur: 2,
                                coreAlpha: 0.25
                            };

                            if (item.type === 'stamp' || item.type === 'image') {
                                // Try to use Sprite for Contour Glow
                                let texture: PIXI.Texture | null = null;

                                if (item.type === 'stamp' && item.data?.stampType) {
                                    texture = renderManager.getStampTexture(item.data.stampType) || null;
                                } else if (item.type === 'image' && item.data?.url) {
                                    const url = getProxiedUrl(item.data.url);
                                    if (url && PIXI.Assets.cache.has(url)) {
                                        texture = PIXI.Assets.get(url);
                                    }
                                }

                                if (texture) {
                                    const container = new PIXI.Container();
                                    const w = lBounds.width * (t.scaleX || 1);
                                    const h = lBounds.height * (t.scaleY || 1);
                                    const cx = w / 2;
                                    const cy = h / 2;

                                    // 1. Outline (Fake Stroke via 8-way offset)
                                    const thickness = GLOW.outlineThickness;
                                    const offsets = [
                                        [-thickness, 0], [thickness, 0], [0, -thickness], [0, thickness],
                                        [-thickness * 0.7, -thickness * 0.7], [thickness * 0.7, -thickness * 0.7],
                                        [-thickness * 0.7, thickness * 0.7], [thickness * 0.7, thickness * 0.7]
                                    ];

                                    const outlineC = new PIXI.Container();
                                    offsets.forEach(([ox, oy]) => {
                                        const s = new PIXI.Sprite(texture);
                                        s.anchor.set(0.5);
                                        s.width = w;
                                        s.height = h;
                                        s.tint = GLOW.color; // Neon Pink
                                        s.alpha = 0.8;
                                        s.position.set(cx + ox, cy + oy);
                                        outlineC.addChild(s);
                                    });
                                    // Slight blur to merge offsets into a solid stroke
                                    outlineC.filters = [new PIXI.BlurFilter({ strength: 1, quality: 3 })];
                                    container.addChild(outlineC);

                                    // 2. Outer Bloom (Strong Blur + ADD)
                                    const bloom = new PIXI.Sprite(texture);
                                    bloom.anchor.set(0.5);
                                    bloom.width = w;
                                    bloom.height = h;
                                    bloom.tint = GLOW.color;
                                    bloom.alpha = GLOW.bloomAlpha;
                                    bloom.blendMode = 'add';
                                    bloom.filters = [new PIXI.BlurFilter({ strength: GLOW.bloomBlur, quality: 4 })];
                                    bloom.position.set(cx, cy);
                                    container.addChild(bloom);

                                    // 3. Inner Core (Weak Blur + Normal)
                                    const core = new PIXI.Sprite(texture);
                                    core.anchor.set(0.5);
                                    core.width = w;
                                    core.height = h;
                                    core.tint = GLOW.color;
                                    core.alpha = GLOW.coreAlpha; // Reduced inner intensity
                                    core.filters = [new PIXI.BlurFilter({ strength: GLOW.coreBlur, quality: 4 })];
                                    core.position.set(cx, cy);
                                    container.addChild(core);

                                    container.pivot.set(cx, cy);
                                    container.position.set(t.x + cx, t.y + cy);
                                    container.rotation = t.rotation || 0;
                                    glow = container;
                                } else {
                                    // Fallback to Box
                                    const container = new PIXI.Container();
                                    const w = lBounds.width * (t.scaleX || 1);
                                    const h = lBounds.height * (t.scaleY || 1);
                                    const cx = w / 2;
                                    const cy = h / 2;

                                    const drawBox = (blur: number, alpha: number, blend: boolean, strokeW: number = 4) => {
                                        const g = new PIXI.Graphics();
                                        g.rect(0, 0, w, h);
                                        g.fill({ color: GLOW.color, alpha: alpha * 0.4 });
                                        g.stroke({ width: strokeW, color: GLOW.color, alpha: alpha });
                                        if (blend) g.blendMode = 'add';
                                        g.filters = [new PIXI.BlurFilter({ strength: blur, quality: 3 })];
                                        return g;
                                    };

                                    container.addChild(drawBox(GLOW.bloomBlur, GLOW.bloomAlpha, true, GLOW.textStroke)); // Bloom + outline
                                    container.addChild(drawBox(GLOW.coreBlur, GLOW.coreAlpha, false, GLOW.textStroke - 2)); // Core + outline

                                    container.pivot.set(cx, cy);
                                    container.position.set(t.x + cx, t.y + cy);
                                    container.rotation = t.rotation || 0;
                                    glow = container;
                                }
                            } else if (item.type === 'text' && item.data?.text) {
                                // Text Contour Glow + Stroke
                                const { text, fontSize, fontFamily } = item.data;
                                const style = new PIXI.TextStyle({
                                    fontFamily: fontFamily || 'Arial, sans-serif',
                                    fontSize: fontSize || 24,
                                    fill: GLOW.color,
                                    stroke: { width: GLOW.textStroke, color: GLOW.color, join: 'round' },
                                    align: 'left',
                                    wordWrap: false,
                                    lineHeight: (fontSize || 24) * 1.4,
                                });

                                const dummy = new PIXI.Text({ text, style });
                                const w = dummy.width;
                                const h = dummy.height;
                                const cx = w / 2;
                                const cy = h / 2;
                                dummy.destroy();

                                const container = new PIXI.Container();

                                const createText = (blur: number, alpha: number, blend: boolean) => {
                                    const tObj = new PIXI.Text({ text, style });
                                    tObj.resolution = 2;
                                    tObj.alpha = alpha;
                                    if (blend) tObj.blendMode = 'add';
                                    tObj.filters = [new PIXI.BlurFilter({ strength: blur, quality: 3 })];
                                    tObj.anchor.set(0.5);
                                    tObj.position.set(cx, cy);
                                    return tObj;
                                };

                                container.addChild(createText(GLOW.bloomBlur, GLOW.bloomAlpha, true)); // Bloom
                                container.addChild(createText(GLOW.coreBlur, GLOW.coreAlpha, false)); // Core + Outline

                                container.pivot.set(cx, cy);
                                container.position.set(t.x + cx, t.y + cy);
                                container.rotation = t.rotation || 0;
                                container.scale.set(t.scaleX ?? 1, t.scaleY ?? 1);

                                glow = container;
                            } else {
                                // Default Graphics Bloom
                                const container = new PIXI.Container();
                                const w = lBounds.width * (t.scaleX || 1);
                                const h = lBounds.height * (t.scaleY || 1);
                                const cx = w / 2;
                                const cy = h / 2;

                                const drawBox = (blur: number, alpha: number, blend: boolean, strokeW: number = 4) => {
                                    const g = new PIXI.Graphics();
                                    g.rect(0, 0, w, h);
                                    g.fill({ color: GLOW.color, alpha: alpha * 0.4 });
                                    g.stroke({ width: strokeW, color: GLOW.color, alpha: alpha });
                                    if (blend) g.blendMode = 'add';
                                    g.filters = [new PIXI.BlurFilter({ strength: blur, quality: 3 })];
                                    return g;
                                };

                                container.addChild(drawBox(GLOW.bloomBlur, GLOW.bloomAlpha, true, GLOW.textStroke));
                                container.addChild(drawBox(GLOW.coreBlur, GLOW.coreAlpha, false, GLOW.textStroke - 2));

                                container.pivot.set(cx, cy);
                                container.position.set(t.x + cx, t.y + cy);
                                container.rotation = t.rotation || 0;
                                glow = container;
                            }

                            renderManager.drawingLayer.addChild(glow);
                            eraserGlowGraphics.current.set(id, glow);
                        }
                    }
                }
            });

            // Draw eraser preview trail on liveLayer for visual feedback
            const g = currentGraphics.current;
            if (g && currentPath.current.length >= 2) {
                g.clear();
                // Semi-transparent cyan stroke to differentiate from red glow
                const eraserColor = 0x00FFFF;
                const eraserAlpha = 0.3;
                const eraserWidth = currentEraserSize / currentZoom;

                g.moveTo(currentPath.current[0].x, currentPath.current[0].y);
                for (let i = 1; i < currentPath.current.length; i++) {
                    g.lineTo(currentPath.current[i].x, currentPath.current[i].y);
                }
                g.stroke({ width: eraserWidth, color: eraserColor, alpha: eraserAlpha, cap: 'round', join: 'round' });
            }

            // Path erasure is handled in onPointerUp with the full stroke
            // This prevents creating hundreds of tiny erasure objects
            return;
        }

        const g = currentGraphics.current;
        const glow = glowGraphics.current;

        let color = parseInt(currentColorStr.replace('#', ''), 16);

        const width = currentPenSize / currentZoom;

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
            g.stroke({ width, color, cap: 'round', join: 'round' });

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
        useWhiteboardStore.getState().setIsDrawing(false); // Restore UI

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
                    // Notify remote users to clear drag graphics
                    if (broadcastEventRef.current) {
                        broadcastEventRef.current('stroke_end', {});
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
                    // Notify remote users to clear drag graphics
                    if (broadcastEventRef.current) {
                        broadcastEventRef.current('stroke_end', {});
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

                // Delete items that were 50%+ covered during the eraser drag
                eraserCoverage.current.forEach((coverage, itemId) => {
                    const coveragePercent = coverage.covered / coverage.total;
                    if (coveragePercent >= 0.5) {
                        console.log(`[Eraser] Deleting item ${itemId} (${(coveragePercent * 100).toFixed(0)}% covered)`);
                        useWhiteboardStore.getState().deleteItem(itemId);
                        if (broadcastEventRef.current) {
                            broadcastEventRef.current('delete_item', { id: itemId });
                        }
                    }
                });
                eraserCoverage.current.clear();
                // Cleanup glow effects
                eraserGlowGraphics.current.forEach(g => g.destroy());
                eraserGlowGraphics.current.clear();

                // Filter to path items only for erasure attachment
                const pathItems = hits.filter(item => item.type === 'path');

                if (pathItems.length > 0) {
                    console.log(`[Eraser] Applying erasure to ${pathItems.length} paths`);

                    pathItems.forEach(hitItem => {
                        const item = useWhiteboardStore.getState().items.get(hitItem.id);
                        if (!item) return;

                        // Transform eraser points from world space to local space
                        const lBounds = renderManager!.getLocalBounds(item);
                        const cx = lBounds.x + lBounds.width / 2;
                        const cy = lBounds.y + lBounds.height / 2;

                        const sX = item.transform?.scaleX || 1;
                        const sY = item.transform?.scaleY || 1;
                        const rot = item.transform?.rotation || 0;
                        const tx = (item.transform?.x || 0) + cx;
                        const ty = (item.transform?.y || 0) + cy;

                        const cos = Math.cos(-rot);
                        const sin = Math.sin(-rot);

                        const localPoints = capturedPoints.map(p => {
                            const dx = p.x - tx;
                            const dy = p.y - ty;
                            const rx = dx * cos - dy * sin;
                            const ry = dx * sin + dy * cos;
                            return { x: rx / sX + cx, y: ry / sY + cy };
                        });

                        const simplifiedLocal = simplifyPoints(localPoints, 0.5 / currentZoom);
                        const avgScale = (Math.abs(sX) + Math.abs(sY)) / 2;

                        // Create ONE erasure with all points from the stroke
                        const newErasure = {
                            id: currentErasureId.current || uuidv4(),
                            points: simplifiedLocal,
                            size: (currentEraserSize / currentZoom) / (avgScale || 1)
                        };

                        const existingErasures = item.data?.erasures || [];
                        const updatePayload = {
                            data: {
                                ...item.data,
                                erasures: [...existingErasures, newErasure]
                            }
                        };

                        useWhiteboardStore.getState().updateItem(item.id, updatePayload);

                        // Broadcast the update
                        if (broadcastEvent) {
                            console.log(`[Eraser] Broadcasting erasure for ${item.id}`);
                            broadcastEvent('update_item', { id: item.id, data: updatePayload.data });
                        }
                    });

                    // Cleanup and re-render
                    if (currentGraphics.current) {
                        currentGraphics.current.destroy();
                        currentGraphics.current = null;
                    }
                    if (renderManager) renderManager.renderItems(useWhiteboardStore.getState().items);
                    return;
                }

                // If no paths hit, just cleanup the eraser graphics
                if (currentGraphics.current) {
                    currentGraphics.current.destroy();
                    currentGraphics.current = null;
                }
                // Notify remote users to clear drag graphics
                if (broadcastEventRef.current) {
                    broadcastEventRef.current('stroke_end', {});
                }
                return;
            }

            // NOTE: Magic pen is handled above (line 612-652), not here
            // The finalPoints are already updated with corrected shape points

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
