import { Minus, Plus } from "lucide-react";

export function ZoomControls({
  scale,
  onDecrease,
  onIncrease,
}: {
  scale: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="zoom-controls" aria-label="Масштаб">
      <button aria-label="Уменьшить масштаб" onClick={onDecrease} type="button">
        <Minus />
      </button>
      <span>{Math.round(scale * 100)}%</span>
      <button aria-label="Увеличить масштаб" onClick={onIncrease} type="button">
        <Plus />
      </button>
    </div>
  );
}
