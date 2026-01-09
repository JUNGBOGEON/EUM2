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
            } else {
                rm.destroy();
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

    // Force cursor update when renderManager first becomes available
    useEffect(() => {
        if (renderManager && renderManager.app && renderManager.app.canvas) {
            updateCursorForTool(renderManager.app.canvas, tool, penSize, eraserSize, colorStr, zoom);
        }
    }, [renderManager]); // Only trigger when renderManager changes (i.e., initialized)

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

    // Helper function to update cursor
    const updateCursorForTool = useCallback((canvas: HTMLCanvasElement, currentTool: string, pSize: number, eSize: number, col: string, z: number) => {
        const generatePenCursor = (size: number, color: string) => {
            const r = Math.max(2, size / 2);
            const svgSize = Math.max(16, r * 2 + 4);
            const cx = svgSize / 2;
            const svg = `
                <svg xmlns='http://www.w3.org/2000/svg' height='${svgSize}' width='${svgSize}'>
                    <circle cx='${cx}' cy='${cx}' r='${r}' fill='${color}' />
                    <circle cx='${cx}' cy='${cx}' r='${r + 0.5}' stroke='white' stroke-width='1' fill='none' opacity='0.5'/>
                </svg>
            `.trim().replace(/\s+/g, ' ');
            return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${cx} ${cx}, crosshair`;
        };

        const generateEraserCursor = (size: number) => {
            const r = Math.max(4, size / 2);
            const svgSize = Math.max(16, r * 2 + 4);
            const cx = svgSize / 2;
            const svg = `
                <svg xmlns='http://www.w3.org/2000/svg' height='${svgSize}' width='${svgSize}'>
                    <circle cx='${cx}' cy='${cx}' r='${r}' stroke='black' stroke-width='1' fill='white' opacity='0.8'/>
                </svg>
            `.trim().replace(/\s+/g, ' ');
            return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${cx} ${cx}, cell`;
        };

        if (currentTool === 'pen' || currentTool === 'magic-pen') {
            canvas.style.cursor = generatePenCursor(pSize * z, col);
        } else if (currentTool === 'eraser') {
            canvas.style.cursor = generateEraserCursor(eSize * z);
        } else if (currentTool === 'pan') {
            canvas.style.cursor = 'grab';
        } else if (currentTool === 'select') {
            canvas.style.cursor = 'default';
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }, []);

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
                    backgroundImage: `radial-gradient(${GRID_SETTINGS.dotColor} ${GRID_SETTINGS.dotSize / zoom}px, transparent ${GRID_SETTINGS.dotSize / zoom}px)`,
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
