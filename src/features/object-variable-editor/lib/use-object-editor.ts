import { useState, useCallback, useMemo } from "react";
import type { ObjectParameterKey, ObjectTypeId, ObjectVariable } from "@/entities/project/model/types";
import { createObjectVariable } from "@/entities/project/lib/object-service";
import { parseLength } from "@/entities/project/lib/length-unit";
import type { LengthUnit } from "@/entities/project/model/types";

export const useObjectEditor = (
  objectVariables: ObjectVariable[],
  lengthUnit: LengthUnit,
  onSave: (variable: ObjectVariable) => void,
  onDelete: (id: string) => void,
) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<ObjectTypeId>("door");
  const [name, setName] = useState("");
  const [parameterValues, setParameterValues] = useState<Partial<Record<ObjectParameterKey, string>>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const startCreate = useCallback((defaultTypeId: ObjectTypeId = "door") => {
    setEditingId(null);
    setTypeId(defaultTypeId);
    setName("");
    setParameterValues({});
    setFormError("");
    setFormOpen(true);
  }, []);

  const startEdit = useCallback((variable: ObjectVariable, unit: LengthUnit) => {
    const nextValues: Partial<Record<ObjectParameterKey, string>> = {};

    for (const [key, value] of Object.entries(variable.parameters) as Array<
      [ObjectParameterKey, number | undefined]
    >) {
      if (value !== undefined) {
        const formatted = (value / (unit === "mm" ? 1 : unit === "cm" ? 10 : 1000)).toString();
        nextValues[key] = formatted;
      }
    }

    setEditingId(variable.id);
    setTypeId(variable.typeId);
    setName(variable.name);
    setParameterValues(nextValues);
    setFormError("");
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setEditingId(null);
    setTypeId("door");
    setName("");
    setParameterValues({});
    setFormError("");
    setFormOpen(false);
  }, []);

  const saveVariable = useCallback((
    objectTypes: Array<{ id: ObjectTypeId; parameters: Array<{ key: ObjectParameterKey; label: string }> }>,
    createId: () => string,
  ) => {
    const selectedType = objectTypes.find((type) => type.id === typeId);
    if (!selectedType) {
      setFormError("Тип объекта не найден");
      return;
    }

    const parameters: Partial<Record<ObjectParameterKey, number>> = {};

    for (const parameter of selectedType.parameters) {
      const parsed = parseLength(parameterValues[parameter.key] ?? "", lengthUnit);

      if (!parsed) {
        setFormError(`Заполните параметр "${parameter.label}" положительным числом.`);
        return;
      }

      parameters[parameter.key] = parsed;
    }

    const result = createObjectVariable(
      createId(),
      typeId,
      name,
      parameters,
      objectVariables,
      editingId ?? undefined,
    );

    if (!result.success) {
      setFormError(result.error.message);
      return;
    }

    onSave(result.value);
    closeForm();
  }, [typeId, name, parameterValues, lengthUnit, objectVariables, editingId, onSave, closeForm]);

  const confirmDelete = useCallback(() => {
    if (!deleteId) return;

    onDelete(deleteId);

    if (editingId === deleteId) {
      closeForm();
    }

    setDeleteId(null);
  }, [deleteId, editingId, onDelete, closeForm]);

  const updateParameterValue = useCallback((key: ObjectParameterKey, value: string) => {
    setParameterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const changeType = useCallback((newTypeId: ObjectTypeId) => {
    setTypeId(newTypeId);
    setParameterValues({});
    setFormError("");
  }, []);

  return {
    editingId,
    typeId,
    name,
    parameterValues,
    formOpen,
    formError,
    deleteId,
    startCreate,
    startEdit,
    closeForm,
    saveVariable,
    confirmDelete,
    setName,
    updateParameterValue,
    changeType,
    setDeleteId,
  };
};
