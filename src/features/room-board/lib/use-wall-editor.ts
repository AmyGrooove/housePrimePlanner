import { useState, useCallback } from "react";
import type { RoomBoundaryPoint, RoomWall, RoomWallObject, WallMeasureInterval, RoomIconName } from "@/entities/project/model/types";
import { distanceBetween, constrainPoint, wallLength } from "@/entities/project/lib/geometry";
import { formatLength, parseLength } from "@/entities/project/lib/length-unit";
import type { LengthUnit } from "@/entities/project/model/types";
import { validateWalls, validateRoomName, validateNoIntersections } from "@/entities/project/lib/validators";
import { roomAreaFromWalls } from "@/entities/project/lib/geometry";

export const useWallEditor = (lengthUnit: LengthUnit, createId: () => string) => {
  const [walls, setWalls] = useState<RoomWall[]>([]);
  const [wallObjects, setWallObjects] = useState<RoomWallObject[]>([]);
  const [draftStart, setDraftStart] = useState<RoomBoundaryPoint | null>(null);
  const [previewPoint, setPreviewPoint] = useState<RoomBoundaryPoint | null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [selectedWallLength, setSelectedWallLength] = useState("");
  const [selectedWallThickness, setSelectedWallThickness] = useState("");
  const [error, setError] = useState("");

  const selectedWall = walls.find((wall) => wall.id === selectedWallId) ?? null;

  const wallSnapStep = useCallback((interval: WallMeasureInterval, unitMultiplier: number) => {
    return Math.max(1, interval * unitMultiplier);
  }, []);

  const snapBoardPoint = useCallback((point: RoomBoundaryPoint, step: number): RoomBoundaryPoint => {
    return {
      x: Math.round(point.x / step) * step,
      y: Math.round(point.y / step) * step,
    };
  }, []);

  const findNearestWallEndpoint = useCallback((point: RoomBoundaryPoint, threshold = 14) => {
    const endpoints = walls.flatMap((wall) => [wall.start, wall.end]);
    return endpoints.find((endpoint) => distanceBetween(endpoint, point) <= threshold) ?? null;
  }, [walls]);

  const constrainAndSnapWallEnd = useCallback((start: RoomBoundaryPoint, rawPoint: RoomBoundaryPoint, step: number) => {
    const constrained = constrainPoint(start, rawPoint);
    const length = distanceBetween(start, constrained);

    if (!length) {
      return start;
    }

    const snappedLength = Math.max(step, Math.round(length / step) * step);
    const dx = (constrained.x - start.x) / length;
    const dy = (constrained.y - start.y) / length;

    return {
      x: Math.round(start.x + dx * snappedLength),
      y: Math.round(start.y + dy * snappedLength),
    };
  }, []);

  const startWall = useCallback((point: RoomBoundaryPoint, step: number) => {
    const startPoint = walls.length === 0 ? snapBoardPoint(point, step) : findNearestWallEndpoint(point);

    if (!startPoint) {
      setError("Новую стену можно начать только с крайней точки существующей стены.");
      return false;
    }

    setDraftStart(startPoint);
    setError("");
    return true;
  }, [walls.length, snapBoardPoint, findNearestWallEndpoint]);

  const finishWall = useCallback((point: RoomBoundaryPoint, step: number, defaultThickness: number) => {
    if (!draftStart) return false;

    const nextPoint = constrainAndSnapWallEnd(draftStart, point, step);

    if (distanceBetween(nextPoint, draftStart) < 12) {
      setError("Линия слишком короткая.");
      return false;
    }

    const newWall: RoomWall = {
      id: createId(),
      start: draftStart,
      end: nextPoint,
      thickness: defaultThickness,
    };

    setWalls((prev) => [...prev, newWall]);
    setDraftStart(null);
    setPreviewPoint(null);
    setError("");
    return true;
  }, [draftStart, constrainAndSnapWallEnd, createId]);

  const updatePreview = useCallback((point: RoomBoundaryPoint, step: number) => {
    if (!draftStart) {
      setPreviewPoint(null);
      return;
    }

    setPreviewPoint(constrainAndSnapWallEnd(draftStart, point, step));
  }, [draftStart, constrainAndSnapWallEnd]);

  const selectWall = useCallback((wallId: string) => {
    const wall = walls.find((item) => item.id === wallId);
    setSelectedWallId(wallId);

    if (wall) {
      setSelectedWallLength(formatLength(wallLength(wall), lengthUnit));
      setSelectedWallThickness(formatLength(wall.thickness, lengthUnit));
    }
  }, [walls, lengthUnit]);

  const deselectWall = useCallback(() => {
    setSelectedWallId(null);
    setSelectedWallLength("");
    setSelectedWallThickness("");
  }, []);

  const updateWallLength = useCallback((value: string, step: number) => {
    setSelectedWallLength(value);
    const parsed = parseLength(value, lengthUnit);

    if (!parsed || !selectedWall) return;

    const snappedParsed = Math.max(step, Math.round(parsed / step) * step);
    const currentLength = wallLength(selectedWall);

    if (!currentLength) return;

    const dx = (selectedWall.end.x - selectedWall.start.x) / currentLength;
    const dy = (selectedWall.end.y - selectedWall.start.y) / currentLength;
    const previousEnd = selectedWall.end;
    const nextEnd = {
      x: Math.round(selectedWall.start.x + dx * snappedParsed),
      y: Math.round(selectedWall.start.y + dy * snappedParsed),
    };

    setWalls((prev) =>
      prev.map((wall) => {
        if (wall.id === selectedWall.id) {
          return { ...wall, end: nextEnd };
        }

        const isAttached = (point: RoomBoundaryPoint) => distanceBetween(point, previousEnd) <= 2;
        return {
          ...wall,
          start: isAttached(wall.start) ? nextEnd : wall.start,
          end: isAttached(wall.end) ? nextEnd : wall.end,
        };
      }),
    );
  }, [selectedWall, lengthUnit]);

  const updateWallThickness = useCallback((value: string) => {
    setSelectedWallThickness(value);
    const parsed = parseLength(value, lengthUnit);

    if (!parsed || !selectedWall) return;

    setWalls((prev) =>
      prev.map((wall) => (wall.id === selectedWall.id ? { ...wall, thickness: parsed } : wall)),
    );
  }, [selectedWall, lengthUnit]);

  const commitWallLength = useCallback(() => {
    if (selectedWall) {
      setSelectedWallLength(formatLength(wallLength(selectedWall), lengthUnit));
    }
  }, [selectedWall, lengthUnit]);

  const commitWallThickness = useCallback(() => {
    if (selectedWall) {
      setSelectedWallThickness(formatLength(selectedWall.thickness, lengthUnit));
    }
  }, [selectedWall, lengthUnit]);

  const deleteWall = useCallback((wallId: string) => {
    setWalls((prev) => prev.filter((wall) => wall.id !== wallId));
    setWallObjects((prev) => prev.filter((obj) => obj.wallId !== wallId));

    if (selectedWallId === wallId) {
      deselectWall();
    }

    setDraftStart(null);
    setPreviewPoint(null);
    setError("");
  }, [selectedWallId, deselectWall]);

  const reset = useCallback(() => {
    setWalls([]);
    setWallObjects([]);
    setDraftStart(null);
    setPreviewPoint(null);
    setSelectedWallId(null);
    setSelectedWallLength("");
    setSelectedWallThickness("");
    setError("");
  }, []);

  const loadWalls = useCallback((loadedWalls: RoomWall[], loadedObjects: RoomWallObject[]) => {
    setWalls(loadedWalls);
    setWallObjects(loadedObjects);
    setDraftStart(null);
    setPreviewPoint(null);
    setSelectedWallId(null);
    setError("");
  }, []);

  const validateCurrentWalls = useCallback(() => {
    const wallsResult = validateWalls(walls);
    if (!wallsResult.success) {
      setError(wallsResult.error.message);
      return false;
    }

    const intersectionResult = validateNoIntersections(walls);
    if (!intersectionResult.success) {
      setError(intersectionResult.error.message);
      return false;
    }

    return true;
  }, [walls]);

  return {
    walls,
    wallObjects,
    draftStart,
    previewPoint,
    selectedWallId,
    selectedWall,
    selectedWallLength,
    selectedWallThickness,
    error,
    setError,
    setWalls,
    setWallObjects,
    startWall,
    finishWall,
    updatePreview,
    selectWall,
    deselectWall,
    updateWallLength,
    updateWallThickness,
    commitWallLength,
    commitWallThickness,
    deleteWall,
    reset,
    loadWalls,
    validateCurrentWalls,
    setDraftStart,
  };
};
