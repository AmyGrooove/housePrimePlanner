import { X } from "lucide-react";
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
  onClose: () => void;
};

export function SettingsDialog({
  lengthUnit,
  onChangeUnit,
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
        </div>
      </div>
    </DialogContent>
  );
}
