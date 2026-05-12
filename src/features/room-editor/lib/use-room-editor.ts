import { useState, useCallback } from "react";
import type { Room, RoomIconName, WallMeasureInterval } from "@/entities/project/model/types";
import { validateRoomName } from "@/entities/project/lib/validators";
import { formatLength, parseLength } from "@/entities/project/lib/length-unit";
import type { LengthUnit } from "@/entities/project/model/types";

export const useRoomEditor = (lengthUnit: LengthUnit) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<RoomIconName>("living");
  const [wallMeasureInterval, setWallMeasureInterval] = useState<WallMeasureInterval>(5);
  const [defaultWallThickness, setDefaultWallThickness] = useState(120);
  const [defaultWallThicknessInput, setDefaultWallThicknessInput] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const startCreate = useCallback((roomNumber: number) => {
    setEditingId(null);
    setName(`Комната ${roomNumber}`);
    setIcon("living");
    setWallMeasureInterval(5);
    setDefaultWallThickness(120);
    setDefaultWallThicknessInput(formatLength(120, lengthUnit));
    setFormError("");
    setFormOpen(true);
  }, [lengthUnit]);

  const startEdit = useCallback((room: Room) => {
    setEditingId(room.id);
    setName(room.name);
    setIcon(room.icon ?? "living");
    setWallMeasureInterval(room.wallMeasureInterval ?? 5);
    setDefaultWallThickness(room.defaultWallThickness ?? 120);
    setDefaultWallThicknessInput(formatLength(room.defaultWallThickness ?? 120, lengthUnit));
    setFormError("");
    setFormOpen(true);
  }, [lengthUnit]);

  const closeForm = useCallback(() => {
    setEditingId(null);
    setName("");
    setIcon("living");
    setWallMeasureInterval(5);
    setDefaultWallThickness(120);
    setDefaultWallThicknessInput("");
    setFormError("");
    setFormOpen(false);
  }, []);

  const updateDefaultWallThickness = useCallback((value: string) => {
    setDefaultWallThicknessInput(value);
    const parsed = parseLength(value, lengthUnit);

    if (parsed) {
      setDefaultWallThickness(parsed);
    }
  }, [lengthUnit]);

  const commitDefaultWallThickness = useCallback(() => {
    setDefaultWallThicknessInput(formatLength(defaultWallThickness, lengthUnit));
  }, [defaultWallThickness, lengthUnit]);

  const validateForm = useCallback(() => {
    const nameResult = validateRoomName(name);
    if (!nameResult.success) {
      setFormError(nameResult.error.message);
      return false;
    }

    setFormError("");
    return true;
  }, [name]);

  return {
    editingId,
    name,
    icon,
    wallMeasureInterval,
    defaultWallThickness,
    defaultWallThicknessInput,
    formOpen,
    formError,
    deleteId,
    startCreate,
    startEdit,
    closeForm,
    setName,
    setIcon,
    setWallMeasureInterval,
    updateDefaultWallThickness,
    commitDefaultWallThickness,
    validateForm,
    setFormError,
    setDeleteId,
  };
};
