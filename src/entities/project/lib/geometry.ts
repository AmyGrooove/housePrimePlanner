import type { RoomBoundaryPoint, RoomWall } from "../model/types";

export function distanceBetween(first: RoomBoundaryPoint, second: RoomBoundaryPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function constrainPoint(start: RoomBoundaryPoint, point: RoomBoundaryPoint): RoomBoundaryPoint {
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absX < absY * 0.5) {
    return { x: start.x, y: point.y };
  }

  if (absY < absX * 0.5) {
    return { x: point.x, y: start.y };
  }

  const size = Math.min(absX, absY);
  return {
    x: start.x + Math.sign(dx || 1) * size,
    y: start.y + Math.sign(dy || 1) * size,
  };
}

export function polygonArea(points: RoomBoundaryPoint[]) {
  const doubleArea = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);

  return Math.round((Math.abs(doubleArea) / 2_000_000) * 100) / 100;
}

export function wallLength(wall: Pick<RoomWall, "start" | "end">) {
  return distanceBetween(wall.start, wall.end);
}

export function wallPointAt(wall: Pick<RoomWall, "start" | "end">, position: number) {
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * position,
    y: wall.start.y + (wall.end.y - wall.start.y) * position,
  };
}

export function projectPointToWall(point: RoomBoundaryPoint, wall: Pick<RoomWall, "start" | "end">) {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (!lengthSquared) {
    return 0;
  }

  const rawPosition = ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / lengthSquared;
  return Math.min(1, Math.max(0, rawPosition));
}

export function orderConnectedWalls(walls: RoomWall[]) {
  if (walls.length < 3) {
    return [];
  }

  const isSamePoint = (first: RoomBoundaryPoint, second: RoomBoundaryPoint) => distanceBetween(first, second) <= 2;
  const orderedWalls = [walls[0]];
  const unusedWalls = walls.slice(1);

  while (unusedWalls.length > 0) {
    const currentEnd = orderedWalls[orderedWalls.length - 1].end;
    const nextIndex = unusedWalls.findIndex(
      (wall) => isSamePoint(wall.start, currentEnd) || isSamePoint(wall.end, currentEnd),
    );

    if (nextIndex === -1) {
      return [];
    }

    const [nextWall] = unusedWalls.splice(nextIndex, 1);
    orderedWalls.push(
      isSamePoint(nextWall.start, currentEnd)
        ? nextWall
        : {
            ...nextWall,
            start: nextWall.end,
            end: nextWall.start,
          },
    );
  }

  const closes = isSamePoint(orderedWalls[orderedWalls.length - 1].end, orderedWalls[0].start);

  return closes ? orderedWalls : [];
}

export function roomAreaFromWalls(walls: RoomWall[]) {
  const orderedWalls = orderConnectedWalls(walls);

  return orderedWalls.length > 0 ? polygonArea(orderedWalls.map((wall) => wall.start)) : 0;
}
