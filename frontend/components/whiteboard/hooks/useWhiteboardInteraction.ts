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
}

export function useWhiteboardInteraction(renderManager: RenderManager | null) {
    const params = useParams();
    const meetingId = params?.meetingId as string || 'default';
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
        const resizeRadius = 8 / currentZoom;
        const rotateOuterRadius = 24 / currentZoom;

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

                const corners = {
                    tl: { ...rotate(-halfW, -halfH), cursor: 'nwse-resize' },
                    tr: { ...rotate(halfW, -halfH), cursor: 'nesw-resize' },
                    bl: { ...rotate(-halfW, halfH), cursor: 'nesw-resize' },
                    br: { ...rotate(halfW, halfH), cursor: 'nwse-resize' }
                };

                // Check distance
                for (const [key, c] of Object.entries(corners)) {
                    const dist = Math.sqrt(Math.pow(point.x - c.x, 2) + Math.pow(point.y - c.y, 2));
                    if (dist <= resizeRadius) {
                        return { handle: key, cursor: c.cursor, bounds: null, isOBB: true, item, center: { x: wcX, y: wcY }, halfW, halfH, rotation: rot };
                    }
                }

                // Rotation Handle
                // Top center extended
                const topCenter = rotate(0, -halfH - (15 / currentZoom));
                const dist = Math.sqrt(Math.pow(point.x - topCenter.x, 2) + Math.pow(point.y - topCenter.y, 2));
                if (dist <= resizeRadius) {
                    return { handle: 'rotate', cursor: 'alias', bounds: null, isOBB: true, item, center: { x: wcX, y: wcY }, halfW, halfH, rotation: rot };
                }

                return null;
            }
        }

        // 2. Multi Selection: AABB (Axis Aligned)
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        selectedIds.forEach(id => {
            const item = items.get(id);
            if (item) {
                const lBounds = renderManager!.getLocalBounds(item);
                const sx = item.transform.scaleX || 1;
                const sy = item.transform.scaleY || 1;
                const cx = lBounds.x + lBounds.width / 2;
                const cy = lBounds.y + lBounds.height / 2;
                const worldCenterX = item.transform.x + cx;
                const worldCenterY = item.transform.y + cy;
                const halfW = (lBounds.width * sx) / 2;
                const halfH = (lBounds.height * sy) / 2;
                const boundsX = worldCenterX - halfW;
                const boundsY = worldCenterY - halfH;
                const boundsW = lBounds.width * sx;
                const boundsH = lBounds.height * sy;

                if (boundsX < minX) minX = boundsX;
                if (boundsY < minY) minY = boundsY;
                if (boundsX + boundsW > maxX) maxX = boundsX + boundsW;
                if (boundsY + boundsH > maxY) maxY = boundsY + boundsH;
            }
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
            if (dist <= rotateOuterRadius) {
                return { handle: 'rotate', cursor: 'alias', bounds: { minX, minY, maxX, maxY } };
            }
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
                addItem({
                    id: uuidv4(),
                    type: 'image',
                    data: {
                        url,
                        width: currentPendingImage.width,
                        height: currentPendingImage.height
                    },
                    transform: {
                        x: point.x - currentPendingImage.width / 2,
                        y: point.y - currentPendingImage.height / 2,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0
                    },
                    zIndex: 1
                });
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
                rotationOffset: isOBB ? rotation : 0
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
            const { tool, selectedIds, pendingImage } = stateRef.current;

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
                    const b = item.getBounds();
                    const bx = Math.min(b.x, b.x + b.width);
                    const by = Math.min(b.y, b.y + b.height);
                    const bw = Math.abs(b.width);
                    const bh = Math.abs(b.height);
                    const hitL = point.x - 5 / renderManager.currentZoom;
                    const hitR = point.x + 5 / renderManager.currentZoom;
                    const hitT = point.y - 5 / renderManager.currentZoom;
                    const hitB = point.y + 5 / renderManager.currentZoom;
                    return hitL < bx + bw && hitR > bx && hitT < by + bh && hitB > by;
                });

                if (hoveredItem && selectedIds.has(hoveredItem.id)) {
                    canvas.style.cursor = 'move';
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

                    if (isOBB) {
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
                if (isOBB) {
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
                        const baseW = lBounds?.width || 100;
                        const baseH = lBounds?.height || 100;

                        const initScaleX = initTx.scaleX || 1;
                        const initScaleY = initTx.scaleY || 1;

                        const curW = baseW * initScaleX;
                        const curH = baseH * initScaleY;

                        let newW = Math.max(10, curW + dW);
                        let newH = Math.max(10, curH + dH);

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

                } else {
                    // AABB GROUP RESIZE
                    const { minX, minY, maxX, maxY } = groupBounds!;
                    const groupW = maxX - minX;
                    const groupH = maxY - minY;

                    let anchorX = minX;
                    let anchorY = minY;

                    if (handle?.includes('l')) anchorX = maxX;
                    if (handle?.includes('r')) anchorX = minX;
                    if (handle?.includes('t')) anchorY = maxY;
                    if (handle?.includes('b')) anchorY = minY;

                    let newW = groupW;
                    let newH = groupH;

                    if (handle?.includes('l')) newW -= dx;
                    if (handle?.includes('r')) newW += dx;
                    if (handle?.includes('t')) newH -= dy;
                    if (handle?.includes('b')) newH += dy;

                    newW = Math.max(10, newW);
                    newH = Math.max(10, newH);

                    if (e.shiftKey) {
                        const scaleX = newW / groupW;
                        const scaleY = newH / groupH;
                        const scale = Math.max(scaleX, scaleY);
                        newW = groupW * scale;
                        newH = groupH * scale;
                    }

                    const sx = newW / groupW;
                    const sy = newH / groupH;

                    initialItemTransforms.forEach((initialTransform: any, id: string) => {
                        const localCenter = initialLocalCenters?.get(id) || { x: 0, y: 0 };
                        const oldWorldCenterX = initialTransform.x + localCenter.x;
                        const oldWorldCenterY = initialTransform.y + localCenter.y;
                        const newWorldCenterX = anchorX + (oldWorldCenterX - anchorX) * sx;
                        const newWorldCenterY = anchorY + (oldWorldCenterY - anchorY) * sy;
                        const newScaleX = (initialTransform.scaleX || 1) * sx;
                        const newScaleY = (initialTransform.scaleY || 1) * sy;

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
            if (isDragging.current.type === 'box') {
                renderManager?.updateSelectionBox(null);
            }
            isDragging.current = null;
            renderManager?.app.canvas.releasePointerCapture(e.pointerId);
        }
    }, [renderManager]);

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
