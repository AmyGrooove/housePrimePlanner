import type { Point, Wall } from '@/shared/types'

type NearestPointResult = {
  point: Point
  distance: number
}

type NearestWallResult = {
  wall: Wall
  point: Point
  distance: number
}

const radiansToDegrees = (radians: number): number => (radians * 180) / Math.PI

const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180

const getDistanceBetweenPoints = (firstPoint: Point, secondPoint: Point): number => {
  return Math.hypot(secondPoint.x - firstPoint.x, secondPoint.y - firstPoint.y)
}

const getAngleBetweenPoints = (startPoint: Point, endPoint: Point): number => {
  return radiansToDegrees(Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x))
}

const snapPointToGrid = (point: Point, gridSize: number): Point => {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  }
}

const snapAngleToStep = (angle: number, step: number): number => {
  return Math.round(angle / step) * step
}

const getPointByAngleAndDistance = (startPoint: Point, angle: number, distance: number): Point => {
  const angleInRadians = degreesToRadians(angle)

  return {
    x: startPoint.x + Math.cos(angleInRadians) * distance,
    y: startPoint.y + Math.sin(angleInRadians) * distance
  }
}

const getSnappedEndpoint = (startPoint: Point, endPoint: Point, angleStep: number): Point => {
  const angle = getAngleBetweenPoints(startPoint, endPoint)
  const distance = getDistanceBetweenPoints(startPoint, endPoint)
  const snappedAngle = snapAngleToStep(angle, angleStep)

  return getPointByAngleAndDistance(startPoint, snappedAngle, distance)
}

const getProjectionPointOnWall = (point: Point, wall: Wall): Point => {
  const wallVector = {
    x: wall.end.x - wall.start.x,
    y: wall.end.y - wall.start.y
  }
  const wallLengthSquared = wallVector.x * wallVector.x + wallVector.y * wallVector.y

  if (wallLengthSquared === 0) {
    return wall.start
  }

  const pointVector = {
    x: point.x - wall.start.x,
    y: point.y - wall.start.y
  }
  const projectionRatio = Math.max(
    0,
    Math.min(1, (pointVector.x * wallVector.x + pointVector.y * wallVector.y) / wallLengthSquared)
  )

  return {
    x: wall.start.x + wallVector.x * projectionRatio,
    y: wall.start.y + wallVector.y * projectionRatio
  }
}

const findNearestPoint = (point: Point, points: Point[], threshold: number): NearestPointResult | null => {
  let nearestResult: NearestPointResult | null = null

  points.forEach((availablePoint) => {
    const distance = getDistanceBetweenPoints(point, availablePoint)

    if (distance <= threshold && (!nearestResult || distance < nearestResult.distance)) {
      nearestResult = { point: availablePoint, distance }
    }
  })

  return nearestResult
}

const findNearestWall = (point: Point, walls: Wall[], threshold: number): NearestWallResult | null => {
  let nearestResult: NearestWallResult | null = null

  walls.forEach((wall) => {
    const projectionPoint = getProjectionPointOnWall(point, wall)
    const distance = getDistanceBetweenPoints(point, projectionPoint)

    if (distance <= threshold && (!nearestResult || distance < nearestResult.distance)) {
      nearestResult = { wall, point: projectionPoint, distance }
    }
  })

  return nearestResult
}

const getObjectPositionOnWall = (point: Point, wall: Wall): Point => {
  return getProjectionPointOnWall(point, wall)
}

const movePoint = (point: Point, delta: Point): Point => {
  return {
    x: point.x + delta.x,
    y: point.y + delta.y
  }
}

export {
  findNearestPoint,
  findNearestWall,
  getAngleBetweenPoints,
  getDistanceBetweenPoints,
  getObjectPositionOnWall,
  getPointByAngleAndDistance,
  getProjectionPointOnWall,
  getSnappedEndpoint,
  movePoint,
  snapAngleToStep,
  snapPointToGrid
}
