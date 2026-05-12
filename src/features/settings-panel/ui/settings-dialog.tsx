import { Trash2, X } from "lucide-react";
import { lengthUnits, type LengthUnit } from "@/entities/project";
import {
  Button,
  DialogContent,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";

type SettingsDialogProps = {
  lengthUnit: LengthUnit;
  onChangeUnit: (unit: LengthUnit) => void;
  onClearAll: () => void;
  onClose: () => void;
};

export function SettingsDialog({
  lengthUnit,
  onChangeUnit,
  onClearAll,
  onClose,
}: SettingsDialogProps) {
  return (
    <DialogContent
      contentClassName="settings-dialog"
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      overlayClassName="dialog-backdrop settings-backdrop"
      title="Настройки"
    >
      <div className="modal-header">
        <div>
          <h2>Настройки</h2>
        </div>
        <Button onClick={onClose} size="icon" type="button" variant="ghost">
          <X />
        </Button>
      </div>
      <div className="modal-content">
        <div className="settings-list">
          <div className="settings-row">
            <div>
              <p className="row-title">Единицы длины</p>
              <p className="muted">Влияет на ввод и отображение размеров объектов.</p>
            </div>
            <Select onValueChange={(value) => onChangeUnit(value as LengthUnit)} value={lengthUnit}>
              <SelectTrigger className="settings-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {lengthUnits.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="settings-row">
            <div>
              <p className="row-title">Очистить все</p>
              <p className="muted">Удаляет комнаты, объекты и настройки проекта.</p>
            </div>
            <Button className="settings-clear-button" onClick={onClearAll} type="button" variant="outline">
              <Trash2 />
              Очистить
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
