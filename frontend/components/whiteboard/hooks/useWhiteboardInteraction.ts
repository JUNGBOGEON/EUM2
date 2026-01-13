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
    broadcastEvent?: (type: string, data: any) => void
) {
    // const params = useParams(); // Removed
    // const meetingId = params?.meetingId as string || 'default'; // Passed as arg
    const {
        tool, zoom, pan, selectedIds, items,
        selectItem, clearSelection, updateItem, pushHistory,
        pendingImage, setPendingImage, setTool, addItem
    } = useWhiteboardStore();

    // Stable state ref
    const stateRef = useRef({ tool, zoom, pan, selectedIds, items, pendingImage });
    useEffect(() => {
        stateRef.current = { tool, zoom, pan, selectedIds, items, pendingImage };
    }, [tool, zoom, pan, selectedIds, items, pendingImage]);

    const isDragging = useRef<DragState | null>(null);

    const getLocalPoint = useCallback((e: PointerEvent) => {
        if (!renderManager) return { x: 0, y: 0 };
        const rect = renderManager.app.canvas.getBoundingClientRect();
        const { pan: currentPan, zoom: currentZoom } = stateRef.current;
        return {
            x: (e.clientX - rect.left - currentPan.x) / currentZoom,
            y: (e.clientY - rect.top - currentPan.y) / currentZoom
        };
    }, [renderManager]);

    const getGroupHandleAtPoint = useCallback((point: { x: number, y: number }) => {
        const selectedIds = useWhiteboardStore.getState().selectedIds;
        if (selectedIds.size === 0) return null;

        const { items } = useWhiteboardStore.getState();
        const currentZoom = renderManager?.currentZoom || 1;
        const resizeRadius = 12 / currentZoom;
        const rotateOuterRadius = 30 / currentZoom;

        // 1. Single Selection: OBB (Oriented Bounding Box)
        if (selectedIds.size === 1) {
            const id = Array.from(selectedIds)[0];
            const item = items.get(id);
            if (item) {
                const lBounds = renderManager!.getLocalBounds(item);
                const sx = item.transform.scaleX || 1;
                const sy = item.transform.scaleY || 1;
                const rot = item.transform.rotation || 0;

                const halfW = (lBounds.width * sx) / 2;
                const halfH = (lBounds.height * sy) / 2;

                // World Center
                const cx = lBounds.x + lBounds.width / 2;
                const cy = lBounds.y + lBounds.height / 2;
                const wcX = item.transform.x + cx;
                const wcY = item.transform.y + cy;

                const cos = Math.cos(rot);
                const sin = Math.sin(rot);

                const rotate = (x: number, y: number) => ({
                    x: wcX + (x * cos - y * sin),
                    y: wcY + (x * sin + y * cos)
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

                const handles = {
                    tl: { ...rotate(-halfW, -halfH) },
                    tr: { ...rotate(halfW, -halfH) },
                    bl: { ...rotate(-halfW, halfH) },
                    br: { ...rotate(halfW, halfH) },
                    t: { ...rotate(0, -halfH) },
                    b: { ...rotate(0, halfH) },
                    l: { ...rotate(-halfW, 0) },
                    r: { ...rotate(halfW, 0) }
                };

                // Check distance
                for (const [key, c] of Object.entries(handles)) {
                    const dist = Math.sqrt(Math.pow(point.x - c.x, 2) + Math.pow(point.y - c.y, 2));
                    if (dist <= resizeRadius) {
                        return {
                            handle: key,
                            cursor: getCursorForHandle(key, rot),
                            bounds: null,
                            isOBB: true,
                            item,
                            center: { x: wcX, y: wcY },
                            halfW,
                            halfH,
                            rotation: rot
                        };
                    }
                }

                // Rotation Handle
                // Top center extended
                const topCenter = rotate(0, -halfH - (24 / currentZoom));
                const dist = Math.sqrt(Math.pow(point.x - topCenter.x, 2) + Math.pow(point.y - topCenter.y, 2));
                if (dist <= resizeRadius) {
                    return { handle: 'rotate', cursor: 'alias', bounds: null, isOBB: true, item, center: { x: wcX, y: wcY }, halfW, halfH, rotation: rot };
                }

                return null;
            }
        }

        // 2. Multi Selection
        let commonRotation: number | null = null;
        let isCommon = true;
        const selectedItems: any[] = [];

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
                    if (diff > 0.1) {
                        isCommon = false;
                    }
                }
            }
        });

        if (isCommon && commonRotation !== null && selectedItems.length > 0) {
            // OBB Group Logic
            // Calculate OBB aligned with commonRotation
            const cos = Math.cos(-commonRotation);
            const sin = Math.sin(-commonRotation);

            let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;

            selectedItems.forEach(item => {
                const b = renderManager!.getLocalBounds(item);
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

            // Rotate Center back to World
            const rCos = Math.cos(commonRotation);
            const rSin = Math.sin(commonRotation);
            const wcX = centerU * rCos - centerV * rSin;
            const wcY = centerU * rSin + centerV * rCos;

            const halfW = w / 2;
            const halfH = h / 2;

            // Rotator for Handles
            const rotate = (x: number, y: number) => ({
                x: wcX + (x * rCos - y * rSin),
                y: wcY + (x * rSin + y * rCos)
            });

            // Adaptive Cursor Logic (Same as single)
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
                    case 1: return 'nesw-resize'; // Adjusted standard cursor names
                    case 2: return 'ew-resize';
                    case 3: return 'nwse-resize';
                }
                return 'move';
            };

            const handles = {
                tl: { ...rotate(-halfW, -halfH) },
                tr: { ...rotate(halfW, -halfH) },
                bl: { ...rotate(-halfW, halfH) },
                br: { ...rotate(halfW, halfH) },
                t: { ...rotate(0, -halfH) },
                b: { ...rotate(0, halfH) },
                l: { ...rotate(-halfW, 0) },
                r: { ...rotate(halfW, 0) }
            };

            for (const [key, c] of Object.entries(handles)) {
                const dist = Math.sqrt(Math.pow(point.x - c.x, 2) + Math.pow(point.y - c.y, 2));
                if (dist <= resizeRadius) {
                    return {
                        handle: key,
                        cursor: getCursorForHandle(key, commonRotation),
                        bounds: null,
                        isOBB: true,
                        item: null, // Multi-selection doesn't have single 'item'
                        center: { x: wcX, y: wcY },
                        halfW,
                        halfH,
                        rotation: commonRotation
                    };
                }
            }
            // Rotation Handle
            const topCenter = rotate(0, -halfH - (24 / currentZoom));
            const dist = Math.sqrt(Math.pow(point.x - topCenter.x, 2) + Math.pow(point.y - topCenter.y, 2));
            if (dist <= resizeRadius) {
                return { handle: 'rotate', cursor: 'alias', bounds: null, isOBB: true, item: null, center: { x: wcX, y: wcY }, halfW, halfH, rotation: commonRotation };
            }

            // If Common, but not handle, return null (Let body check happen? Or return body hit?)
            // Body check logic usually happens in onPointerDown fallback.
            return null;
        }

        // AABB Fallback
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        selectedItems.forEach(item => {
            // Proper Rotated AABB Bounds
            const b = renderManager!.getLocalBounds(item);
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
        });

        if (minX === Infinity) return null;

        const corners = {
            tl: { x: minX, y: minY, cursor: 'nwse-resize' },
            tr: { x: maxX, y: minY, cursor: 'nesw-resize' },
            bl: { x: minX, y: maxY, cursor: 'nesw-resize' },
            br: { x: maxX, y: maxY, cursor: 'nwse-resize' }
        };

        for (const [key, c] of Object.entries(corners)) {
            const dist = Math.sqrt(Math.pow(point.x - c.x, 2) + Math.pow(point.y - c.y, 2));
            if (dist <= resizeRadius) {
                return { handle: key, cursor: c.cursor, bounds: { minX, minY, maxX, maxY } };
            }
        }
        // Rotate Handle for AABB Group (Top Center)
        const midX = (minX + maxX) / 2;
        const topY = minY - (24 / currentZoom);
        const dist = Math.sqrt(Math.pow(point.x - midX, 2) + Math.pow(point.y - topY, 2));
        if (dist <= resizeRadius) {
            return { handle: 'rotate', cursor: 'alias', bounds: { minX, minY, maxX, maxY } };
        }
        return null;
    }, [renderManager]);

    const onPointerDown = useCallback((e: PointerEvent) => {
        if (!renderManager) return;
        const point = getLocalPoint(e);
        const canvas = renderManager.app.canvas;
        const { tool: currentTool, selectedIds: currentSelectedIds, items: currentItems, pendingImage: currentPendingImage } = stateRef.current;

        // Image Placement
        if (currentTool === 'image' && currentPendingImage) {
            const placeImage = (url: string) => {

                const newItem = {
                    id: uuidv4(),
                    type: 'image' as const,
                    data: { url, width: currentPendingImage.width, height: currentPendingImage.height },
                    transform: { x: point.x - currentPendingImage.width / 2, y: point.y - currentPendingImage.height / 2, scaleX: 1, scaleY: 1, rotation: 0 },
                    zIndex: Date.now(),
                    isDeleted: false,
                    meetingId: meetingId,
                    userId: 'user'
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

        if (currentTool !== 'select') return;

        // 1. Check Handles (Using consolidated logic)
        const hitHandle = getGroupHandleAtPoint(point);

        if (hitHandle) {
            const { handle, bounds, isOBB, center, rotation } = hitHandle;

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

        // 2. Hit Test for Items (Move - Only for ALREADY SELECTED items)
        const hitArea = { x: point.x - 5, y: point.y - 5, width: 10, height: 10 };
        const hits: any[] = [];
        renderManager.quadTree.retrieve(hits, hitArea);

        const clickedItem = hits.find(item => {
            const b = item.getBounds();
            const bx = Math.min(b.x, b.x + b.width);
            const by = Math.min(b.y, b.y + b.height);
            const bw = Math.abs(b.width);
            const bh = Math.abs(b.height);

            const hitL = point.x - 5 / renderManager.currentZoom;
            const hitR = point.x + 5 / renderManager.currentZoom;
            const hitT = point.y - 5 / renderManager.currentZoom;
            const hitB = point.y + 5 / renderManager.currentZoom;

            return hitL < bx + bw && hitR > bx &&
                hitT < by + bh && hitB > by;
        });

        if (clickedItem && currentSelectedIds.has(clickedItem.id)) {
            const initialTransforms = new Map();
            const updatedSelectedIds = useWhiteboardStore.getState().selectedIds;
            updatedSelectedIds.forEach(id => {
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
        } else {
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
    }, [renderManager, getLocalPoint, selectItem, clearSelection, pushHistory, getGroupHandleAtPoint]);

    const onPointerMove = useCallback((e: PointerEvent) => {
        const point = getLocalPoint(e);

        if (!isDragging.current) {
            // Use store.getState() to avoid stale state in event handlers (fixes cursor flickering/reset issue)
            const CurrentState = useWhiteboardStore.getState();
            const tool = CurrentState.tool;
            const selectedIds = CurrentState.selectedIds;
            const pendingImage = CurrentState.pendingImage;

            if (tool === 'image' && pendingImage && renderManager) {
                renderManager.renderGhost(pendingImage.url, point.x, point.y, pendingImage.width, pendingImage.height, 0.5);
                renderManager.app.canvas.style.cursor = 'crosshair';
                return;
            } else {
                if (renderManager) renderManager.renderGhost(null, 0, 0, 0, 0);
            }

            if (renderManager && tool === 'select') {
                const canvas = renderManager.app.canvas;
                if (selectedIds.size > 0) {
                    const hitHandle = getGroupHandleAtPoint(point);
                    if (hitHandle) {
                        canvas.style.cursor = hitHandle.cursor;
                        return;
                    }
                }
                const hitArea = { x: point.x - 5, y: point.y - 5, width: 10, height: 10 };
                const hits: any[] = [];
                renderManager.quadTree.retrieve(hits, hitArea);

                const hoveredItem = hits.find(item => {
                    const lb = renderManager.getLocalBounds(item);
                    const t = item.transform || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };

                    // World Center
                    const cx = lb.x + lb.width / 2;
                    const cy = lb.y + lb.height / 2;
                    const wcX = t.x + cx;
                    const wcY = t.y + cy;

                    // Inverse Rotate Point to Local Space
                    const dx = point.x - wcX;
                    const dy = point.y - wcY;
                    const rot = t.rotation || 0;
                    const cos = Math.cos(-rot);
                    const sin = Math.sin(-rot);

                    const localX = dx * cos - dy * sin;
                    const localY = dx * sin + dy * cos;

                    const halfW = (lb.width * (t.scaleX || 1)) / 2;
                    const halfH = (lb.height * (t.scaleY || 1)) / 2;

                    // Check bounds with padding
                    const padding = 10 / renderManager.currentZoom;
                    return Math.abs(localX) <= halfW + padding && Math.abs(localY) <= halfH + padding;
                });

                if (hoveredItem && selectedIds.has(hoveredItem.id)) {
                    canvas.style.cursor = 'move';
                } else {
                    canvas.style.cursor = 'inherit'; // Reset to inherit from container (Pen/Eraser/etc)
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
            if (handle === 'rotate' && initialAngle !== undefined) {
                const currentAngle = Math.atan2(point.y - groupCenter.y, point.x - groupCenter.x);
                let deltaAngle = currentAngle - initialAngle;

                if (e.shiftKey) {
                    const snap = Math.PI / 12;
                    deltaAngle = Math.round(deltaAngle / snap) * snap;
                }

                if (!isOBB) {
                    const { minX, minY, maxX, maxY } = groupBounds!;
                    const w = maxX - minX;
                    const h = maxY - minY;
                    renderManager?.setSelectionOverride({ cx: groupCenter.x, cy: groupCenter.y, w, h, rotation: deltaAngle });
                }

                initialItemTransforms.forEach((initialTransform: any, id: string) => {
                    const localCenter = initialLocalCenters?.get(id) || { x: 0, y: 0 };

                    // OBB Logic:
                    // If SINGLE item, simple rotation is enough (Pivot = Center).
                    // If MULTI item, we need Rigid Body Rotation (Orbit).
                    // The block below (lines 635+) handles Rigid Body Rotation.
                    // So we only take this shortcut if it's a SINGLE item.
                    const isSingle = useWhiteboardStore.getState().selectedIds.size === 1;

                    if (isOBB && isSingle) {
                        const newRotation = (initialTransform.rotation || 0) + deltaAngle;
                        updateItem(id, {
                            transform: {
                                ...initialTransform,
                                rotation: newRotation
                            }
                        });
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
                // RESIZE LOGIC
                if (initialItemTransforms.size === 1 && isOBB) {
                    // SINGLE OBJECT OBB RESIZE
                    const id = Array.from(initialItemTransforms.keys())[0] as string;
                    const initTx = initialItemTransforms.get(id);
                    if (initTx) {
                        const rot = initTx.rotation || 0;
                        const cos = Math.cos(-rot);
                        const sin = Math.sin(-rot);

                        const localDx = dx * cos - dy * sin;
                        const localDy = dx * sin + dy * cos;

                        let dW = 0;
                        let dH = 0;

                        if (handle?.includes('l')) dW = -localDx;
                        if (handle?.includes('r')) dW = localDx;
                        if (handle?.includes('t')) dH = -localDy;
                        if (handle?.includes('b')) dH = localDy;

                        const item = useWhiteboardStore.getState().items.get(id);
                        if (!item) return;

                        const lBounds = renderManager?.getLocalBounds(item);
                        // Ensure base dimensions are at least 1 to avoid Division By Zero and infinite scale.
                        // Using '|| 100' was a bug for 0-width lines.
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
                            newW = curW * s;
                            newH = curH * s;
                        }

                        const newScaleX = newW / baseW;
                        const newScaleY = newH / baseH;

                        let centerShiftX = 0;
                        let centerShiftY = 0;

                        if (handle?.includes('l')) centerShiftX = - (newW - curW) / 2;
                        if (handle?.includes('r')) centerShiftX = (newW - curW) / 2;
                        if (handle?.includes('t')) centerShiftY = - (newH - curH) / 2;
                        if (handle?.includes('b')) centerShiftY = (newH - curH) / 2;

                        const wCos = Math.cos(rot);
                        const wSin = Math.sin(rot);

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
                } else if (isOBB) {
                    // MULTI-OBJECT OBB RESIZE (Center-based)
                    // We treat the group as a single large OBB.
                    const { groupCenter, halfW, halfH, rotation } = isDragging.current as any;

                    const subPixelShim = 0.1;
                    const safeHalfW = Math.max(subPixelShim, halfW || 0);
                    const safeHalfH = Math.max(subPixelShim, halfH || 0);

                    const vx = point.x - groupCenter.x;
                    const vy = point.y - groupCenter.y;

                    const rCos = Math.cos(-rotation);
                    const rSin = Math.sin(-rotation);
                    const localX = vx * rCos - vy * rSin;
                    const localY = vx * rSin + vy * rCos;

                    let newHalfW = halfW || 0;
                    let newHalfH = halfH || 0;

                    let sX = 1;
                    let sY = 1;

                    // Calculates scale based on Fixed Pivot and Mouse Position (localX/Y)
                    // If we drag Right Handle, Pivot is Left Edge (-halfW). 
                    // New Width = Mouse - Pivot. Scale = NewWidth / OldWidth.

                    if (handle?.includes('l') || handle?.includes('r')) {
                        const pivotX = handle.includes('l') ? safeHalfW : -safeHalfW;
                        // Avoid flipping for now (clamp mouse to minimum width side of pivot)
                        const minW = subPixelShim * 2;
                        const mouseX = handle.includes('l')
                            ? Math.min(localX, pivotX - minW)
                            : Math.max(localX, pivotX + minW);

                        const newWidth = Math.abs(mouseX - pivotX);
                        const oldWidth = safeHalfW * 2;
                        sX = newWidth / oldWidth;

                        // Update newHalfW for Aspect Ratio logic
                        newHalfW = newWidth / 2;
                    }

                    if (handle?.includes('t') || handle?.includes('b')) {
                        const pivotY = handle.includes('t') ? safeHalfH : -safeHalfH;
                        const minH = subPixelShim * 2;
                        const mouseY = handle.includes('t')
                            ? Math.min(localY, pivotY - minH)
                            : Math.max(localY, pivotY + minH);

                        const newHeight = Math.abs(mouseY - pivotY);
                        const oldHeight = safeHalfH * 2;
                        sY = newHeight / oldHeight;

                        // Update newHalfH for Aspect Ratio logic
                        newHalfH = newHeight / 2;
                    }

                    if (e.shiftKey) {
                        // For corner handles, pick the dominant scale to restart aspect ratio
                        // If side handle, sX or sY is 1, so max works but logic is tricky.
                        // Actually standard behavior:
                        // If corner: Uniform scale max(sX, sY).
                        // If side: Ignore shift or just scale that axis? Usually ignore.
                        if (handle && handle.length > 1) { // Corner
                            const s = Math.max(sX, sY);
                            sX = s;
                            sY = s;
                            newHalfW = safeHalfW * s; // Update for debug/consistency
                            newHalfH = safeHalfH * s;
                        }
                    }

                    if (!Number.isFinite(sX)) sX = 1;
                    if (!Number.isFinite(sY)) sY = 1;

                    // DEBUG LOG
                    // console.log('[Resize OBB] sX:', sX, 'sY:', sY, 'halfW:', halfW, 'newHalfW:', newHalfW);

                    initialItemTransforms.forEach((initialTransform: any, id: string) => {
                        const localCenter = initialLocalCenters?.get(id) || { x: 0, y: 0 };

                        const oldWx = initialTransform.x + localCenter.x;
                        const oldWy = initialTransform.y + localCenter.y;
                        const relX = oldWx - groupCenter.x;
                        const relY = oldWy - groupCenter.y;
                        const relLx = relX * rCos - relY * rSin;
                        const relLy = relX * rSin + relY * rCos;
                        const newRelLx = relLx * sX;
                        const newRelLy = relLy * sY;
                        const wCos = Math.cos(rotation);
                        const wSin = Math.sin(rotation);

                        // Pivot Correction Logic
                        // Fixed Pivot depends on Handle
                        let pivotLx = 0;
                        let pivotLy = 0;
                        if (handle?.includes('l')) pivotLx = halfW;
                        if (handle?.includes('r')) pivotLx = -halfW;
                        if (handle?.includes('t')) pivotLy = halfH;
                        if (handle?.includes('b')) pivotLy = -halfH;

                        const newRelLx_Pinned = pivotLx + (relLx - pivotLx) * sX;
                        const newRelLy_Pinned = pivotLy + (relLy - pivotLy) * sY;

                        const newRelX_Pinned = newRelLx_Pinned * wCos - newRelLy_Pinned * wSin;
                        const newRelY_Pinned = newRelLx_Pinned * wSin + newRelLy_Pinned * wCos;

                        const finalWx = groupCenter.x + newRelX_Pinned;
                        const finalWy = groupCenter.y + newRelY_Pinned;

                        let newScaleX = (initialTransform.scaleX || 1) * sX;
                        let newScaleY = (initialTransform.scaleY || 1) * sY;

                        // Final Safety Check
                        if (!Number.isFinite(newScaleX)) newScaleX = 1;
                        if (!Number.isFinite(newScaleY)) newScaleY = 1;
                        if (!Number.isFinite(finalWx)) return; // Skip invalid update
                        if (!Number.isFinite(finalWy)) return;

                        updateItem(id, {
                            transform: {
                                ...initialTransform,
                                x: finalWx - localCenter.x,
                                y: finalWy - localCenter.y,
                                scaleX: newScaleX,
                                scaleY: newScaleY
                            }
                        });

                        try {
                            // Only broadcast if successful
                            try {
                                if (broadcastEvent) {
                                    broadcastEvent('update_item', {
                                        id,
                                        changes: {
                                            transform: {
                                                x: finalWx - localCenter.x,
                                                y: finalWy - localCenter.y,
                                                scaleX: newScaleX,
                                                scaleY: newScaleY
                                            }
                                        }
                                    });
                                }
                            } catch (err) {
                                console.warn('Broadcast failed, but continuing local interaction:', err);
                            }
                        } catch (err) {
                            // Ignore network errors during move
                        }
                    });

                } else {
                    // AABB GROUP RESIZE
                    const { minX, minY, maxX, maxY } = groupBounds!;
                    const rawGroupW = maxX - minX;
                    const rawGroupH = maxY - minY;

                    // Ensure we don't divide by zero
                    // Use a minimum of 10 to prevents hyper-sensitivity when resizing thin/zero-width lines.
                    // If we used 1, a 1px drag would double the scale. 10 is smoother.
                    const subPixelShim = 0.1; // Allows responding to drags even if dimension is near zero
                    const groupW = Math.max(rawGroupW, subPixelShim);
                    const groupH = Math.max(rawGroupH, subPixelShim);

                    let anchorX = minX;
                    let anchorY = minY;

                    if (handle?.includes('l')) anchorX = maxX;
                    if (handle?.includes('r')) anchorX = minX;
                    if (handle?.includes('t')) anchorY = maxY;
                    if (handle?.includes('b')) anchorY = minY;

                    let newW = rawGroupW;
                    let newH = rawGroupH;

                    if (handle?.includes('l')) newW -= dx;
                    if (handle?.includes('r')) newW += dx;
                    if (handle?.includes('t')) newH -= dy;
                    if (handle?.includes('b')) newH += dy;

                    newW = Math.max(subPixelShim, newW);
                    newH = Math.max(subPixelShim, newH);

                    if (e.shiftKey) {
                        const scaleX = newW / groupW;
                        const scaleY = newH / groupH;
                        const scale = Math.max(scaleX, scaleY);
                        newW = groupW * scale;
                        newH = groupH * scale;
                    }

                    // Calculate Scale Factors
                    // If original dimension was effectively 0 (prevented by max(..., 1)), 
                    // we should probably just keep scale 1 unless we physically expanded it?
                    // But for lines, we want to allow resizing the non-zero axis.
                    // The zero axis (e.g. Width 0) will result in newW changing, so scaleX changes.
                    // But applying scaleX to 0 width has no effect. This is fine.
                    // BUT if we divide by "1" (from max(0,1)), then scaleX = newW / 1 = newW. 
                    // That implies massive scale (e.g. 100x).
                    // If we have a vertical line (Index W=0), and we drag Width to 100.
                    // groupW = 1. newW = 100. sx = 100.
                    // Line transform scaleX becomes 100.
                    // Visual width 0 * 100 = 0.
                    // This is SAFE visually.
                    // But if rawGroupW was 0, we should probably treat sx as 1 to avoid dirty writes?
                    // Actually, modifying scale of 0 dimension is harmless but unnecessary.
                    // Let's stick to simple safety:

                    let sx = newW / groupW;
                    let sy = newH / groupH;

                    if (!Number.isFinite(sx)) sx = 1;
                    if (!Number.isFinite(sy)) sy = 1;

                    // DEBUG LOG
                    // DEBUG LOG
                    // console.log('[Resize AABB] sx:', sx, 'sy:', sy, 'groupW:', groupW, 'newW:', newW);

                    initialItemTransforms.forEach((initialTransform: any, id: string) => {
                        const localCenter = initialLocalCenters?.get(id) || { x: 0, y: 0 };
                        const oldWorldCenterX = initialTransform.x + localCenter.x;
                        const oldWorldCenterY = initialTransform.y + localCenter.y;
                        const newWorldCenterX = anchorX + (oldWorldCenterX - anchorX) * sx;
                        const newWorldCenterY = anchorY + (oldWorldCenterY - anchorY) * sy;

                        let newScaleX = (initialTransform.scaleX || 1) * sx;
                        let newScaleY = (initialTransform.scaleY || 1) * sy;

                        // Final Safety Check
                        if (!Number.isFinite(newScaleX)) newScaleX = 1;
                        if (!Number.isFinite(newScaleY)) newScaleY = 1;
                        if (!Number.isFinite(newWorldCenterX)) return;
                        if (!Number.isFinite(newWorldCenterY)) return;

                        updateItem(id, {
                            transform: {
                                ...initialTransform,
                                x: newWorldCenterX - localCenter.x,
                                y: newWorldCenterY - localCenter.y,
                                scaleX: newScaleX,
                                scaleY: newScaleY
                            }
                        });

                        try {
                            if (broadcastEvent) {
                                broadcastEvent('update_item', {
                                    id,
                                    changes: {
                                        transform: {
                                            x: newWorldCenterX - localCenter.x,
                                            y: newWorldCenterY - localCenter.y,
                                            scaleX: newScaleX,
                                            scaleY: newScaleY
                                        }
                                    }
                                });
                            }
                        } catch (err) {
                            // Ignore
                        }
                    });
                }
            }
        } else if (type === 'box') {
            // ... (Box Select Logic Same)
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
                        if (initialSelectedIds.has(item.id)) {
                            finalSelection.add(item.id);
                        } else {
                            finalSelection.add(item.id);
                        }
                    } else {
                        if (initialSelectedIds.has(item.id)) {
                            finalSelection.delete(item.id);
                        }
                    }
                });
                useWhiteboardStore.getState().setSelectedIds(finalSelection);
                renderManager?.renderSelection(finalSelection, useWhiteboardStore.getState().items);
            } else {
                useWhiteboardStore.getState().setSelectedIds(newSelectedIds);
                renderManager?.renderSelection(newSelectedIds, useWhiteboardStore.getState().items);
            }
        }
    }, [getLocalPoint, updateItem, renderManager]);

    const onPointerUp = useCallback((e: PointerEvent) => {
        // Clear any visual overrides
        renderManager?.setSelectionOverride(null);

        // Restore standard selection UI
        const { selectedIds, items } = useWhiteboardStore.getState();
        renderManager?.renderSelection(selectedIds, items);

        if (isDragging.current) {
            // BROADCAST CHANGES ON POINTER UP
            if ((isDragging.current.type === 'move' || isDragging.current.type === 'handle') && broadcastEvent) {
                const affectedIds = Array.from(isDragging.current.initialItemTransforms.keys());
                // Use current state items
                const currentItems = useWhiteboardStore.getState().items;
                affectedIds.forEach(id => {
                    const finalItem = currentItems.get(id);
                    if (finalItem) {
                        try {
                            broadcastEvent('update_item', {
                                id: finalItem.id,
                                changes: { transform: finalItem.transform }
                            });
                        } catch (err) {
                            console.warn('Final broadcast failed:', err);
                        }
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
