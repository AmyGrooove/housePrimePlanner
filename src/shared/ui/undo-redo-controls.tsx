import { Undo2, Redo2 } from "lucide-react";
import { Button } from "./button";

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  className?: string;
}

export function UndoRedoControls({ canUndo, canRedo, onUndo, onRedo, className = "" }: UndoRedoControlsProps) {
  return (
    <div className={`undo-redo-controls ${className}`}>
      <Button
        disabled={!canUndo}
        onClick={onUndo}
        size="sm"
        title="Отменить (Ctrl+Z)"
        variant="outline"
      >
        <Undo2 size={16} />
      </Button>
      <Button
        disabled={!canRedo}
        onClick={onRedo}
        size="sm"
        title="Повторить (Ctrl+Y)"
        variant="outline"
      >
        <Redo2 size={16} />
      </Button>
    </div>
  );
}
