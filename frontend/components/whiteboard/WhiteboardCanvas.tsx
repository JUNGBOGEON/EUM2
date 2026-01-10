'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { RenderManager } from './RenderManager';
import { useWhiteboardStore } from './store';
import { v4 as uuidv4 } from 'uuid';
import { useWhiteboardDrawing } from './hooks/useWhiteboardDrawing';
import { useWhiteboardInteraction } from './hooks/useWhiteboardInteraction';
import { useWhiteboardSync } from './hooks/useWhiteboardSync';
import { WhiteboardToolbar } from './WhiteboardToolbar';
import { Point } from './types';
import { useParams } from 'next/navigation';
import { throttle } from './utils/throttle';
import { ZoomControls } from './components/ZoomControls';
import { GRID_SETTINGS, ZOOM_SETTINGS } from './constants';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

import { useWhiteboardPanning } from './hooks/useWhiteboardPanning';

export default function WhiteboardCanvas() {
    const params = useParams();
    const meetingId = params.meetingId as string;
    const containerRef = useRef<HTMLDivElement>(null);
    const [renderManager, setRenderManager] = useState<RenderManager | null>(null);

    // Zustand Selectors
    const tool = useWhiteboardStore((state) => state.tool);
    const zoom = useWhiteboardStore((state) => state.zoom);
    const pan = useWhiteboardStore((state) => state.pan);
    const setZoom = useWhiteboardStore((state) => state.setZoom);
    const setPan = useWhiteboardStore((state) => state.setPan);
    const addItem = useWhiteboardStore((state) => state.addItem);
    const colorStr = useWhiteboardStore((state) => state.color);
    const penSize = useWhiteboardStore((state) => state.penSize);
    const eraserSize = useWhiteboardStore((state) => state.eraserSize);
    const canUndo = useWhiteboardStore((state) => state.canUndo);
    const canRedo = useWhiteboardStore((state) => state.canRedo);
    const undo = useWhiteboardStore((state) => state.undo);
    const redo = useWhiteboardStore((state) => state.redo);
    const clearItems = useWhiteboardStore((state) => state.clearItems);
    const setItems = useWhiteboardStore((state) => state.setItems);

    const updateCursorForTool = useCallback((canvas: HTMLCanvasElement, currentTool: string, pSize: number, eSize: number, col: string, z: number) => {
        const generatePenCursor = (size: number, color: string) => {
            // size is diameter (stroke width). Radius is size / 2.
            // Requirement: Cursor size must be proportional. We interpret this as "visualize exact size".
            const r = size / 2;
            // Ensure canvas is large enough for the circle + border
            const svgSize = Math.max(24, r * 2 + 4);
            const cx = svgSize / 2;

            const svg = `
                <svg xmlns='http://www.w3.org/2000/svg' height='${svgSize}' width='${svgSize}'>
                    <circle cx='${cx}' cy='${cx}' r='${r}' fill='${color}' />
                    <circle cx='${cx}' cy='${cx}' r='${Math.max(r, 0.5) + 0.5}' stroke='white' stroke-width='1' fill='none' opacity='0.5'/>
                </svg>
            `.trim().replace(/\s+/g, ' ');
            return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${cx} ${cx}, crosshair`;
        };

        const generateEraserCursor = (size: number) => {
            const r = size / 2;
            const svgSize = Math.max(24, r * 2 + 4);
            const cx = svgSize / 2;

            const svg = `
                <svg xmlns='http://www.w3.org/2000/svg' height='${svgSize}' width='${svgSize}'>
                    <circle cx='${cx}' cy='${cx}' r='${r}' stroke='black' stroke-width='1' fill='white' opacity='0.8'/>
                </svg>
            `.trim().replace(/\s+/g, ' ');
            return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${cx} ${cx}, cell`;
        };

        const generateMagicPenCursor = (size: number, color: string) => {
            const r = size / 2;
            // Magic Wand Icon SVG path (simplified)
            // A wand stick + a star at the tip? 
            // We want the "hotspot" to be the circle center, corresponding to drawing stroke.
            // The wand should be decorating it. 
            // Let's place the wand to the bottom-right of the circle?

            const svgSize = Math.max(32, r * 2 + 20);
            const cx = svgSize / 2;
            const cy = svgSize / 2;

            // Wand icon path (roughly: handle + star)
            const wandPath = "M2,18 L10,10 M10,10 L14,6 M14,6 L18,2"; // Diagonal stick
            const starPath = "M14,6 L12,4 L14,2 L16,4 Z"; // Star tip? Simplified.

            // Using a nicer SVG string for wand
            // Let's assume the cursor hotspot is (cx, cy).
            // We draw the brush circle at (cx, cy).
            // We draw the wand icon offset, e.g. pointing at (cx, cy).

            // Actually, let's use a simple unicode or path for Wand.
            // Wand icon: 🪄 (might not render in all OS/Browsers inside SVG consistently without font)
            // Let's draw a simple vector wand.

            const svg = `
                <svg xmlns='http://www.w3.org/2000/svg' height='${svgSize}' width='${svgSize}'>
                    <!-- Brush Size Circle -->
                    <circle cx='${cx}' cy='${cy}' r='${r}' fill='${color}' opacity="0.6" />
                    <circle cx='${cx}' cy='${cy}' r='${Math.max(r, 0.5) + 0.5}' stroke='white' stroke-width='1' fill='none'/>

                    <!-- Wand Icon (Overlay/Decoration) -->
                    <!-- Positioned slightly offset so it looks like it's drawing -->
                    <g transform="translate(${cx + r + 2}, ${cy - r - 10}) scale(0.8)">
                         <path d="M14.5 2c-.8 0-1.5.7-1.5 1.5S13.7 5 14.5 5 16 4.3 16 3.5 15.3 2 14.5 2z" fill="#FFD700"/>
                         <path d="M4.2 19.8l7.6-7.6c.4-.4.4-1 0-1.4l-2.8-2.8c-.4-.4-1-.4-1.4 0L0 15.6c-.4.4-.4 1 0 1.4l2.8 2.8c.4.4 1 .4 1.4 0z" fill="#8B4513"/>
                         <path d="M12.4 9.6l1.4-1.4c.4-.4.4-1 0-1.4l-1.4-1.4c-.4-.4-1-.4-1.4 0L9.6 6.8 12.4 9.6z" fill="#CCCCCC"/>
                         <path d="M19 1l-2 2M21 4l-2-2M15 6l1-3M19 9l-3-1" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
                    </g>
                </svg>
            `.trim().replace(/\s+/g, ' ');

            return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${cx} ${cy}, auto`;
        };

        if (currentTool === 'pen') {
            canvas.style.cursor = generatePenCursor(pSize, col);
        } else if (currentTool === 'magic-pen') {
            canvas.style.cursor = generateMagicPenCursor(pSize, col);
        } else if (currentTool === 'eraser') {
            canvas.style.cursor = generateEraserCursor(eSize);
        } else if (currentTool === 'pan') {
            canvas.style.cursor = 'grab';
        } else if (currentTool === 'select') {
            canvas.style.cursor = 'default';
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }, []);

    useEffect(() => {
        if (!meetingId) return;

        const loadItems = async () => {
            try {
                const res = await fetch(`${API_URL}/api/whiteboard/${meetingId}`, {
                    credentials: 'include'
                });
                if (res.ok) {
                    const data = await res.json();
                    setItems(data);
                }
            } catch (err) {
                console.error("Failed to load whiteboard items", err);
            }
        };
        loadItems();
    }, [meetingId, setItems]);

    useEffect(() => {
        if (!containerRef.current) return;

        let isMounted = true;
        let rm: RenderManager | null = null;

        const init = async () => {
            const container = containerRef.current;
            if (!container) return;

            rm = new RenderManager(
                container.clientWidth,
                container.clientHeight
            );

            await rm.init(container);

            if (isMounted) {
                setRenderManager(rm);
                // Force initial cursor update immediately after initialization
                if (container) {
                    // Use closure values or wait for state? Closure values are stale (initial default).
                    // But store values (tool, etc.) are available via store hooks which might be current.
                    // However, inside async init, we can't easily access updated store state unless we use refs or store.getState()
                    // Let's rely on the effect for store updates, but we can trigger a cursor update here 
                    // with the *current* state known to the component at this render cycle (which should be defaults or persisted state).
                    // Actually, let's just let the effect handle it, BUT we must ensure the effect triggers.
                    // The effect triggers on [..., renderManager]. setRenderManager(rm) will trigger it.
                    // So why didn't it work?
                    // Maybe the canvas styling wasn't ready?
                    // Let's explicitly call it here just to be safe using the component scope variables.
                    updateCursorForTool(rm.app.canvas, tool, penSize, eraserSize, colorStr, zoom);
                }
            } else {
                if (rm) rm.destroy();
            }
        };

        init();

        const handleResize = () => {
            if (isMounted && containerRef.current && rm) {
                rm.resize(
                    containerRef.current.clientWidth,
                    containerRef.current.clientHeight
                );
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            isMounted = false;
            window.removeEventListener('resize', handleResize);
            if (rm) {
                rm.destroy();
                rm = null;
            }
        };
    }, []);

    // React to Store Changes: Items
    const items = useWhiteboardStore((state) => state.items);
    useEffect(() => {
        if (!renderManager) return;
        renderManager.renderItems(items);
    }, [items, renderManager]);



    // React to Store Changes: Pan/Zoom
    useEffect(() => {
        if (!renderManager) return;
        const stage = renderManager.app.stage;
        stage.position.set(pan.x, pan.y);
        stage.scale.set(zoom);
        renderManager.setZoom(zoom);
    }, [pan, zoom, renderManager]);

    // React to Store Changes: Selection
    const selectedIds = useWhiteboardStore((state) => state.selectedIds);
    useEffect(() => {
        if (!renderManager) return;
        renderManager.renderSelection(selectedIds, items);
    }, [selectedIds, items, renderManager]);

    // Hook: Drawing Logic
    useWhiteboardDrawing(renderManager);

    // Hook: Interaction Logic (Select, Move)
    useWhiteboardInteraction(renderManager);

    // Hook: Panning & Zooming
    useWhiteboardPanning(renderManager);

    // Hook: Sync Logic
    const { broadcastCursor, broadcastEvent } = useWhiteboardSync(renderManager);

    // Broadcast local cursor move (non-drawing)
    const broadcastCursorRef = useRef(broadcastCursor);
    useEffect(() => {
        broadcastCursorRef.current = broadcastCursor;
    }, [broadcastCursor]);

    useEffect(() => {
        if (!renderManager) return;
        const canvas = renderManager.app.canvas;

        const throttledBroadcast = throttle((x: number, y: number, t: string) => {
            broadcastCursorRef.current(x, y, t);
        }, 50);

        const handleMouseMove = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            // Important: Use latest pan/zoom from store closure or ref
            // In a throttle, we might have stale values if not careful.
            // But since this effect depends on [pan, zoom, tool], it re-attaches.
            const x = (e.clientX - rect.left - pan.x) / zoom;
            const y = (e.clientY - rect.top - pan.y) / zoom;

            throttledBroadcast(x, y, tool);
        };

        canvas.addEventListener('pointermove', handleMouseMove);
        return () => canvas.removeEventListener('pointermove', handleMouseMove);
    }, [renderManager, pan, zoom, tool]);

    // Drop Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) redo();
                    else undo();
                } else if (e.key === 'y') {
                    e.preventDefault();
                    redo();
                } else if (e.key === '0') {
                    e.preventDefault();
                    setZoom(1);
                    setPan(0, 0);
                } else if (e.key === '=') {
                    e.preventDefault();
                    zoomFunc(ZOOM_SETTINGS.step);
                } else if (e.key === '-') {
                    e.preventDefault();
                    zoomFunc(-ZOOM_SETTINGS.step);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, setZoom, setPan, zoom]);



    // Custom Cursor Logic
    useEffect(() => {
        if (!renderManager) return;
        const canvas = renderManager.app.canvas;
        updateCursorForTool(canvas, tool, penSize, eraserSize, colorStr, zoom);
    }, [tool, penSize, eraserSize, colorStr, zoom, renderManager, updateCursorForTool]);

    // Drop Handler
    const handleDropReal = (e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);

        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target?.result as string;
                    if (dataUrl && renderManager) {
                        const rect = renderManager.app.canvas.getBoundingClientRect();
                        const x = (e.clientX - rect.left - pan.x) / zoom;
                        const y = (e.clientY - rect.top - pan.y) / zoom;

                        addItem({
                            id: uuidv4(),
                            type: 'image',
                            data: { url: dataUrl }, // Store DataURL for local (should upload to server in real app)
                            transform: { x, y, scaleX: 1, scaleY: 1, rotation: 0 },
                            zIndex: Date.now()
                        });
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    };

    const zoomFunc = (factor: number) => {
        const newZoom = Math.min(Math.max(ZOOM_SETTINGS.min, zoom + factor), ZOOM_SETTINGS.max);
        setZoom(newZoom);
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-white touch-none overflow-hidden select-none outline-none"
            onDrop={handleDropReal}
            onDragOver={(e) => e.preventDefault()}
        >
            {/* Grid Background */}
            <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(${GRID_SETTINGS.dotColor} ${GRID_SETTINGS.dotSize}px, transparent ${GRID_SETTINGS.dotSize}px)`,
                    backgroundSize: `${GRID_SETTINGS.baseSize * zoom}px ${GRID_SETTINGS.baseSize * zoom}px`,
                    backgroundPosition: `${pan.x}px ${pan.y}px`,
                    opacity: 0.15 + (zoom * 0.05) // Dynamic opacity based on zoom
                }}
            />

            {/* Zoom Controls */}
            <ZoomControls
                scale={zoom}
                onZoomIn={() => zoomFunc(ZOOM_SETTINGS.step)}
                onZoomOut={() => zoomFunc(-ZOOM_SETTINGS.step)}
                onResetZoom={() => {
                    setZoom(1);
                    setPan(0, 0);
                }}
            />

            {/* Toolbar */}
            <WhiteboardToolbar
                onUndo={() => undo()}
                onRedo={() => redo()}
                onClear={() => {
                    if (window.confirm("정말로 모든 내용을 지우시겠습니까?")) {
                        clearItems();
                        // Broadcast Clear
                        if (broadcastEvent) broadcastEvent('clear', {});

                        // Persist Clear to Backend
                        fetch(`${API_URL}/api/whiteboard/${meetingId}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        }).catch(err => console.error("Failed to clear backend", err));
                    }
                }}
            />
        </div>
    );
}
