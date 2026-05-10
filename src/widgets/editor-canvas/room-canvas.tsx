'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useUnit } from 'effector-react'
import { Arc, Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva'
import {
  $activeTool,
  $editorSettings,
  $project,
  $selectedEntity,
  $selectedTemplateId,
  addPlacedObjectClicked,
  addWallClicked,
  selectedEntityChanged,
  updatePlacedObjectChanged,
  updateWallChanged,
  zoomChanged
} from '@/entities/project/model'
import {
  findNearestWall,
  getAngleBetweenPoints,
  getDistanceBetweenPoints,
  getObjectPositionOnWall,
  getSnappedEndpoint,
  snapPointToGrid
} from '@/shared/lib/geometry'
import { convertMillimetersToPixels, convertPixelsToMillimeters } from '@/shared/lib/units'
import type { PlacedObject, Point, Wall } from '@/shared/types'
import styles from '@/shared/ui/workspace.module.css'
import { useCanvasSize } from './use-canvas-size'

type RoomCanvasProperties = {
  roomId: string
}

const getStagePoint = (stage: Konva.Stage, zoom: number): Point | null => {
  const pointerPosition = stage.getPointerPosition()

  if (!pointerPosition) {
    return null
  }

  return {
    x: (pointerPosition.x - stage.x()) / zoom,
    y: (pointerPosition.y - stage.y()) / zoom
  }
}

const renderGrid = (width: number, height: number, gridSize: number, zoom: number, stagePosition: Point) => {
  const lines: ReactNode[] = []
  const visibleWidth = width / zoom
  const visibleHeight = height / zoom
  const startX = -stagePosition.x / zoom - gridSize
  const startY = -stagePosition.y / zoom - gridSize
  const endX = startX + visibleWidth + gridSize * 2
  const endY = startY + visibleHeight + gridSize * 2

  for (let verticalPosition = Math.floor(startX / gridSize) * gridSize; verticalPosition < endX; verticalPosition += gridSize) {
    lines.push(
      <Line
        key={`vertical-${verticalPosition}`}
        points={[verticalPosition, startY, verticalPosition, endY]}
        stroke="#dce3ec"
        strokeWidth={1 / zoom}
      />
    )
  }

  for (let horizontalPosition = Math.floor(startY / gridSize) * gridSize; horizontalPosition < endY; horizontalPosition += gridSize) {
    lines.push(
      <Line
        key={`horizontal-${horizontalPosition}`}
        points={[startX, horizontalPosition, endX, horizontalPosition]}
        stroke="#dce3ec"
        strokeWidth={1 / zoom}
      />
    )
  }

  return lines
}

const ObjectShape = ({ wall, template }: { wall?: Wall; template?: { type: string; width: number; thickness: number } }) => {
  const width = template ? convertMillimetersToPixels(template.width) : 70
  const thickness = template ? convertMillimetersToPixels(template.thickness) : 8

  if (template?.type === 'door') {
    return (
      <Group>
        <Line points={[-width / 2, 0, width / 2, 0]} stroke="#ffffff" strokeWidth={Math.max(10, wall?.thickness ?? 10)} />
        <Line points={[-width / 2, 0, -width / 2, -width]} stroke="#2563eb" strokeWidth={2} />
        <Arc x={-width / 2} y={0} innerRadius={width} outerRadius={width} angle={90} rotation={-90} stroke="#2563eb" strokeWidth={2} />
      </Group>
    )
  }

  return (
      <Group>
      <Rect
        x={-width / 2}
        y={-thickness / 2}
        width={width}
        height={Math.max(6, thickness)}
        fill={template?.type === 'window' ? '#bfdbfe' : '#e0f2fe'}
        stroke="#2563eb"
        strokeWidth={2}
      />
    </Group>
  )
}

const RoomCanvas = ({ roomId }: RoomCanvasProperties) => {
  const stageReference = useRef<Konva.Stage | null>(null)
  const { canvasSize, containerReference } = useCanvasSize()
  const [project, activeTool, settings, selectedEntity, selectedTemplateId, addWall, updateWall, selectEntity, addObject, updateObject, setZoom] =
    useUnit([
      $project,
      $activeTool,
      $editorSettings,
      $selectedEntity,
      $selectedTemplateId,
      addWallClicked,
      updateWallChanged,
      selectedEntityChanged,
      addPlacedObjectClicked,
      updatePlacedObjectChanged,
      zoomChanged
    ])
  const [draftStart, setDraftStart] = useState<Point | null>(null)
  const [draftEnd, setDraftEnd] = useState<Point | null>(null)
  const [stagePosition, setStagePosition] = useState<Point>({ x: 0, y: 0 })

  const room = project.rooms.find((availableRoom) => availableRoom.id === roomId) ?? project.rooms[0]

  const selectedTemplate = project.objectTemplates.find((template) => template.id === selectedTemplateId)

  const handleStagePointerDown = () => {
    const stage = stageReference.current

    if (!stage || !room || activeTool !== 'wall') {
      return
    }

    const point = getStagePoint(stage, settings.zoom)

    if (!point) {
      return
    }

    const snappedPoint = settings.isSnapEnabled ? snapPointToGrid(point, settings.gridSize) : point

    if (!draftStart) {
      setDraftStart(snappedPoint)
      setDraftEnd(snappedPoint)
      return
    }

    const finalEnd = getSnappedEndpoint(draftStart, snappedPoint, 45)
    const snappedFinalEnd = settings.isSnapEnabled ? snapPointToGrid(finalEnd, settings.gridSize) : finalEnd

    addWall({ roomId: room.id, start: draftStart, end: snappedFinalEnd, thickness: convertMillimetersToPixels(160) })
    setDraftStart(snappedFinalEnd)
    setDraftEnd(snappedFinalEnd)
  }

  const handleStagePointerMove = () => {
    const stage = stageReference.current

    if (!stage || !draftStart) {
      return
    }

    const point = getStagePoint(stage, settings.zoom)

    if (!point) {
      return
    }

    setDraftEnd(getSnappedEndpoint(draftStart, point, 45))
  }

  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault()
    const direction = event.evt.deltaY > 0 ? -0.08 : 0.08
    setZoom(settings.zoom + direction)
  }

  const handleWallClick = (event: KonvaEventObject<MouseEvent>, wall: Wall) => {
    event.cancelBubble = true

    if (activeTool === 'object' && selectedTemplate) {
      const stage = stageReference.current
      const point = stage ? getStagePoint(stage, settings.zoom) : null
      const position = point ? getObjectPositionOnWall(point, wall) : wall.start

      addObject({
        roomId: room.id,
        templateId: selectedTemplate.id,
        position,
        rotation: getAngleBetweenPoints(wall.start, wall.end),
        attachedWallId: wall.id
      })
      return
    }

    selectEntity({ type: 'wall', roomId: room.id, wallId: wall.id })
  }

  const drawingLine = useMemo(() => {
    if (!draftStart || !draftEnd) {
      return null
    }

    return <Line points={[draftStart.x, draftStart.y, draftEnd.x, draftEnd.y]} stroke="#2563eb" strokeWidth={3} dash={[8, 6]} />
  }, [draftEnd, draftStart])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      setDraftStart(null)
      setDraftEnd(null)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!room) {
    return <div className={styles.empty}>Комната не найдена.</div>
  }

  return (
    <div className={styles.canvas} ref={containerReference}>
      <Stage
        ref={stageReference}
        width={canvasSize.width}
        height={canvasSize.height}
        draggable={activeTool === 'pan'}
        x={stagePosition.x}
        y={stagePosition.y}
        scaleX={settings.zoom}
        scaleY={settings.zoom}
        onDragEnd={(event) => {
          if (event.target === event.currentTarget) {
            setStagePosition({ x: event.target.x(), y: event.target.y() })
          }
        }}
        onMouseDown={handleStagePointerDown}
        onMouseMove={handleStagePointerMove}
        onWheel={handleWheel}
      >
        <Layer>
          {settings.isGridVisible ? renderGrid(canvasSize.width, canvasSize.height, settings.gridSize, settings.zoom, stagePosition) : null}
          {room.walls.map((wall) => {
            const isSelected = selectedEntity?.type === 'wall' && selectedEntity.wallId === wall.id
            const lengthLabel = `${convertPixelsToMillimeters(getDistanceBetweenPoints(wall.start, wall.end))} мм`
            const labelPoint = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 }

            return (
              <Group key={wall.id}>
                <Line
                  points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
                  stroke={isSelected ? '#2563eb' : '#1f2937'}
                  strokeWidth={wall.thickness}
                  lineCap="round"
                  onClick={(event) => handleWallClick(event, wall)}
                />
                <Text x={labelPoint.x + 8} y={labelPoint.y + 8} text={lengthLabel} fontSize={12} fill="#475569" />
                {isSelected ? (
                  <>
                    <Circle
                      x={wall.start.x}
                      y={wall.start.y}
                      radius={7}
                      fill="#ffffff"
                      stroke="#2563eb"
                      strokeWidth={2}
                      draggable
                      onDragMove={(event) =>
                        updateWall({
                          roomId: room.id,
                          wallId: wall.id,
                          patch: { start: settings.isSnapEnabled ? snapPointToGrid(event.target.position(), settings.gridSize) : event.target.position() }
                        })
                      }
                    />
                    <Circle
                      x={wall.end.x}
                      y={wall.end.y}
                      radius={7}
                      fill="#ffffff"
                      stroke="#2563eb"
                      strokeWidth={2}
                      draggable
                      onDragMove={(event) =>
                        updateWall({
                          roomId: room.id,
                          wallId: wall.id,
                          patch: { end: settings.isSnapEnabled ? snapPointToGrid(event.target.position(), settings.gridSize) : event.target.position() }
                        })
                      }
                    />
                  </>
                ) : null}
              </Group>
            )
          })}
          {room.placedObjects.map((placedObject) => {
            const wall = room.walls.find((currentWall) => currentWall.id === placedObject.attachedWallId)
            const template = project.objectTemplates.find((currentTemplate) => currentTemplate.id === placedObject.templateId)

            return (
              <Group
                key={placedObject.id}
                x={placedObject.position.x}
                y={placedObject.position.y}
                rotation={placedObject.rotation}
                draggable
                onClick={() => selectEntity({ type: 'object', roomId: room.id, objectId: placedObject.id })}
                onDragMove={(event) => {
                  const nearestWall = findNearestWall(event.target.position(), room.walls, 80)

                  if (!nearestWall) {
                    return
                  }

                  updateObject({
                    roomId: room.id,
                    objectId: placedObject.id,
                    patch: {
                      position: nearestWall.point,
                      rotation: getAngleBetweenPoints(nearestWall.wall.start, nearestWall.wall.end),
                      attachedWallId: nearestWall.wall.id
                    }
                  })
                }}
              >
                <ObjectShape wall={wall} template={template} />
              </Group>
            )
          })}
          {drawingLine}
        </Layer>
      </Stage>
      {draftStart ? (
        <button className={styles.button} style={{ position: 'absolute', left: 14, bottom: 14 }} type="button" onClick={() => { setDraftStart(null); setDraftEnd(null) }}>
          Завершить стену
        </button>
      ) : null}
    </div>
  )
}

export { RoomCanvas }
