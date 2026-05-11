import type { Coordinate, Millimeters } from "@/shared/lib/branded-types";
import { err, ok, type Result } from "@/shared/lib/result";
import type { RoomBoundaryPoint, RoomWall } from "../model/types";

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

export const validateWallLength = (length: number): Result<Millimeters, ValidationError> => {
  if (!Number.isFinite(length)) {
    return err({ code: "INVALID_LENGTH", message: "Длина стены должна быть числом" });
  }

  if (length <= 0) {
    return err({ code: "LENGTH_TOO_SMALL", message: "Длина стены должна быть положительной" });
  }

  if (length < 100) {
    return err({ code: "LENGTH_TOO_SMALL", message: "Длина стены слишком мала (минимум 100 мм)" });
  }

  if (length > 50000) {
    return err({ code: "LENGTH_TOO_LARGE", message: "Длина стены слишком велика (максимум 50 м)" });
  }

  return ok(length as Millimeters);
};

export const validateWallThickness = (thickness: number): Result<Millimeters, ValidationError> => {
  if (!Number.isFinite(thickness)) {
    return err({ code: "INVALID_THICKNESS", message: "Толщина стены должна быть числом" });
  }

  if (thickness <= 0) {
    return err({ code: "THICKNESS_TOO_SMALL", message: "Толщина стены должна быть положительной" });
  }

  if (thickness < 50) {
    return err({ code: "THICKNESS_TOO_SMALL", message: "Толщина стены слишком мала (минимум 50 мм)" });
  }

  if (thickness > 1000) {
    return err({ code: "THICKNESS_TOO_LARGE", message: "Толщина стены слишком велика (максимум 1000 мм)" });
  }

  return ok(thickness as Millimeters);
};

export const validateCoordinate = (value: number): Result<Coordinate, ValidationError> => {
  if (!Number.isFinite(value)) {
    return err({ code: "INVALID_COORDINATE", message: "Координата должна быть числом" });
  }

  if (value < -10000 || value > 10000) {
    return err({ code: "COORDINATE_OUT_OF_BOUNDS", message: "Координата вне допустимых границ" });
  }

  return ok(value as Coordinate);
};

export const validatePoint = (point: RoomBoundaryPoint): Result<RoomBoundaryPoint, ValidationError> => {
  const xResult = validateCoordinate(point.x);
  if (!xResult.success) {
    return err({ ...xResult.error, field: "x" });
  }

  const yResult = validateCoordinate(point.y);
  if (!yResult.success) {
    return err({ ...yResult.error, field: "y" });
  }

  return ok(point);
};

export const validateWall = (wall: RoomWall): Result<RoomWall, ValidationError> => {
  const startResult = validatePoint(wall.start);
  if (!startResult.success) {
    return err({ ...startResult.error, field: "start" });
  }

  const endResult = validatePoint(wall.end);
  if (!endResult.success) {
    return err({ ...endResult.error, field: "end" });
  }

  const thicknessResult = validateWallThickness(wall.thickness);
  if (!thicknessResult.success) {
    return err({ ...thicknessResult.error, field: "thickness" });
  }

  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  const lengthResult = validateWallLength(length);
  if (!lengthResult.success) {
    return err(lengthResult.error);
  }

  return ok(wall);
};

export const validateWalls = (walls: RoomWall[]): Result<RoomWall[], ValidationError> => {
  if (walls.length === 0) {
    return err({ code: "NO_WALLS", message: "Комната должна содержать хотя бы одну стену" });
  }

  for (let i = 0; i < walls.length; i++) {
    const wallResult = validateWall(walls[i]);
    if (!wallResult.success) {
      return err({ ...wallResult.error, field: `wall[${i}]` });
    }
  }

  return ok(walls);
};

export const validateRoomName = (name: string): Result<string, ValidationError> => {
  const trimmed = name.trim();

  if (!trimmed) {
    return err({ code: "EMPTY_NAME", message: "Название комнаты не может быть пустым" });
  }

  if (trimmed.length > 100) {
    return err({ code: "NAME_TOO_LONG", message: "Название комнаты слишком длинное (максимум 100 символов)" });
  }

  return ok(trimmed);
};

export const validateArea = (area: number): Result<number, ValidationError> => {
  if (!Number.isFinite(area)) {
    return err({ code: "INVALID_AREA", message: "Площадь должна быть числом" });
  }

  if (area <= 0) {
    return err({ code: "AREA_TOO_SMALL", message: "Площадь должна быть положительной" });
  }

  if (area > 1000) {
    return err({ code: "AREA_TOO_LARGE", message: "Площадь слишком велика (максимум 1000 м²)" });
  }

  return ok(area);
};

export const checkWallsIntersection = (wall1: RoomWall, wall2: RoomWall): boolean => {
  const { start: a, end: b } = wall1;
  const { start: c, end: d } = wall2;

  const ccw = (A: RoomBoundaryPoint, B: RoomBoundaryPoint, C: RoomBoundaryPoint) =>
    (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);

  const shareEndpoint =
    (a.x === c.x && a.y === c.y) ||
    (a.x === d.x && a.y === d.y) ||
    (b.x === c.x && b.y === c.y) ||
    (b.x === d.x && b.y === d.y);

  if (shareEndpoint) {
    return false;
  }

  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
};

export const validateNoIntersections = (walls: RoomWall[]): Result<RoomWall[], ValidationError> => {
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      if (checkWallsIntersection(walls[i], walls[j])) {
        return err({
          code: "WALLS_INTERSECT",
          message: `Стены ${i + 1} и ${j + 1} пересекаются`,
        });
      }
    }
  }

  return ok(walls);
};
