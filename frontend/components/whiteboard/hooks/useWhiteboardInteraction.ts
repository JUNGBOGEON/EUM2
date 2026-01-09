import { useEffect, useRef, useCallback } from 'react';
import { useWhiteboardStore, WhiteboardItem } from '../store';
import { RenderManager } from '../RenderManager';

interface DragState {
    type: 'move' | 'handle';
    initialPoint: { x: number; y: number };
    initialItemTransforms: Map<string, WhiteboardItem['transform']>;
}

export function useWhiteboardInteraction(renderManager: RenderManager | null) {
    const { tool, zoom, pan, selectedIds, items, selectItem, clearSelection, updateItem } = useWhiteboardStore();

    // Stable state ref
    const stateRef = useRef({ tool, zoom, pan, selectedIds, items });
    useEffect(() => {
        stateRef.current = { tool, zoom, pan, selectedIds, items };
    }, [tool, zoom, pan, selectedIds, items]);

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

    const onPointerDown = useCallback((e: PointerEvent) => {
        if (!renderManager) return;
        const { tool: currentTool, selectedIds: currentSelectedIds, items: currentItems } = stateRef.current;
        if (currentTool !== 'select') return;

        const point = getLocalPoint(e);
        const canvas = renderManager.app.canvas;

        // Hit Test
        const hitArea = { x: point.x - 5, y: point.y - 5, width: 10, height: 10 };
        const hits: any[] = [];
        renderManager.quadTree.retrieve(hits, hitArea);

        const clickedItem = hits.find(item => {
            const b = item.getBounds();
            return point.x >= b.x && point.x <= b.x + b.width &&
                point.y >= b.y && point.y <= b.y + b.height;
        });

        if (clickedItem) {
            if (!currentSelectedIds.has(clickedItem.id) && !e.shiftKey) {
                clearSelection();
                selectItem(clickedItem.id);
            } else if (e.shiftKey) {
                selectItem(clickedItem.id, true);
            }

            // Start Drag
            const initialTransforms = new Map();
            // Important: Use wait-and-see for the very first frame if state update is too slow
            const idsToDrag = currentSelectedIds.has(clickedItem.id)
                ? Array.from(currentSelectedIds)
                : [clickedItem.id];

            idsToDrag.forEach(id => {
                const item = currentItems.get(id);
                if (item) initialTransforms.set(id, { ...item.transform });
            });

            isDragging.current = {
                type: 'move',
                initialPoint: point,
                initialItemTransforms: initialTransforms
            };

            canvas.setPointerCapture(e.pointerId);
        } else {
            if (!e.shiftKey) {
                clearSelection();
            }
        }
    }, [renderManager, getLocalPoint, selectItem, clearSelection]);

    const onPointerMove = useCallback((e: PointerEvent) => {
        if (!isDragging.current) return;

        const point = getLocalPoint(e);
        const { initialPoint, initialItemTransforms } = isDragging.current;
        const dx = point.x - initialPoint.x;
        const dy = point.y - initialPoint.y;

        if (isDragging.current.type === 'move') {
            initialItemTransforms.forEach((initialTransform, id) => {
                updateItem(id, {
                    transform: {
                        ...initialTransform,
                        x: initialTransform.x + dx,
                        y: initialTransform.y + dy
                    }
                });
            });
        }
    }, [getLocalPoint, updateItem]);

    const onPointerUp = useCallback((e: PointerEvent) => {
        if (isDragging.current && renderManager) {
            isDragging.current = null;
            renderManager.app.canvas.releasePointerCapture(e.pointerId);
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
