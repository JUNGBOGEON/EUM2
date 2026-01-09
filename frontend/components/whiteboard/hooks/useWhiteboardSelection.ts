import { useEffect, useCallback } from 'react';
import { useWhiteboardStore } from '../store';
import { RenderManager } from '../RenderManager';

export function useWhiteboardSelection(renderManager: RenderManager | null) {
    const tool = useWhiteboardStore((state) => state.tool);
    const zoom = useWhiteboardStore((state) => state.zoom);
    const pan = useWhiteboardStore((state) => state.pan);
    const selectItem = useWhiteboardStore((state) => state.selectItem);
    const clearSelection = useWhiteboardStore((state) => state.clearSelection);

    const getLocalPoint = useCallback((e: PointerEvent) => {
        if (!renderManager) return { x: 0, y: 0 };
        const rect = renderManager.app.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - pan.x) / zoom,
            y: (e.clientY - rect.top - pan.y) / zoom
        };
    }, [renderManager, pan, zoom]);

    useEffect(() => {
        if (!renderManager || tool !== 'select') return;
        const canvas = renderManager.app.canvas;

        const onPointerDown = (e: PointerEvent) => {
            const point = getLocalPoint(e);
            // Retrive objects from QuadTree (search small area around cursor)
            const hitArea = { x: point.x - 5, y: point.y - 5, width: 10, height: 10 };
            const hits: any[] = []; // Typed as any for now due to complex generic
            renderManager.quadTree.retrieve(hits, hitArea);

            // Simple Hit Test: Check if point is inside bounds (QuadTree is coarse)
            // For paths, we should ideally check distance to segment, but bounds is ok for MVP
            const clicked = hits.find(item => {
                const b = item.getBounds();
                return point.x >= b.x && point.x <= b.x + b.width &&
                    point.y >= b.y && point.y <= b.y + b.height;
            });

            if (clicked) {
                selectItem(clicked.id, e.shiftKey);
            } else {
                if (!e.shiftKey) {
                    clearSelection();
                }
            }
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        return () => {
            canvas.removeEventListener('pointerdown', onPointerDown);
        };
    }, [renderManager, tool, getLocalPoint, selectItem, clearSelection]);
}
