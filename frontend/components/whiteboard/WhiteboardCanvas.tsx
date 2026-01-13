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
import { getProxiedUrl } from './utils/urlUtils';
import { ZoomControls } from './components/ZoomControls';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GRID_SETTINGS, ZOOM_SETTINGS } from './constants';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

import { useWhiteboardPanning } from './hooks/useWhiteboardPanning';
import { WhiteboardContextMenu } from './WhiteboardContextMenu';

interface WhiteboardCanvasProps {
    meetingId: string;
    currentUser?: {
        id: string;
        name: string;
        profileImage?: string;
    };
}

export default function WhiteboardCanvas({ meetingId: propMeetingId, currentUser }: WhiteboardCanvasProps) {
    const params = useParams();
    const meetingId = propMeetingId || (params.meetingId as string);
    const containerRef = useRef<HTMLDivElement>(null);
    const [renderManager, setRenderManager] = useState<RenderManager | null>(null);
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

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

    // React to Store Changes: Items (Logic moved to single source of truth in loadItems)


    const updateCursorForTool = useCallback((container: HTMLElement, currentTool: string, pSize: number, eSize: number, col: string, z: number) => {
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
            return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${cx} ${cx}, crosshair`;
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
            return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${cx} ${cx}, cell`;
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

            return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${cx} ${cy}, auto`;
        };

        if (currentTool === 'pen') {
            container.style.cursor = generatePenCursor(pSize, col);
        } else if (currentTool === 'magic-pen') {
            container.style.cursor = generateMagicPenCursor(pSize, col);
        } else if (currentTool === 'eraser') {
            container.style.cursor = generateEraserCursor(eSize);
        } else if (currentTool === 'pan') {
            container.style.cursor = 'grab';
        } else if (currentTool === 'select') {
            container.style.cursor = 'default';
        } else {
            container.style.cursor = 'crosshair';
        }
    }, []);

    const loadItems = useCallback(async () => {
        if (!meetingId) return;
        console.log(`[Whiteboard] loadItems called for meetingId: ${meetingId}`);
        try {
            const res = await fetch(`${API_URL}/api/whiteboard/${meetingId}`, {
                credentials: 'include'
            });
            console.log(`[Whiteboard] Fetch status: ${res.status}`);
            if (res.ok) {
                const data = await res.json();
                console.log(`[Whiteboard] Loaded ${data.length} items from server.`);

                // If server returns empty list, but we have local items for THIS meeting,
                // trust local items (assume backend persistence failure or lag).
                // since we cleared store on meeting switch, any local items MUST be from this session.
                const currentItems = useWhiteboardStore.getState().items;
                if (Array.isArray(data) && data.length === 0 && currentItems.size > 0) {
                    console.warn(`[Whiteboard] Server returned 0 items but local has ${currentItems.size}. Ignoring empty server response to preserve local work.`);
                    return;
                }

                setItems(data);
            } else {
                console.error(`[Whiteboard] Fetch failed: ${res.statusText}`);
            }
        } catch (err) {
            console.error("Failed to load whiteboard items", err);
        }
    }, [meetingId, setItems]);

    // Manage Meeting Context & Initial Load
    useEffect(() => {
        if (!meetingId) return;

        const store = useWhiteboardStore.getState();

        // If we switched meetings, clear the store
        if (store.meetingId !== meetingId) {
            console.log(`[Whiteboard] Meeting changed from ${store.meetingId} to ${meetingId}. Clearing local store.`);
            store.clearItems();
            store.setMeetingId(meetingId);
        }

        loadItems();
    }, [meetingId, loadItems]);

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
                console.log('[WhiteboardCanvas] Setting RenderManager instance');
                setRenderManager(rm);
                // Force initial cursor update immediately after initialization
                if (container) {
                    // Rely on the useEffect [renderManager] to trigger the initial cursor update
                    // The effect at line 372 will run as soon as setRenderManager(rm) happens and state updates.
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
        console.log(`[WhiteboardCanvas] renderManager active. Rendering ${items.size} items.`);
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

    // Hook: Sync Logic (Move this UP so we can pass it to other hooks)
    const { broadcastCursor, broadcastEvent } = useWhiteboardSync(renderManager, meetingId, loadItems, currentUser);

    const handleClearConfirm = useCallback(() => {
        const { clearItems } = useWhiteboardStore.getState();
        clearItems();
        // Broadcast Clear
        if (broadcastEvent) broadcastEvent('clear', { meetingId });
        setIsClearDialogOpen(false);
    }, [meetingId, broadcastEvent]);

    useWhiteboardDrawing(renderManager, meetingId, broadcastEvent, broadcastCursor);

    // Hook: Interaction Logic (Select, Move)
    useWhiteboardInteraction(renderManager, meetingId, broadcastEvent);

    // Hook: Panning & Zooming
    useWhiteboardPanning(renderManager);

    // SERVER-SIDE SYNC LOGIC FOR UNDO/REDO
    const syncStateChanges = useCallback(async (beforeItems: Map<string, any>, afterItems: Map<string, any>) => {
        // 1. Detect Deleted Items (Present in Before, Missing in After)
        beforeItems.forEach((item, id) => {
            if (!afterItems.has(id)) {
                // It was deleted locally by Undo/Redo. Sync this delete.
                broadcastEvent('delete_item', { id });
            }
        });

        // 2. Detect Created Items (Missing in Before, Present in After)
        afterItems.forEach((item, id) => {
            if (!beforeItems.has(id)) {
                // It was created/restored locally. Sync this create.
                broadcastEvent('add_item', item);
            } else {
                // 3. Detect Updated Items (Present in Both, but changed)
                const beforeItem = beforeItems.get(id);
                if (beforeItem !== item) {
                    // Item changed (reference comparison works because store makes updates immutable)
                    broadcastEvent('update_item', { id, changes: item });
                }
            }
        });
    }, [meetingId, broadcastEvent]);

    const performUndo = useCallback(async () => {
        const before = new Map(useWhiteboardStore.getState().items);
        useWhiteboardStore.getState().undo();
        const after = useWhiteboardStore.getState().items;
        await syncStateChanges(before, after);
    }, [syncStateChanges]);

    const performRedo = useCallback(async () => {
        const before = new Map(useWhiteboardStore.getState().items);
        useWhiteboardStore.getState().redo();
        const after = useWhiteboardStore.getState().items;
        await syncStateChanges(before, after);
    }, [syncStateChanges]);

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

            // Update Local Cursor Immediately
            if (renderManager) {
                renderManager.updateLocalCursor(x, y, {
                    tool: tool,
                    name: currentUser?.name || 'Me',
                    avatar: currentUser?.profileImage
                });
            }

            throttledBroadcast(x, y, tool);
        };

        const handleMouseLeave = () => {
            if (renderManager) {
                renderManager.hideLocalCursor();
            }
        };

        canvas.addEventListener('pointermove', handleMouseMove);
        canvas.addEventListener('pointerleave', handleMouseLeave);

        return () => {
            canvas.removeEventListener('pointermove', handleMouseMove);
            canvas.removeEventListener('pointerleave', handleMouseLeave);
        };
    }, [renderManager, pan, zoom, tool, currentUser]);

    // Drop Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) performRedo();
                    else performUndo();
                } else if (e.key === 'y') {
                    e.preventDefault();
                    performRedo();
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
        if (renderManager && containerRef.current) {
            renderManager.app.canvas.style.cursor = 'inherit';
            updateCursorForTool(containerRef.current, tool, penSize, eraserSize, colorStr, zoom);
        }
    }, [tool, penSize, eraserSize, colorStr, zoom, renderManager, updateCursorForTool]);

    // Drop Handler
    // Drop Handler
    const handleDropReal = async (e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        const workspaceId = params?.id as string; // From useParams in parent scope if available, or fetch from URL

        if (!workspaceId) {
            console.error("Workspace ID not found for upload");
            // Fallback to local only handling (original behavior) or return?
            // Let's fallback to original behavior if no workspaceId
        }

        for (const file of files) {
            if (file.type.startsWith('image/')) {
                let finalUrl: string | null = null;

                // 1. Try Uploading to Workspace Storage
                if (workspaceId) {
                    try {
                        const formData = new FormData();
                        formData.append('file', file);
                        const uploadRes = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files`, {
                            method: 'POST',
                            credentials: 'include',
                            body: formData
                        });

                        if (uploadRes.ok) {
                            // Current API returns list of uploaded files or the file object? 
                            // Based on useWorkspaceFiles, it seems to just return success or data.
                            // We need the ID to get the presigned URL.
                            // Assuming backend returns the created file object(s).
                            // Let's check useWorkspaceFiles again... "await response.json()".
                            // It throws away the result and calls fetchFiles(). 
                            // We might need to guess the behavior or inspect the response.

                            // Let's assume we can get the presigned URL if we find the file.
                            // Actually, simpler approach:
                            // We upload. Then strictly speaking we need a URL for the whiteboard.
                            // If we can't easily get the ID, we might have to use DataURL for the whiteboard 
                            // BUT still having uploaded it satisfies the "add to file tab" requirement.

                            // However, strictly better to use remote URL.
                            // Let's optimistic: Upload, and if response contains ID, use it.
                            const uploadData = await uploadRes.json();
                            // If uploadData is array or object...
                            const uploadedFile = Array.isArray(uploadData) ? uploadData[0] : (uploadData.files?.[0] || uploadData);

                            if (uploadedFile && uploadedFile.id) {
                                // Get Presigned URL
                                const urlRes = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files/${uploadedFile.id}/download`, {
                                    credentials: 'include'
                                });
                                if (urlRes.ok) {
                                    const urlData = await urlRes.json();
                                    finalUrl = urlData.presignedUrl;
                                }
                            }
                        }
                    } catch (err) {
                        console.error("Upload failed, falling back to local", err);
                    }
                }

                // 2. Read locally (fallback or immediate display if we handled async differently, 
                // but here we awaited. If upload failed, we use Data URL).
                if (!finalUrl) {
                    // Fallback to Data URL
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const dataUrl = event.target?.result as string;
                        addToCanvas(dataUrl, e.clientX, e.clientY);
                    };
                    reader.readAsDataURL(file);
                } else {
                    addToCanvas(finalUrl, e.clientX, e.clientY);
                }
            }
        }
    };

    const addToCanvas = (url: string, clientX: number, clientY: number) => {
        if (!renderManager) return;
        const img = new Image();
        img.onload = () => {
            const rect = renderManager.app.canvas.getBoundingClientRect();
            const x = (clientX - rect.left - pan.x) / zoom;
            const y = (clientY - rect.top - pan.y) / zoom;

            // Limit Max Size
            const MAX_SIZE = 500;
            let w = img.width;
            let h = img.height;

            if (w > MAX_SIZE || h > MAX_SIZE) {
                const ratio = w / h;
                if (w > h) {
                    w = MAX_SIZE;
                    h = MAX_SIZE / ratio;
                } else {
                    h = MAX_SIZE;
                    w = MAX_SIZE * ratio;
                }
            }

            addItem({
                id: uuidv4(),
                type: 'image',
                data: {
                    url: url,
                    width: w,
                    height: h
                },
                transform: { x: x - w / 2, y: y - h / 2, scaleX: 1, scaleY: 1, rotation: 0 },
                zIndex: Date.now()
            });
        };
        img.onerror = () => {
            console.error("Failed to load image for canvas", url);
            // Verify if presigned URL is valid or expired? Should be fresh.
            // If local data URL failed, that's weird.
        };
        // Handle CORS for canvas if it's remote
        img.crossOrigin = "anonymous";
        // Use proxy for loading to avoid CORS issues
        img.src = getProxiedUrl(url);
    };

    const zoomFunc = (factor: number) => {
        const newZoom = Math.min(Math.max(ZOOM_SETTINGS.min, zoom + factor), ZOOM_SETTINGS.max);
        setZoom(newZoom);
    };

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [isToolbarSettingsOpen, setIsToolbarSettingsOpen] = useState(false);

    // Delete Key Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) {
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                const selected = useWhiteboardStore.getState().selectedIds;
                if (selected.size > 0) {
                    // Batch delete
                    selected.forEach(id => {
                        useWhiteboardStore.getState().deleteItem(id);
                        broadcastEvent('delete_item', { id });
                    });
                    useWhiteboardStore.getState().clearSelection();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [meetingId]); // broadcastEvent dependency? It's global/hook scope.

    // Context Menu Handler

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();

        // 1. Strict Restriction: Must have items selected
        // Correctly retrieve store state inside handler
        const currentSelectedIds = useWhiteboardStore.getState().selectedIds;

        if (currentSelectedIds.size === 0) {
            setContextMenu(null);
            return;
        }

        // Hit test setup
        if (!renderManager) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const worldX = (x - pan.x) / zoom;
        const worldY = (y - pan.y) / zoom;

        // 2. Only check against CURRENTLY SELECTED items
        const items = useWhiteboardStore.getState().items;
        let hitSelected = false;

        // Iterate selected items to see if we clicked inside one of them
        for (const id of currentSelectedIds) {
            const item = items.get(id);
            if (!item) continue;

            const localBounds = renderManager.getLocalBounds(item);

            // Filter out invalid/invisible items just in case
            const color = item.data?.color;
            if (color === 'eraser' || color === '#ffffff' || color === 0xffffff) continue;
            if (localBounds.width <= 0 || localBounds.height <= 0) continue;

            // OBB Logic
            const cx = localBounds.x + localBounds.width / 2;
            const cy = localBounds.y + localBounds.height / 2;

            const centerX = item.transform.x + cx;
            const centerY = item.transform.y + cy;

            const dx = worldX - centerX;
            const dy = worldY - centerY;

            const r = -(item.transform.rotation || 0);
            const rx = dx * Math.cos(r) - dy * Math.sin(r);
            const ry = dx * Math.sin(r) + dy * Math.cos(r);

            const sx = item.transform.scaleX || 1;
            const sy = item.transform.scaleY || 1;

            const localX = rx / sx;
            const localY = ry / sy;

            const checkX = localX + cx;
            const checkY = localY + cy;

            // console.log(`HitTest ID=${id}: World(${worldX.toFixed(0)},${worldY.toFixed(0)}) -> Local(${checkX.toFixed(0)},${checkY.toFixed(0)}) in Bounds[${localBounds.x}, ${localBounds.y}, ${localBounds.width}, ${localBounds.height}]`);

            if (checkX >= localBounds.x && checkX <= localBounds.x + localBounds.width &&
                checkY >= localBounds.y && checkY <= localBounds.y + localBounds.height) {
                hitSelected = true;
                break; // Found a hit on a selected item
            }
        }

        if (hitSelected) {
            setContextMenu({ x: e.clientX, y: e.clientY });
        } else {
            setContextMenu(null);
        }
    };

    const handleMenuAction = async (action: 'delete' | 'duplicate' | 'rotate-45') => {
        console.log("Menu Action Triggered:", action);
        const currentSelectedIds = useWhiteboardStore.getState().selectedIds;
        if (currentSelectedIds.size === 0) return;
        setContextMenu(null);

        const items = useWhiteboardStore.getState().items;

        if (action === 'delete') {
            // Removed confirmation as per user request
            currentSelectedIds.forEach(id => {
                useWhiteboardStore.getState().deleteItem(id);
                broadcastEvent('delete_item', { id });
            });
            useWhiteboardStore.getState().clearSelection();
        } else if (action === 'duplicate') {
            currentSelectedIds.forEach(id => {
                const item = items.get(id);
                if (item) {
                    const newItem = {
                        ...item,
                        id: uuidv4(),
                        transform: {
                            ...item.transform,
                            x: item.transform.x + 20,
                            y: item.transform.y + 20
                        },
                        zIndex: Date.now()
                    };
                    useWhiteboardStore.getState().addItem(newItem);
                    broadcastEvent('add_item', newItem);
                }
            });
        } else if (action === 'rotate-45') {
            currentSelectedIds.forEach(id => {
                const item = items.get(id);
                if (item) {
                    const currentRot = item.transform.rotation || 0;
                    // Rotate 45 degrees (PI/4)
                    const newR = currentRot + (Math.PI / 4);
                    useWhiteboardStore.getState().updateItem(id, { transform: { ...item.transform, rotation: newR } });
                    broadcastEvent('update_item', { id, transform: { ...item.transform, rotation: newR } });
                }
            });
        }
    };


    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-white touch-none overflow-hidden select-none outline-none"
            onDrop={handleDropReal}
            onDragOver={(e) => e.preventDefault()}
            onPointerDown={() => { setIsToolbarSettingsOpen(false); setContextMenu(null); }}
            onContextMenu={handleContextMenu}
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

            {/* Context Menu */}
            {contextMenu && (
                <WhiteboardContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onAction={handleMenuAction}
                />
            )}

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
                onUndo={performUndo}
                onRedo={performRedo}
                isSettingsOpen={isToolbarSettingsOpen}
                onSettingsOpenChange={setIsToolbarSettingsOpen}
                onClear={() => setIsClearDialogOpen(true)}
            />

            <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>모든 내용을 지우시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 작업은 화이트보드의 모든 드로잉과 객체를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearConfirm}>확인</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
