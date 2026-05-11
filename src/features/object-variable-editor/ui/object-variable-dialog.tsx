import { Save, X } from "lucide-react";
import {
  ObjectTypeIcon,
  unitConfig,
  type LengthUnit,
  type ObjectParameterKey,
  type ObjectType,
  type ObjectTypeId,
} from "@/entities/project";
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

type ObjectVariableDialogProps = {
  editingId: string | null;
  name: string;
  typeId: ObjectTypeId;
  objectTypes: ObjectType[];
  lengthUnit: LengthUnit;
  parameterValues: Partial<Record<ObjectParameterKey, string>>;
  error: string;
  onNameChange: (value: string) => void;
  onTypeChange: (typeId: ObjectTypeId) => void;
  onParameterChange: (key: ObjectParameterKey, value: string) => void;
  onSave: () => void;
  onClose: () => void;
};

export function ObjectVariableDialog({
  editingId,
  name,
  typeId,
  objectTypes,
  lengthUnit,
  parameterValues,
  error,
  onNameChange,
  onTypeChange,
  onParameterChange,
  onSave,
  onClose,
}: ObjectVariableDialogProps) {
  const selectedType = objectTypes.find((type) => type.id === typeId) ?? objectTypes[0];
  const selectedUnit = unitConfig(lengthUnit);
  const title = editingId ? "Редактирование объекта" : "Новый объект";

  return (
    <DialogContent
      contentClassName="object-dialog"
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={title}
    >
      <div className="editor-card-header">
        <div className="dialog-title">
          <span className="tile-icon">
            <ObjectTypeIcon typeId={selectedType?.id} />
          </span>
          <h3>{editingId ? "Редактирование" : "Новый объект"}</h3>
        </div>
        <Button onClick={onClose} size="icon" type="button" variant="ghost">
          <X />
        </Button>
      </div>

      <div className="form-stack">
        {!editingId && (
          <label className="field">
            <span>Тип</span>
            <Select onValueChange={(value) => onTypeChange(value as ObjectTypeId)} value={typeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {objectTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <span className="type-option">
                        <ObjectTypeIcon typeId={type.id} />
                        {type.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
        )}

        <label className="field">
          <span>Название</span>
          <input
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Например: Дверь в спальню"
            type="text"
            value={name}
          />
        </label>

        <div className="field-grid">
          {selectedType?.parameters.map((parameter) => (
            <label className="field" key={parameter.key}>
              <span>
                {parameter.label}, {selectedUnit.label}
              </span>
              <input
                min="0"
                onChange={(event) => onParameterChange(parameter.key, event.target.value)}
                placeholder={`0 ${selectedUnit.label}`}
                step={selectedUnit.step}
                type="number"
                value={parameterValues[parameter.key] ?? ""}
              />
            </label>
          ))}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <Button onClick={onSave} type="button">
            <Save />
            {editingId ? "Сохранить" : "Создать"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
