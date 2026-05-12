import type { DragEvent, MouseEvent, ReactNode, WheelEvent } from "react";

type CanvasSurfaceProps = {
  dragStart: { x: number; y: number; originX: number; originY: number } | null;
  offset: { x: number; y: number };
  scale: number;
  children?: ReactNode;
  onDragLeave?: () => void;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
  onMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseUp: () => void;
  onWheel: (event: WheelEvent<HTMLDivElement>) => void;
};

export function CanvasSurface({
  dragStart,
  offset,
  scale,
  children,
  onDragLeave,
  onDragOver,
  onDrop,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
}: CanvasSurfaceProps) {
  return (
    <div
      className={`canvas-surface ${dragStart ? "canvas-surface-dragging" : ""}`}
      aria-label="Холст планировки"
      onMouseDown={onMouseDown}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseLeave={onMouseUp}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
    >
      <div
        className="canvas-plane"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        }}
      >
        <div className="canvas-grid" />
        {children}
      </div>
    </div>
  );
}
