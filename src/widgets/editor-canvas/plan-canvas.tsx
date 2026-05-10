'use client'

import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useUnit } from 'effector-react'
import { Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva'
import {
  $editorSettings,
  $project,
  $selectedEntity,
  moveRoomChanged,
  selectedEntityChanged,
  zoomChanged
} from '@/entities/project/model'
import { findNearestPoint, movePoint } from '@/shared/lib/geometry'
import type { Point, Room } from '@/shared/types'
import styles from '@/shared/ui/workspace.module.css'
import { useCanvasSize } from './use-canvas-size'

const getRoomPoints = (room: Room): Point[] => {
  return room.walls.flatMap((wall) => [movePoint(wall.start, room.position), movePoint(wall.end, room.position)])
}

const getOtherRoomPoints = (rooms: Room[], roomId: string): Point[] => {
  return rooms.filter((room) => room.id !== roomId).flatMap((room) => getRoomPoints(room))
}

const getRoomSnapPosition = (room: Room, rooms: Room[], targetPosition: Point, threshold: number): { position: Point; hint: Point | null } => {
  const movedRoomPoints = room.walls.flatMap((wall) => [movePoint(wall.start, targetPosition), movePoint(wall.end, targetPosition)])
  const otherPoints = getOtherRoomPoints(rooms, room.id)

  for (const roomPoint of movedRoomPoints) {
    const nearestPoint = findNearestPoint(roomPoint, otherPoints, threshold)

    if (nearestPoint) {
      return {
        position: {
          x: targetPosition.x + nearestPoint.point.x - roomPoint.x,
          y: targetPosition.y + nearestPoint.point.y - roomPoint.y
        },
        hint: nearestPoint.point
      }
    }
  }

  return { position: targetPosition, hint: null }
}

const renderPlanGrid = (width: number, height: number, gridSize: number, zoom: number, stagePosition: Point) => {
  const lines: ReactNode[] = []
  const visibleWidth = width / zoom
  const visibleHeight = height / zoom
  const startX = -stagePosition.x / zoom - gridSize
  const startY = -stagePosition.y / zoom - gridSize
  const endX = startX + visibleWidth + gridSize * 2
  const endY = startY + visibleHeight + gridSize * 2

  for (let verticalPosition = Math.floor(startX / gridSize) * gridSize; verticalPosition < endX; verticalPosition += gridSize) {
    lines.push(<Line key={`plan-v-${verticalPosition}`} points={[verticalPosition, startY, verticalPosition, endY]} stroke="#dce3ec" strokeWidth={1 / zoom} />)
  }

  for (let horizontalPosition = Math.floor(startY / gridSize) * gridSize; horizontalPosition < endY; horizontalPosition += gridSize) {
    lines.push(<Line key={`plan-h-${horizontalPosition}`} points={[startX, horizontalPosition, endX, horizontalPosition]} stroke="#dce3ec" strokeWidth={1 / zoom} />)
  }

  return lines
}

const PlanCanvas = () => {
  const stageReference = useRef<Konva.Stage | null>(null)
  const { canvasSize, containerReference } = useCanvasSize()
  const [project, settings, selectedEntity, moveRoom, selectEntity, setZoom] = useUnit([
    $project,
    $editorSettings,
    $selectedEntity,
    moveRoomChanged,
    selectedEntityChanged,
    zoomChanged
  ])
  const [stagePosition, setStagePosition] = useState<Point>({ x: 0, y: 0 })
  const [snapHint, setSnapHint] = useState<Point | null>(null)

  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault()
    const direction = event.evt.deltaY > 0 ? -0.08 : 0.08
    setZoom(settings.zoom + direction)
  }

  return (
    <div className={styles.canvas} ref={containerReference}>
      <Stage
        ref={stageReference}
        width={canvasSize.width}
        height={canvasSize.height}
        draggable
        x={stagePosition.x}
        y={stagePosition.y}
        scaleX={settings.zoom}
        scaleY={settings.zoom}
        onDragEnd={(event) => {
          if (event.target === event.currentTarget) {
            setStagePosition({ x: event.target.x(), y: event.target.y() })
          }
        }}
        onWheel={handleWheel}
      >
        <Layer>
          {settings.isGridVisible ? renderPlanGrid(canvasSize.width, canvasSize.height, settings.gridSize, settings.zoom, stagePosition) : null}
          {project.rooms.map((room) => {
            const isSelected = selectedEntity?.type === 'room' && selectedEntity.id === room.id
            const hasWalls = room.walls.length > 0

            return (
              <Group
                key={room.id}
                x={room.position.x}
                y={room.position.y}
                rotation={room.rotation}
                draggable
                onClick={(event) => {
                  event.cancelBubble = true
                  selectEntity({ type: 'room', id: room.id })
                }}
                onDragMove={(event) => {
                  if (!settings.isSnapEnabled) {
                    setSnapHint(null)
                    return
                  }

                  const snapResult = getRoomSnapPosition(room, project.rooms, event.target.position(), 28)
                  setSnapHint(snapResult.hint)
                }}
                onDragEnd={(event) => {
                  const rawPosition = event.target.position()
                  const snapResult = settings.isSnapEnabled
                    ? getRoomSnapPosition(room, project.rooms, rawPosition, 28)
                    : { position: rawPosition, hint: null }

                  moveRoom({ roomId: room.id, position: snapResult.position })
                  setSnapHint(null)
                }}
              >
                {!hasWalls ? (
                  <Rect width={160} height={110} fill="#f8fafc" stroke={isSelected ? '#2563eb' : '#aeb8c6'} strokeWidth={2} dash={[8, 6]} />
                ) : null}
                {room.walls.map((wall) => (
                  <Line
                    key={wall.id}
                    points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
                    stroke={isSelected ? '#2563eb' : '#1f2937'}
                    strokeWidth={wall.thickness}
                    lineCap="round"
                  />
                ))}
                <Text x={8} y={8} text={room.name} fontSize={13} fill="#172033" />
              </Group>
            )
          })}
          {snapHint ? <Circle x={snapHint.x} y={snapHint.y} radius={9} stroke="#0fba81" strokeWidth={2} dash={[4, 4]} /> : null}
        </Layer>
      </Stage>
    </div>
  )
}

export { PlanCanvas }
