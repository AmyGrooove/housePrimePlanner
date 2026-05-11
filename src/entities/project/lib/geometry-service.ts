import type { Millimeters, Percentage, SquareMillimeters } from "@/shared/lib/branded-types";
import { unsafeMm, unsafePercent, unsafeSqMm } from "@/shared/lib/branded-types";
import type { RoomBoundaryPoint, RoomWall } from "../model/types";

export const distanceBetweenPoints = (p1: RoomBoundaryPoint, p2: RoomBoundaryPoint): Millimeters => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return unsafeMm(Math.sqrt(dx * dx + dy * dy));
};

export const wallLength = (wall: RoomWall): Millimeters => {
  return distanceBetweenPoints(wall.start, wall.end);
};

export const wallPointAt = (wall: RoomWall, position: Percentage): RoomBoundaryPoint => {
  const t = position as number;
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * t,
    y: wall.start.y + (wall.end.y - wall.start.y) * t,
  };
};

export const projectPointToWall = (point: RoomBoundaryPoint, wall: RoomWall): Percentage => {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return unsafePercent(0);
  }

  const t = ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / lengthSquared;
  return unsafePercent(Math.max(0, Math.min(1, t)));
};

export const constrainPointToAxes = (start: RoomBoundaryPoint, point: RoomBoundaryPoint): RoomBoundaryPoint => {
  const dx = Math.abs(point.x - start.x);
  const dy = Math.abs(point.y - start.y);

  if (dx > dy) {
    return { x: point.x, y: start.y };
  }
  return { x: start.x, y: point.y };
};

export const snapToGrid = (point: RoomBoundaryPoint, gridStep: number): RoomBoundaryPoint => {
  return {
    x: Math.round(point.x / gridStep) * gridStep,
    y: Math.round(point.y / gridStep) * gridStep,
  };
};

export const roomAreaFromWalls = (walls: RoomWall[]): SquareMillimeters => {
  if (walls.length < 3) {
    return unsafeSqMm(0);
  }

  const points = walls.map((wall) => wall.start);
  let area = 0;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return unsafeSqMm(Math.abs(area) / 2);
};

export const roomPerimeterFromWalls = (walls: RoomWall[]): Millimeters => {
  return unsafeMm(walls.reduce((sum, wall) => sum + (wallLength(wall) as number), 0));
};

export const findNearestPoint = (
  target: RoomBoundaryPoint,
  points: RoomBoundaryPoint[],
  threshold: Millimeters,
): RoomBoundaryPoint | null => {
  let nearest: RoomBoundaryPoint | null = null;
  let minDistance = threshold as number;

  for (const point of points) {
    const distance = distanceBetweenPoints(target, point) as number;
    if (distance < minDistance) {
      minDistance = distance;
      nearest = point;
    }
  }

  return nearest;
};

export const isPointOnWall = (
  point: RoomBoundaryPoint,
  wall: RoomWall,
  threshold: Millimeters,
): boolean => {
  const projected = projectPointToWall(point, wall);
  const pointOnWall = wallPointAt(wall, projected);
  const distance = distanceBetweenPoints(point, pointOnWall);
  return (distance as number) <= (threshold as number);
};

export const calculateWallAngle = (wall: RoomWall): number => {
  return Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
};

export const calculateWallNormal = (wall: RoomWall): { x: number; y: number } => {
  const angle = calculateWallAngle(wall);
  return {
    x: -Math.sin(angle),
    y: Math.cos(angle),
  };
};

export const offsetWallPoint = (
  wall: RoomWall,
  position: Percentage,
  offset: Millimeters,
  side: "inside" | "outside",
): RoomBoundaryPoint => {
  const point = wallPointAt(wall, position);
  const normal = calculateWallNormal(wall);
  const direction = side === "inside" ? 1 : -1;
  const offsetValue = (offset as number) * direction;

  return {
    x: point.x + normal.x * offsetValue,
    y: point.y + normal.y * offsetValue,
  };
};
