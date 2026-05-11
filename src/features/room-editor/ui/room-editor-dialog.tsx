import { Grid2X2, Save, X } from "lucide-react";
import { Button, DialogContent } from "@/shared/ui";

type RoomEditorDialogProps = {
  name: string;
  area: string;
  error: string;
  onNameChange: (value: string) => void;
  onAreaChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
};

export function RoomEditorDialog({
  name,
  area,
  error,
  onNameChange,
  onAreaChange,
  onSave,
  onClose,
}: RoomEditorDialogProps) {
  return (
    <DialogContent
      contentClassName="object-dialog"
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title="Редактирование комнаты"
    >
      <div className="editor-card-header">
        <div className="dialog-title">
          <span className="tile-icon">
            <Grid2X2 />
          </span>
          <h3>Редактирование комнаты</h3>
        </div>
        <Button onClick={onClose} size="icon" type="button" variant="ghost">
          <X />
        </Button>
      </div>

      <div className="form-stack">
        <label className="field">
          <span>Название</span>
          <input
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Например: Гостиная"
            type="text"
            value={name}
          />
        </label>

        <label className="field">
          <span>Площадь, м²</span>
          <input
            min="0"
            onChange={(event) => onAreaChange(event.target.value)}
            placeholder="0"
            step="0.1"
            type="number"
            value={area}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <Button onClick={onSave} type="button">
            <Save />
            Сохранить
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
