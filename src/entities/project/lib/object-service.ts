import type { ObjectParameterKey, ObjectVariable } from "../model/types";
import { err, ok, type Result } from "@/shared/lib/result";
import type { ValidationError } from "./validators";

export const validateObjectName = (name: string, existingVariables: ObjectVariable[], excludeId?: string): Result<string, ValidationError> => {
  const trimmed = name.trim();

  if (!trimmed) {
    return err({ code: "EMPTY_NAME", message: "Укажите название объекта" });
  }

  if (trimmed.length > 100) {
    return err({ code: "NAME_TOO_LONG", message: "Название слишком длинное (максимум 100 символов)" });
  }

  const hasSameName = existingVariables.some(
    (variable) =>
      variable.id !== excludeId && variable.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );

  if (hasSameName) {
    return err({ code: "DUPLICATE_NAME", message: "Объект с таким названием уже существует" });
  }

  return ok(trimmed);
};

export const validateObjectParameter = (
  value: number,
  parameterKey: ObjectParameterKey,
): Result<number, ValidationError> => {
  if (!Number.isFinite(value)) {
    return err({ code: "INVALID_PARAMETER", message: "Параметр должен быть числом", field: parameterKey });
  }

  if (value <= 0) {
    return err({ code: "PARAMETER_TOO_SMALL", message: "Параметр должен быть положительным", field: parameterKey });
  }

  const limits: Record<ObjectParameterKey, { min: number; max: number }> = {
    width: { min: 100, max: 5000 },
    height: { min: 100, max: 5000 },
    thickness: { min: 10, max: 500 },
    depth: { min: 10, max: 1000 },
  };

  const limit = limits[parameterKey];
  if (value < limit.min) {
    return err({
      code: "PARAMETER_TOO_SMALL",
      message: `Параметр слишком мал (минимум ${limit.min} мм)`,
      field: parameterKey,
    });
  }

  if (value > limit.max) {
    return err({
      code: "PARAMETER_TOO_LARGE",
      message: `Параметр слишком велик (максимум ${limit.max} мм)`,
      field: parameterKey,
    });
  }

  return ok(value);
};

export const createObjectVariable = (
  id: string,
  typeId: string,
  name: string,
  parameters: Partial<Record<ObjectParameterKey, number>>,
  existingVariables: ObjectVariable[],
  editingId?: string,
): Result<ObjectVariable, ValidationError> => {
  const nameResult = validateObjectName(name, existingVariables, editingId);
  if (!nameResult.success) {
    return nameResult;
  }

  for (const [key, value] of Object.entries(parameters) as Array<[ObjectParameterKey, number | undefined]>) {
    if (value === undefined) {
      return err({ code: "MISSING_PARAMETER", message: `Параметр "${key}" обязателен`, field: key });
    }

    const paramResult = validateObjectParameter(value, key);
    if (!paramResult.success) {
      return paramResult;
    }
  }

  const now = new Date().toISOString();
  const existing = existingVariables.find((v) => v.id === editingId);

  return ok({
    id: editingId ?? id,
    typeId: typeId as any,
    name: nameResult.value,
    parameters,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
};
