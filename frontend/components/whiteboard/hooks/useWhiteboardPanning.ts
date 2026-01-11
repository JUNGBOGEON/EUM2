import { useEffect, useRef, useCallback } from 'react';
import { useWhiteboardStore } from '../store';
import { RenderManager } from '../RenderManager';
import { ZOOM_SETTINGS } from '../constants';

export function useWhiteboardPanning(renderManager: RenderManager | null) {
    const { pan, zoom, setPan, setZoom, tool } = useWhiteboardStore();

    // Stable Refs for values used in listeners
    const stateRef = useRef({ pan, zoom, tool });
    useEffect(() => {
        stateRef.current = { pan, zoom, tool };
    }, [pan, zoom, tool]);

    const isPanning = useRef(false);
    const lastPoint = useRef({ x: 0, y: 0 });

    const onWheel = useCallback((e: WheelEvent) => {
        if (!renderManager) return;
        e.preventDefault();

        const { pan: currentPan, zoom: currentZoom } = stateRef.current;

        if (e.ctrlKey || e.metaKey) {
            // Zoom
            const factor = -e.deltaY * 0.002;
            const newZoom = Math.min(Math.max(ZOOM_SETTINGS.min, currentZoom + factor), ZOOM_SETTINGS.max);

            if (newZoom !== currentZoom) {
                const rect = renderManager.app.canvas.getBoundingClientRect();
                const focusX = e.clientX - rect.left;
                const focusY = e.clientY - rect.top;

                // Adjust pan to zoom towards mouse position
                const worldX = (focusX - currentPan.x) / currentZoom;
                const worldY = (focusY - currentPan.y) / currentZoom;

                const newPanX = focusX - worldX * newZoom;
                const newPanY = focusY - worldY * newZoom;

                setZoom(newZoom);
                setPan(newPanX, newPanY);
            }
        } else {
            // Pan
            setPan(currentPan.x - e.deltaX, currentPan.y - e.deltaY);
        }
    }, [renderManager, setZoom, setPan]);

    const onPointerDown = useCallback((e: PointerEvent) => {
        if (!renderManager) return;
        const { tool: currentTool } = stateRef.current;

        // Middle button (1) or Hand tool (0)
        if (e.button === 1 || (e.button === 0 && currentTool === 'pan')) {
            isPanning.current = true;
            lastPoint.current = { x: e.clientX, y: e.clientY };
            renderManager.app.canvas.setPointerCapture(e.pointerId);
        }
    }, [renderManager]);

    const onPointerMove = useCallback((e: PointerEvent) => {
        if (!isPanning.current) return;

        const { pan: currentPan } = stateRef.current;
        const dx = e.clientX - lastPoint.current.x;
        const dy = e.clientY - lastPoint.current.y;

        setPan(currentPan.x + dx, currentPan.y + dy);
        lastPoint.current = { x: e.clientX, y: e.clientY };
    }, [setPan]);

    const onPointerUp = useCallback((e: PointerEvent) => {
        if (isPanning.current && renderManager) {
            isPanning.current = false;
            renderManager.app.canvas.releasePointerCapture(e.pointerId);
        }
    }, [renderManager]);

    useEffect(() => {
        if (!renderManager) return;
        const canvas = renderManager.app.canvas;

        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        return () => {
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [renderManager, onWheel, onPointerDown, onPointerMove, onPointerUp]);
}
