import { useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useParams } from 'next/navigation';
import { useWhiteboardStore, WhiteboardItem } from '../store';
import { RenderManager } from '../RenderManager';

interface DragState {
    type: 'move' | 'handle' | 'box';
    initialPoint: { x: number; y: number };
    initialItemTransforms: Map<string, WhiteboardItem['transform']>;
    handle?: string;
    initialBounds?: { x: number, y: number, width: number, height: number };
    contentBounds?: { minX: number, minY: number, maxX: number, maxY: number };
    center?: { x: number, y: number };
    worldCenter?: { x: number, y: number };
    initialAngle?: number;
    initialSelectedIds?: Set<string>;
    groupBounds?: { minX: number, minY: number, maxX: number, maxY: number };
    groupCenter?: { x: number, y: number };
    initialLocalCenters?: Map<string, { x: number, y: number }>;
    isOBB?: boolean;
    rotationOffset?: number;
    rotation?: number;
    halfW?: number;
    halfH?: number;
}

export function useWhiteboardInteraction(
    renderManager: RenderManager | null,
    meetingId: string,
    broadcastEvent?: (type: string, data: any) => void,
    onContextMenu?: (state: { x: number, y: number } | null) => void,
    setEditingItem?: (id: string | null) => void
) {
    const {
        tool, zoom, pan, selectedIds, items,
        selectItem, clearSelection, updateItem, pushHistory,
        pendingImage, setPendingImage, setTool, addItem, setSelectedIds
    } = useWhiteboardStore();

    // Stable state ref
    const stateRef = useRef({ tool, zoom, pan, selectedIds, items, pendingImage });
    useEffect(() => {
        stateRef.current = { tool, zoom, pan, selectedIds, items, pendingImage };
    }, [tool, zoom, pan, selectedIds, items, pendingImage]);

    const isDragging = useRef<DragState | null>(null);

    const getLocalPoint = useCallback((e: PointerEvent | MouseEvent) => {
        if (!renderManager) return { x: 0, y: 0 };
        const rect = renderManager.app.canvas.getBoundingClientRect();
        const { pan: currentPan, zoom: currentZoom } = stateRef.current;
        return {
            x: (e.clientX - rect.left - currentPan.x) / currentZoom,
            y: (e.clientY - rect.top - currentPan.y) / currentZoom
        };
    }, [renderManager]);

    // Helper: Calculate Selection Bounds (OBB or AABB)
    const getSelectionBounds = useCallback(() => {
        const { selectedIds, items } = stateRef.current;
        if (selectedIds.size === 0) return null;

        // 1. Single Selection
        if (selectedIds.size === 1) {
            const id = Array.from(selectedIds)[0];
            const item = items.get(id);
            if (!item || !renderManager) return null;

            const lBounds = renderManager.getLocalBounds(item);
            const sx = item.transform.scaleX || 1;
            const sy = item.transform.scaleY || 1;
            const rot = item.transform.rotation || 0;

            // Half Dimensions
            const halfW = (lBounds.width * sx) / 2;
            const halfH = (lBounds.height * sy) / 2;

            // World Center
            const cx = lBounds.x + lBounds.width / 2;
            const cy = lBounds.y + lBounds.height / 2;
            const wcX = item.transform.x + cx;
            const wcY = item.transform.y + cy;

            return {
                isOBB: true,
                center: { x: wcX, y: wcY },
                halfW,
                halfH,
                rotation: rot,
                items: [item]
            };
        }

        // 2. Multi Selection
        const selectedItems: any[] = [];
        let commonRotation: number | null = null;
        let isCommon = true;

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
                    if (diff > 0.1) isCommon = false;
                }
            }
        });

        if (selectedItems.length === 0 || !renderManager) return null;

        if (isCommon && commonRotation !== null) {
            // OBB Group
            const cos = Math.cos(-commonRotation);
            const sin = Math.sin(-commonRotation);
            let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;

            selectedItems.forEach(item => {
                const b = renderManager.getLocalBounds(item);
                const t = item.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1 };
                const cx = b.x + b.width / 2;
                const cy = b.y + b.height / 2;
                const wcX = t.x + cx;
                const wcY = t.y + cy;
                const hw = (b.width * (t.scaleX || 1)) / 2;
                const hh = (b.height * (t.scaleY || 1)) / 2;

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

            const rCos = Math.cos(commonRotation);
            const rSin = Math.sin(commonRotation);
            const wcX = centerU * rCos - centerV * rSin;
            const wcY = centerU * rSin + centerV * rCos;

            return {
                isOBB: true,
                center: { x: wcX, y: wcY },
                halfW: w / 2,
                halfH: h / 2,
                rotation: commonRotation,
                items: selectedItems
            };
        } else {
            // AABB Fallback
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            selectedItems.forEach(item => {
                const b = renderManager.getLocalBounds(item);
                const sx = item.transform.scaleX || 1;
                const sy = item.transform.scaleY || 1;
                const cx = b.x + b.width / 2;
                const cy = b.y + b.height / 2;
                const wcX = item.transform.x + cx;
                const wcY = item.transform.y + cy; // Fix: was missing definition in old code, assuming simple transform
                const rot = item.transform.rotation || 0;

                // Calculate AABB of rotated item
                // transform 4 corners
                const hw = (b.width * sx) / 2;
                const hh = (b.height * sy) / 2;
                const iCos = Math.cos(rot);
                const iSin = Math.sin(rot);

                const corners = [
                    { x: -hw, y: -hh }, { x: hw, y: -hh },
                    { x: hw, y: hh }, { x: -hw, y: hh }
                ];

                corners.forEach(p => {
                    const wx = wcX + (p.x * iCos - p.y * iSin);
                    const wy = wcY + (p.x * iSin + p.y * iCos);
                    if (wx < minX) minX = wx;
                    if (wy < minY) minY = wy;
                    if (wx > maxX) maxX = wx;
                    if (wy > maxY) maxY = wy;
                });
            });

            if (minX === Infinity) return null;

            const w = maxX - minX;
            const h = maxY - minY;

            return {
                isOBB: false,
                bounds: { minX, minY, maxX, maxY },
                center: { x: minX + w / 2, y: minY + h / 2 },
                halfW: w / 2,
                halfH: h / 2
            };
        }
    }, [renderManager]);

    const isPointInSelection = useCallback((point: { x: number, y: number }) => {
        const bounds = getSelectionBounds();
        if (!bounds) return false;

        const { isOBB, center, halfW, halfH, rotation, bounds: aabb } = bounds;
        const padding = 10 / (renderManager?.currentZoom || 1); // Helper padding

        if (isOBB && center) {
            // Inverse rotate point
            const dx = point.x - center.x;
            const dy = point.y - center.y;
            const rot = rotation || 0;
            const cos = Math.cos(-rot);
            const sin = Math.sin(-rot);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;

            return Math.abs(localX) <= halfW! + padding && Math.abs(localY) <= halfH! + padding;
        } else if (aabb) {
            return point.x >= aabb.minX - padding && point.x <= aabb.maxX + padding &&
                point.y >= aabb.minY - padding && point.y <= aabb.maxY + padding;
        }
        return false;
    }, [getSelectionBounds, renderManager]);

    const getGroupHandleAtPoint = useCallback((point: { x: number, y: number }) => {
        const boundsInfo = getSelectionBounds();
        if (!boundsInfo) return null;

        const currentZoom = renderManager?.currentZoom || 1;
        const resizeRadius = 12 / currentZoom;

        const { isOBB, center, halfW, halfH, rotation, bounds, items } = boundsInfo;

        if (isOBB && center) {
            const rot = rotation || 0;
            const cos = Math.cos(rot);
            const sin = Math.sin(rot);

            const rotate = (x: number, y: number) => ({
                x: center.x + (x * cos - y * sin),
                y: center.y + (x * sin + y * cos)
            });

            // Adaptive Cursor Logic
            const getCursorForHandle = (h: string, r: number) => {
                let base = 0;
                if (h === 't') base = 0; else if (h === 'tr') base = 45;
                else if (h === 'r') base = 90; else if (h === 'br') base = 135;
                else if (h === 'b') base = 180; else if (h === 'bl') base = 225;
                else if (h === 'l') base = 270; else if (h === 'tl') base = 315;

                const deg = (r * 180) / Math.PI;
                const total = ((base + deg) % 360 + 360) % 360;
                const sector = Math.round(total / 45) % 4;

                switch (sector) {
                    case 0: return 'ns-resize';
                    case 1: return 'nesw-resize';
                    case 2: return 'ew-resize';
                    case 3: return 'nwse-resize';
                }
                return 'move';
            };

            const hW = halfW!;
            const hH = halfH!;

            const handles = {
                tl: { ...rotate(-hW, -hH) },
                tr: { ...rotate(hW, -hH) },
                bl: { ...rotate(-hW, hH) },
                br: { ...rotate(hW, hH) },
                t: { ...rotate(0, -hH) },
                b: { ...rotate(0, hH) },
                l: { ...rotate(-hW, 0) },
                r: { ...rotate(hW, 0) }
            };

            for (const [key, c] of Object.entries(handles)) {
                const dist = Math.sqrt(Math.pow(point.x - c.x, 2) + Math.pow(point.y - c.y, 2));
                if (dist <= resizeRadius) {
                    return {
                        handle: key,
                        cursor: getCursorForHandle(key, rot),
                        bounds: null,
                        isOBB: true,
                        item: items && items.length === 1 ? items[0] : null,
                        center,
                        halfW: hW,
                        halfH: hH,
                        rotation: rot
                    };
                }
            }

            const topCenter = rotate(0, -hH - (24 / currentZoom));
            const dist = Math.sqrt(Math.pow(point.x - topCenter.x, 2) + Math.pow(point.y - topCenter.y, 2));
            if (dist <= resizeRadius) {
                return { handle: 'rotate', cursor: 'alias', bounds: null, isOBB: true, center, halfW: hW, halfH: hH, rotation: rot };
            }

        } else if (bounds) {
            // AABB Handles
            const { minX, minY, maxX, maxY } = bounds;
            const midX = (minX + maxX) / 2;
            const midY = (minY + maxY) / 2;

            const corners = {
                tl: { x: minX, y: minY, cursor: 'nwse-resize' },
                tr: { x: maxX, y: minY, cursor: 'nesw-resize' },
                bl: { x: minX, y: maxY, cursor: 'nesw-resize' },
                br: { x: maxX, y: maxY, cursor: 'nwse-resize' }
                // Add side handles for AABB if desired, but 4 corners is standard for groups in some apps.
                // Replicating old logic:
            };

            for (const [key, c] of Object.entries(corners)) {
                const dist = Math.sqrt(Math.pow(point.x - c.x, 2) + Math.pow(point.y - c.y, 2));
                if (dist <= resizeRadius) {
                    return { handle: key, cursor: c.cursor, bounds };
                }
            }
            // Rotate Handle for AABB Group (Top Center)
            const topY = minY - (24 / currentZoom);
            const dist = Math.sqrt(Math.pow(point.x - midX, 2) + Math.pow(point.y - topY, 2));
            if (dist <= resizeRadius) {
                return { handle: 'rotate', cursor: 'alias', bounds };
            }
        }
        return null;
    }, [renderManager, getSelectionBounds]);


    const findPostitAtPoint = useCallback((point: { x: number, y: number }) => {
        if (!renderManager) return null;
        const hitArea = { x: point.x - 1, y: point.y - 1, width: 2, height: 2 };
        const hits: any[] = [];
        renderManager.quadTree.retrieve(hits, hitArea);
        return hits.find(item => {
            if (item.type !== 'postit') return false;
            const t = item.transform || { x: 0, y: 0 };
            const w = item.data?.width || 200;
            const h = item.data?.height || 200;
            return point.x >= t.x && point.x <= t.x + w &&
                point.y >= t.y && point.y <= t.y + h;
        });
    }, [renderManager]);

    const onPointerDown = useCallback((e: PointerEvent) => {
        if (!renderManager) return;
        const point = getLocalPoint(e);
        const canvas = renderManager.app.canvas;
        const { tool: currentTool, selectedIds: currentSelectedIds, items: currentItems, pendingImage: currentPendingImage } = stateRef.current;

        // Image Placement
        if (currentTool === 'image' && currentPendingImage) {
            e.preventDefault();
            e.stopPropagation();

            const placeImage = (url: string) => {
                let targetW = currentPendingImage.width;
                let targetH = currentPendingImage.height;
                let tx = point.x - targetW / 2;
                let ty = point.y - targetH / 2;
                let parentId: string | undefined = undefined;

                const postit = findPostitAtPoint(point);
                if (postit) {
                    parentId = postit.id;
                    // Auto-scale to fit inside Post-it with padding
                    const pW = postit.data?.width || 200;
                    const pH = postit.data?.height || 200;
                    const maxW = pW - 40;
                    const maxH = pH - 40;

                    if (targetW > maxW || targetH > maxH) {
                        const ratio = Math.min(maxW / targetW, maxH / targetH);
                        targetW *= ratio;
                        targetH *= ratio;
                    }

                    // Convert to Local Coordinates (Top-Left relative to Post-it Top-Left)
                    tx = (point.x - postit.transform.x) - targetW / 2;
                    ty = (point.y - postit.transform.y) - targetH / 2;
                }

                const newItem = {
                    id: uuidv4(),
                    type: 'image' as const,
                    data: { url, width: targetW, height: targetH },
                    transform: { x: tx, y: ty, scaleX: 1, scaleY: 1, rotation: 0 },
                    zIndex: Date.now(),
                    isDeleted: false,
                    meetingId: meetingId,
                    userId: 'user',
                    parentId
                };
                addItem(newItem);
                if (broadcastEvent) broadcastEvent('add_item', newItem);
                setPendingImage(null);
                setTool('select');
                renderManager.renderGhost(null, 0, 0, 0, 0);
            };

            if (currentPendingImage.file) {
                const formData = new FormData();
                formData.append('file', currentPendingImage.file);
                formData.append('meetingName', meetingId);
                const uploadUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/whiteboard/upload`;
                fetch(uploadUrl, { method: 'POST', body: formData })
                    .then(res => res.json())
                    .then(data => { if (data.url) placeImage(data.url); })
                    .catch(err => console.error("Upload failed", err));
            } else if (currentPendingImage.url) {
                placeImage(currentPendingImage.url);
            }
            return;
        }



        // TEXT TOOL LOGIC - Only creates NEW text, doesn't edit existing
        if (currentTool === 'text') {
            e.preventDefault();
            e.stopPropagation();

            // Always create New Text (editing is done via Select tool double-click)
            let tx = point.x;
            let ty = point.y;
            let parentId: string | undefined = undefined;

            const postit = findPostitAtPoint(point);
            if (postit) {
                parentId = postit.id;
                tx = point.x - postit.transform.x;
                ty = point.y - postit.transform.y;
                console.log('[Text] Placing text inside Post-it:', parentId, tx, ty);
            }

            const id = uuidv4();
            const newItem: WhiteboardItem = {
                id,
                type: 'text',
                data: {
                    text: '',
                    fontSize: 24,
                    fontFamily: 'Arial',
                    color: useWhiteboardStore.getState().color // Use current selected color
                },
                transform: {
                    x: tx,
                    y: ty,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0
                },
                zIndex: Date.now(),
                meetingId: meetingId,
                parentId
            };

            addItem(newItem);
            if (broadcastEvent) broadcastEvent('add_item', newItem);
            if (setEditingItem) setEditingItem(id);
            return;
        }

        // POST-IT TOOL LOGIC - Creates new Post-it
        if (currentTool === 'postit') {
            e.preventDefault();
            e.stopPropagation();

            const id = uuidv4();
            const postitWidth = 200;
            const postitHeight = 200;

            const newItem: WhiteboardItem = {
                id,
                type: 'postit',
                data: {
                    width: postitWidth,
                    height: postitHeight,
                    color: 0xFFEB3B // Yellow default
                },
                transform: {
                    x: point.x - postitWidth / 2, // Center on click
                    y: point.y - postitHeight / 2,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0
                },
                zIndex: Date.now(),
                meetingId: meetingId
            };

            addItem(newItem);
            if (broadcastEvent) broadcastEvent('add_item', newItem);
            selectItem(id); // Select the new Post-it
            setTool('select'); // Switch to select tool
            if (renderManager) renderManager.renderGhost(null, 0, 0, 0, 0); // Clear ghost
            return;
        }


        if (currentTool !== 'select') return;

        // 1. Check Handles
        const hitHandle = getGroupHandleAtPoint(point);

        if (hitHandle) {
            const { handle, bounds, isOBB, center, rotation } = hitHandle;
            // ... (Handle logic setup)
            pushHistory();
            const initialTransforms = new Map();
            const initialLocalCenters = new Map();
            currentSelectedIds.forEach(id => {
                const item = currentItems.get(id);
                if (item) {
                    initialTransforms.set(id, { ...item.transform });
                    const lBounds = renderManager.getLocalBounds(item);
                    const cx = lBounds.x + lBounds.width / 2;
                    const cy = lBounds.y + lBounds.height / 2;
                    initialLocalCenters.set(id, { x: cx, y: cy });
                }
            });

            let groupCenter, initialAngle, groupBounds;
            if (isOBB) {
                groupCenter = center;
                initialAngle = Math.atan2(point.y - groupCenter.y, point.x - groupCenter.x);
            } else {
                const { minX, minY, maxX, maxY } = bounds!;
                const groupW = maxX - minX;
                const groupH = maxY - minY;
                groupCenter = { x: minX + groupW / 2, y: minY + groupH / 2 };
                initialAngle = Math.atan2(point.y - groupCenter.y, point.x - groupCenter.x);
                groupBounds = { minX, minY, maxX, maxY };
            }

            isDragging.current = {
                type: 'handle',
                handle: handle,
                initialPoint: point,
                initialItemTransforms: initialTransforms,
                initialLocalCenters,
                groupBounds,
                groupCenter,
                initialAngle,
                // @ts-ignore
                isOBB: isOBB,
                rotationOffset: isOBB ? rotation : 0,
                rotation: isOBB ? rotation : 0,
                halfW: (hitHandle as any).halfW,
                halfH: (hitHandle as any).halfH
            };
            canvas.setPointerCapture(e.pointerId);
            return;
        }

        // 2. CHECK IF INSIDE SELECTION BOX (New Feature)
        if (currentSelectedIds.size > 0 && isPointInSelection(point)) {
            // Drag entire selection
            const initialTransforms = new Map();
            currentSelectedIds.forEach(id => {
                const item = currentItems.get(id);
                if (item) initialTransforms.set(id, { ...item.transform });
            });
            pushHistory();
            isDragging.current = {
                type: 'move',
                initialPoint: point,
                initialItemTransforms: initialTransforms
            };
            canvas.setPointerCapture(e.pointerId);
            return;
        }

        // 3. Hit Test for Items (Select new item)
        const hitArea = { x: point.x - 5, y: point.y - 5, width: 10, height: 10 };
        const hits: any[] = [];
        renderManager.quadTree.retrieve(hits, hitArea);

        const clickedItem = hits.find(item => {
            const b = item.getBounds();
            // Basic AABB check first
            const bx = Math.min(b.x, b.x + b.width);
            const by = Math.min(b.y, b.y + b.height);
            const bw = Math.abs(b.width);
            const bh = Math.abs(b.height);
            const hitL = point.x - 5 / renderManager.currentZoom;
            const hitR = point.x + 5 / renderManager.currentZoom;
            const hitT = point.y - 5 / renderManager.currentZoom;
            const hitB = point.y + 5 / renderManager.currentZoom;
            if (!(hitL < bx + bw && hitR > bx && hitT < by + bh && hitB > by)) return false;

            // Strict OBB check for precision (especially for lines)
            const lb = renderManager.getLocalBounds(item);
            const sx = item.transform.scaleX || 1;
            const sy = item.transform.scaleY || 1;
            const rot = item.transform.rotation || 0;
            const cx = lb.x + lb.width / 2;
            const cy = lb.y + lb.height / 2;

            // Inverse rotate point to local
            const wcX = item.transform.x + cx;
            const wcY = item.transform.y + cy;
            const dx = point.x - wcX;
            const dy = point.y - wcY;
            const cos = Math.cos(-rot);
            const sin = Math.sin(-rot);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;

            const halfW = (lb.width * sx) / 2;
            const halfH = (lb.height * sy) / 2;

            const padding = 10 / renderManager.currentZoom; // Larger padding for easy selection
            return Math.abs(localX) <= halfW + padding && Math.abs(localY) <= halfH + padding;
        });

        if (clickedItem) {
            const initialTransforms = new Map();
            // Shift key logic handled in 'box' branch or here?
            // Standard behavior: Click unselected -> select only it. Click selected -> ready to move. 
            // We checked 'selected' already via `isPointInSelection` effectively.
            // If we are here, it means we clicked an item that is NOT covered by the current selection box (or no selection exists).
            // OR it's a new item.

            if (e.shiftKey) {
                // Add to selection
                const newSelected = new Set(currentSelectedIds);
                if (newSelected.has(clickedItem.id)) newSelected.delete(clickedItem.id);
                else newSelected.add(clickedItem.id);
                setSelectedIds(newSelected);
                // Don't drag immediately on shift-select usually
            } else {
                // Select ONLY this item
                selectItem(clickedItem.id);

                // And START DRAG immediately
                const item = currentItems.get(clickedItem.id);
                if (item) initialTransforms.set(clickedItem.id, { ...item.transform });
                pushHistory();
                isDragging.current = {
                    type: 'move',
                    initialPoint: point,
                    initialItemTransforms: initialTransforms
                };
                canvas.setPointerCapture(e.pointerId);
            }
        } else {
            // Box Select
            let baseSelection = new Set<string>();
            if (!e.shiftKey) {
                clearSelection();
                baseSelection = new Set();
            } else {
                baseSelection = new Set(stateRef.current.selectedIds);
            }
            isDragging.current = {
                type: 'box',
                initialPoint: point,
                initialItemTransforms: new Map(),
                initialSelectedIds: baseSelection
            };
            canvas.setPointerCapture(e.pointerId);
        }
    }, [renderManager, getLocalPoint, selectItem, clearSelection, pushHistory, getGroupHandleAtPoint, isPointInSelection, getSelectionBounds, addItem, setPendingImage, setTool, broadcastEvent, meetingId, setSelectedIds]);

    const onPointerMove = useCallback((e: PointerEvent) => {
        const point = getLocalPoint(e);

        if (!isDragging.current) {
            // ... (Ghost rendering)
            const CurrentState = useWhiteboardStore.getState();
            const tool = CurrentState.tool;
            const selectedIds = CurrentState.selectedIds;
            const pendingImage = CurrentState.pendingImage;

            if (tool === 'image' && pendingImage && renderManager) {
                renderManager.renderGhost('image', point.x, point.y, pendingImage.width, pendingImage.height, { url: pendingImage.url });
                renderManager.app.canvas.style.cursor = 'crosshair';
                return;
            } else if (tool === 'postit' && renderManager) {
                // Show Post-it Ghost
                renderManager.renderGhost('postit', point.x, point.y, 200, 200);
                renderManager.app.canvas.style.cursor = 'crosshair';
                return;
            } else {
                if (renderManager) renderManager.renderGhost(null, 0, 0, 0, 0);
            }

            if (renderManager && tool === 'select') {
                const canvas = renderManager.app.canvas;
                // Cursor Logic
                if (selectedIds.size > 0) {
                    // Check Handle
                    const hitHandle = getGroupHandleAtPoint(point);
                    if (hitHandle) {
                        canvas.style.cursor = hitHandle.cursor;
                        return;
                    }
                    // Check Body (Box)
                    if (isPointInSelection(point)) {
                        canvas.style.cursor = 'move';
                        return;
                    }
                }

                // Check Hover Item (if not in selection)
                const hitArea = { x: point.x - 5, y: point.y - 5, width: 10, height: 10 };
                const hits: any[] = [];
                renderManager.quadTree.retrieve(hits, hitArea);
                const hoveredItem = hits.find(item => {
                    // Reuse logic from pointer down or simpler AABB for hover efficiency
                    const b = item.getBounds();
                    // Simple checks... (Copied from existing code)
                    // ...
                    // Let's rely on just AABB for cursor hover to save perf, or reuse helper?
                    // The existing code did OBB. Let's keep existing code block but simplified here for brevity in replacement?
                    // No, must preserve logic.

                    const lb = renderManager.getLocalBounds(item);
                    const t = item.transform || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
                    const cx = lb.x + lb.width / 2;
                    const cy = lb.y + lb.height / 2;
                    const wcX = t.x + cx;
                    const wcY = t.y + cy;
                    const dx = point.x - wcX;
                    const dy = point.y - wcY;
                    const rot = t.rotation || 0;
                    const cos = Math.cos(-rot);
                    const sin = Math.sin(-rot);
                    const localX = dx * cos - dy * sin;
                    const localY = dx * sin + dy * cos;
                    const halfW = (lb.width * (t.scaleX || 1)) / 2;
                    const halfH = (lb.height * (t.scaleY || 1)) / 2;
                    const padding = 10 / renderManager.currentZoom;
                    return Math.abs(localX) <= halfW + padding && Math.abs(localY) <= halfH + padding;
                });

                if (hoveredItem) {
                    canvas.style.cursor = 'pointer'; // Indicating selectable
                } else {
                    canvas.style.cursor = 'default';
                }
            }
            return;
        }

        const { type, initialPoint, initialItemTransforms, groupBounds, handle, groupCenter, initialAngle, isOBB, rotationOffset, initialLocalCenters, initialSelectedIds } = isDragging.current as DragState;
        let dx = point.x - initialPoint.x;
        let dy = point.y - initialPoint.y;

        if (type === 'move') {
            initialItemTransforms.forEach((initialTransform: any, id: string) => {
                updateItem(id, {
                    transform: {
                        ...initialTransform,
                        x: initialTransform.x + dx,
                        y: initialTransform.y + dy
                    }
                });
            });
        } else if (type === 'handle' && groupCenter) {
            // ... (Keep existing Handle Logic)
            // Copy-pasting the complex rotation/resize logic from existing file...
            // Since I am replacing the whole file content mostly, I should ensure I don't lose the detailed math.
            // I will assume I need to write it out.

            if (handle === 'rotate' && initialAngle !== undefined) {
                const currentAngle = Math.atan2(point.y - groupCenter.y, point.x - groupCenter.x);
                let deltaAngle = currentAngle - initialAngle;

                if (e.shiftKey) {
                    const snap = Math.PI / 12;
                    deltaAngle = Math.round(deltaAngle / snap) * snap;
                }

                if (!isOBB) {
                    const { minX, minY, maxX, maxY } = groupBounds!;
                    renderManager?.setSelectionOverride({ cx: groupCenter.x, cy: groupCenter.y, w: maxX - minX, h: maxY - minY, rotation: deltaAngle });
                }

                initialItemTransforms.forEach((initialTransform: any, id: string) => {
                    const localCenter = initialLocalCenters?.get(id) || { x: 0, y: 0 };
                    const isSingle = useWhiteboardStore.getState().selectedIds.size === 1;

                    if (isOBB && isSingle) {
                        const newRotation = (initialTransform.rotation || 0) + deltaAngle;
                        updateItem(id, { transform: { ...initialTransform, rotation: newRotation } });
                        return;
                    }

                    const cos = Math.cos(deltaAngle);
                    const sin = Math.sin(deltaAngle);
                    const oldWorldCenterX = initialTransform.x + localCenter.x;
                    const oldWorldCenterY = initialTransform.y + localCenter.y;
                    const rx = oldWorldCenterX - groupCenter.x;
                    const ry = oldWorldCenterY - groupCenter.y;
                    const newWorldCenterX = groupCenter.x + (rx * cos - ry * sin);
                    const newWorldCenterY = groupCenter.y + (rx * sin + ry * cos);
                    const newRotation = (initialTransform.rotation || 0) + deltaAngle;
                    updateItem(id, { transform: { ...initialTransform, x: newWorldCenterX - localCenter.x, y: newWorldCenterY - localCenter.y, rotation: newRotation } });
                });

            } else {
                // RESIZE LOGIC (Simplified OBB/AABB Handling)
                if (initialItemTransforms.size === 1 && isOBB) {
                    // ... Single logic
                    const id = Array.from(initialItemTransforms.keys())[0] as string;
                    const initTx = initialItemTransforms.get(id);
                    if (initTx) {
                        const rot = initTx.rotation || 0;
                        const cos = Math.cos(-rot);
                        const sin = Math.sin(-rot);
                        const localDx = dx * cos - dy * sin;
                        const localDy = dx * sin + dy * cos;
                        let dW = 0; let dH = 0;
                        if (handle?.includes('l')) dW = -localDx;
                        if (handle?.includes('r')) dW = localDx;
                        if (handle?.includes('t')) dH = -localDy;
                        if (handle?.includes('b')) dH = localDy;

                        const item = useWhiteboardStore.getState().items.get(id);
                        if (!item) return;

                        const lBounds = renderManager?.getLocalBounds(item);
                        const baseW = Math.max(lBounds?.width || 0, 1);
                        const baseH = Math.max(lBounds?.height || 0, 1);
                        const initScaleX = initTx.scaleX || 1;
                        const initScaleY = initTx.scaleY || 1;
                        const curW = baseW * initScaleX;
                        const curH = baseH * initScaleY;
                        let newW = Math.max(1, curW + dW);
                        let newH = Math.max(1, curH + dH);
                        if (e.shiftKey) {
                            const s = Math.max(newW / curW, newH / curH);
                            newW = curW * s; newH = curH * s;
                        }
                        const newScaleX = newW / baseW;
                        const newScaleY = newH / baseH;
                        let centerShiftX = 0; let centerShiftY = 0;
                        if (handle?.includes('l')) centerShiftX = - (newW - curW) / 2;
                        if (handle?.includes('r')) centerShiftX = (newW - curW) / 2;
                        if (handle?.includes('t')) centerShiftY = - (newH - curH) / 2;
                        if (handle?.includes('b')) centerShiftY = (newH - curH) / 2;
                        const wCos = Math.cos(rot); const wSin = Math.sin(rot);
                        const worldShiftX = centerShiftX * wCos - centerShiftY * wSin;
                        const worldShiftY = centerShiftX * wSin + centerShiftY * wCos;
                        updateItem(id, {
                            transform: {
                                ...initTx,
                                x: initTx.x + worldShiftX,
                                y: initTx.y + worldShiftY,
                                scaleX: newScaleX,
                                scaleY: newScaleY
                            }
                        });
                    }
                } else {
                    // Multi logic (OBB or AABB)
                    const state = isDragging.current as any;
                    const rot = state.rotation || 0;

                    // Determine group dimensions
                    let groupW: number, groupH: number;
                    let anchorX: number, anchorY: number;

                    if (isOBB && state.halfW !== undefined && state.halfH !== undefined) {
                        // OBB Group: Use halfW/halfH from drag state
                        groupW = state.halfW * 2;
                        groupH = state.halfH * 2;

                        // Anchor is the opposite edge in local space, then rotated to world
                        const localAnchorX = handle?.includes('l') ? state.halfW : handle?.includes('r') ? -state.halfW : 0;
                        const localAnchorY = handle?.includes('t') ? state.halfH : handle?.includes('b') ? -state.halfH : 0;
                        const wCos = Math.cos(rot);
                        const wSin = Math.sin(rot);
                        anchorX = (groupCenter?.x || 0) + (localAnchorX * wCos - localAnchorY * wSin);
                        anchorY = (groupCenter?.y || 0) + (localAnchorX * wSin + localAnchorY * wCos);
                    } else if (groupBounds) {
                        // AABB Group
                        const { minX, minY, maxX, maxY } = groupBounds;
                        groupW = maxX - minX;
                        groupH = maxY - minY;
                        anchorX = handle?.includes('l') ? maxX : minX;
                        anchorY = handle?.includes('t') ? maxY : minY;
                    } else {
                        // Fallback (should not happen)
                        return;
                    }

                    // Calculate delta in local space (for OBB) or world space (for AABB)
                    let dW: number, dH: number;
                    if (isOBB) {
                        const cos = Math.cos(-rot);
                        const sin = Math.sin(-rot);
                        const localDx = dx * cos - dy * sin;
                        const localDy = dx * sin + dy * cos;
                        dW = handle?.includes('l') ? -localDx : handle?.includes('r') ? localDx : 0;
                        dH = handle?.includes('t') ? -localDy : handle?.includes('b') ? localDy : 0;
                    } else {
                        dW = handle?.includes('l') ? -dx : handle?.includes('r') ? dx : 0;
                        dH = handle?.includes('t') ? -dy : handle?.includes('b') ? dy : 0;
                    }

                    let newW = Math.max(1, groupW + dW);
                    let newH = Math.max(1, groupH + dH);

                    // Keep Aspect Ratio
                    if (e.shiftKey) {
                        const scale = Math.max(newW / groupW, newH / groupH);
                        newW = groupW * scale;
                        newH = groupH * scale;
                    }

                    let sx = newW / groupW;
                    let sy = newH / groupH;
                    if (!Number.isFinite(sx)) sx = 1;
                    if (!Number.isFinite(sy)) sy = 1;

                    initialItemTransforms.forEach((initialTransform: any, id: string) => {
                        const localCenter = initialLocalCenters?.get(id) || { x: 0, y: 0 };
                        const oldWorldCenterX = initialTransform.x + localCenter.x;
                        const oldWorldCenterY = initialTransform.y + localCenter.y;

                        // Scale relative to anchor
                        let newWorldCenterX: number, newWorldCenterY: number;
                        if (isOBB) {
                            // For OBB, scale in local space then rotate back
                            const wCos = Math.cos(rot);
                            const wSin = Math.sin(rot);
                            const cos = Math.cos(-rot);
                            const sin = Math.sin(-rot);

                            // Vector from anchor to item center
                            const vx = oldWorldCenterX - anchorX;
                            const vy = oldWorldCenterY - anchorY;

                            // Rotate to local, scale, rotate back
                            const lVx = vx * cos - vy * sin;
                            const lVy = vx * sin + vy * cos;
                            const slVx = lVx * sx;
                            const slVy = lVy * sy;
                            const nVx = slVx * wCos - slVy * wSin;
                            const nVy = slVx * wSin + slVy * wCos;

                            newWorldCenterX = anchorX + nVx;
                            newWorldCenterY = anchorY + nVy;
                        } else {
                            // AABB: Simple scale
                            newWorldCenterX = anchorX + (oldWorldCenterX - anchorX) * sx;
                            newWorldCenterY = anchorY + (oldWorldCenterY - anchorY) * sy;
                        }

                        let newScaleX = (initialTransform.scaleX || 1) * sx;
                        let newScaleY = (initialTransform.scaleY || 1) * sy;
                        if (!Number.isFinite(newScaleX)) newScaleX = 1;
                        if (!Number.isFinite(newScaleY)) newScaleY = 1;
                        updateItem(id, {
                            transform: {
                                ...initialTransform,
                                x: newWorldCenterX - localCenter.x,
                                y: newWorldCenterY - localCenter.y,
                                scaleX: newScaleX,
                                scaleY: newScaleY
                            }
                        });
                    });
                }
            }
        } else if (type === 'box') {
            // ... Box logic
            const x = Math.min(initialPoint.x, point.x);
            const y = Math.min(initialPoint.y, point.y);
            const width = Math.abs(point.x - initialPoint.x);
            const height = Math.abs(point.y - initialPoint.y);

            renderManager?.updateSelectionBox({ x, y, width, height });

            const hitArea = { x, y, width, height };
            const potentialHits: any[] = [];
            renderManager?.quadTree.retrieve(potentialHits, hitArea);

            const newSelectedIds = new Set<string>();

            potentialHits.forEach(item => {
                const b = item.getBounds();
                if (x < b.x + b.width && x + width > b.x &&
                    y < b.y + b.height && y + height > b.y) {
                    newSelectedIds.add(item.id);
                }
            });

            if (e.shiftKey && initialSelectedIds) {
                const finalSelection = new Set<string>(initialSelectedIds);
                potentialHits.forEach(item => {
                    const b = item.getBounds();
                    if (x < b.x + b.width && x + width > b.x &&
                        y < b.y + b.height && y + height > b.y) {
                        finalSelection.add(item.id);
                    } else {
                        if (initialSelectedIds.has(item.id)) {
                            // Keep original if not in box? No, logic is toggling or additive?
                            // Standard shift drag: Add to selection.
                            // Logic here: If in box, ADD. If NOT in box, keep original selection.
                            // But what if we want to deselect?
                            // Let's stick to additive.
                        }
                    }
                });
                setSelectedIds(finalSelection);
                renderManager?.renderSelection(finalSelection, useWhiteboardStore.getState().items);
            } else {
                setSelectedIds(newSelectedIds);
                renderManager?.renderSelection(newSelectedIds, useWhiteboardStore.getState().items);
            }
        }
    }, [getLocalPoint, updateItem, renderManager, isPointInSelection, getGroupHandleAtPoint, setSelectedIds]);

    const onPointerUp = useCallback((e: PointerEvent) => {
        renderManager?.setSelectionOverride(null);
        renderManager?.renderSelection(useWhiteboardStore.getState().selectedIds, useWhiteboardStore.getState().items);

        if (isDragging.current) {
            if ((isDragging.current.type === 'move' || isDragging.current.type === 'handle') && broadcastEvent) {
                const affectedIds = Array.from(isDragging.current.initialItemTransforms.keys());
                const currentItems = useWhiteboardStore.getState().items;
                affectedIds.forEach(id => {
                    const finalItem = currentItems.get(id);
                    if (finalItem) {
                        try {
                            broadcastEvent('update_item', {
                                id: finalItem.id,
                                changes: { transform: finalItem.transform }
                            });
                        } catch (err) { }
                    }
                });
            }
            if (isDragging.current.type === 'box') {
                renderManager?.updateSelectionBox(null);
            }
            isDragging.current = null;
            renderManager?.app.canvas.releasePointerCapture(e.pointerId);
        }
    }, [renderManager, broadcastEvent]);

    // Double-click to edit text items
    const onDoubleClick = useCallback((e: MouseEvent) => {
        if (!renderManager) return;
        const { tool: currentTool } = stateRef.current;

        // Only works with select tool
        if (currentTool !== 'select') return;

        const point = getLocalPoint(e as any);

        // Find text item at click position
        const hitArea = { x: point.x - 5, y: point.y - 5, width: 10, height: 10 };
        const hits: any[] = [];
        renderManager.quadTree.retrieve(hits, hitArea);

        const clickedText = hits.find(item => {
            if (item.type !== 'text') return false;
            const lb = renderManager.getLocalBounds(item);
            const sx = item.transform.scaleX || 1;
            const sy = item.transform.scaleY || 1;
            const rot = item.transform.rotation || 0;
            const cx = lb.x + lb.width / 2;
            const cy = lb.y + lb.height / 2;
            const wcX = item.transform.x + cx;
            const wcY = item.transform.y + cy;
            const dx = point.x - wcX;
            const dy = point.y - wcY;
            const cos = Math.cos(-rot);
            const sin = Math.sin(-rot);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;
            const halfW = (lb.width * sx) / 2;
            const halfH = (lb.height * sy) / 2;
            // No padding for strict hit test on text items
            return Math.abs(localX) <= halfW && Math.abs(localY) <= halfH;
        });

        if (clickedText && setEditingItem) {
            e.preventDefault();
            e.stopPropagation();
            setEditingItem(clickedText.id);
        }
    }, [renderManager, getLocalPoint, setEditingItem]);

    const handleContextMenu = useCallback((e: MouseEvent) => {
        e.preventDefault();
        if (!renderManager || !onContextMenu) return;

        const point = getLocalPoint(e);
        const { selectedIds, items } = stateRef.current;

        // 1. Check if inside existing selection box
        if (selectedIds.size > 0 && isPointInSelection(point)) {
            onContextMenu({ x: e.clientX, y: e.clientY });
            return;
        }

        // 2. Check for item hit (Select and Open)
        // Reuse QuadTree check logic
        const hitArea = { x: point.x - 5, y: point.y - 5, width: 10, height: 10 };
        const hits: any[] = [];
        renderManager.quadTree.retrieve(hits, hitArea);

        const clickedItem = hits.find(item => {
            const lb = renderManager.getLocalBounds(item);
            const sx = item.transform.scaleX || 1;
            const sy = item.transform.scaleY || 1;
            const rot = item.transform.rotation || 0;
            const cx = lb.x + lb.width / 2;
            const cy = lb.y + lb.height / 2;
            const wcX = item.transform.x + cx;
            const wcY = item.transform.y + cy;
            const dx = point.x - wcX;
            const dy = point.y - wcY;
            const cos = Math.cos(-rot);
            const sin = Math.sin(-rot);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;
            const halfW = (lb.width * sx) / 2;
            const halfH = (lb.height * sy) / 2;
            const padding = 10 / renderManager.currentZoom;
            return Math.abs(localX) <= halfW + padding && Math.abs(localY) <= halfH + padding;
        });

        if (clickedItem) {
            selectItem(clickedItem.id);
            onContextMenu({ x: e.clientX, y: e.clientY });
        } else {
            onContextMenu(null);
        }
    }, [renderManager, getLocalPoint, isPointInSelection, onContextMenu, selectItem]);

    useEffect(() => {
        if (!renderManager) return;
        const canvas = renderManager.app.canvas;

        canvas.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('dblclick', onDoubleClick);
        // Add context menu listener
        canvas.addEventListener('contextmenu', handleContextMenu);

        return () => {
            canvas.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('dblclick', onDoubleClick);
            canvas.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [renderManager, onPointerDown, onPointerMove, onPointerUp, onDoubleClick, handleContextMenu]);
}
