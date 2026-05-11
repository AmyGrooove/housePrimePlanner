import { useState, useCallback } from "react";

export interface CanvasState {
  offset: { x: number; y: number };
  scale: number;
  dragStart: { x: number; y: number; originX: number; originY: number } | null;
}

export const useCanvasState = (initialScale = 1) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(initialScale);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; originX: number; originY: number } | null>(null);

  const setZoom = useCallback((nextScale: number) => {
    setScale(Math.min(2.5, Math.max(0.35, nextScale)));
  }, []);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    setDragStart((prev) => ({
      x: clientX,
      y: clientY,
      originX: prev?.originX ?? offset.x,
      originY: prev?.originY ?? offset.y,
    }));
  }, [offset.x, offset.y]);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragStart) return;

    setOffset({
      x: dragStart.originX + clientX - dragStart.x,
      y: dragStart.originY + clientY - dragStart.y,
    });
  }, [dragStart]);

  const endDrag = useCallback(() => {
    setDragStart(null);
  }, []);

  const zoom = useCallback((delta: number) => {
    setZoom(scale + delta);
  }, [scale, setZoom]);

  const reset = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    setScale(initialScale);
    setDragStart(null);
  }, [initialScale]);

  return {
    offset,
    scale,
    dragStart,
    setZoom,
    startDrag,
    moveDrag,
    endDrag,
    zoom,
    reset,
  };
};
