'use client'

import { createEvent, createStore } from 'effector'
import { nanoid } from 'nanoid'
import type {
  EditorSettings,
  EditorTool,
  ObjectTemplate,
  PlacedObject,
  Point,
  Project,
  Room,
  SelectedEntity,
  Wall
} from '@/shared/types'
import { getAngleBetweenPoints, getPointByAngleAndDistance } from '@/shared/lib/geometry'
import { createDefaultProject } from './defaults'

type UpdateWallPayload = {
  roomId: string
  wallId: string
  patch: Partial<Wall>
}

type UpdateWallLengthPayload = {
  roomId: string
  wallId: string
  length: number
}

type UpdateObjectPayload = {
  roomId: string
  objectId: string
  patch: Partial<PlacedObject>
}

type AddWallPayload = {
  roomId: string
  start: Point
  end: Point
  thickness: number
}

type AddPlacedObjectPayload = {
  roomId: string
  templateId: string
  position: Point
  rotation: number
  attachedWallId?: string
}

const projectLoaded = createEvent<Project>()
const settingsLoaded = createEvent<EditorSettings>()
const createRoomClicked = createEvent()
const renameRoomChanged = createEvent<{ roomId: string; name: string }>()
const moveRoomChanged = createEvent<{ roomId: string; position: Point }>()
const rotateRoomChanged = createEvent<{ roomId: string; rotation: number }>()
const addWallClicked = createEvent<AddWallPayload>()
const updateWallChanged = createEvent<UpdateWallPayload>()
const updateWallLengthChanged = createEvent<UpdateWallLengthPayload>()
const deleteWallClicked = createEvent<{ roomId: string; wallId: string }>()
const addTemplateSubmitted = createEvent<Omit<ObjectTemplate, 'id'>>()
const updateTemplateSubmitted = createEvent<ObjectTemplate>()
const deleteTemplateClicked = createEvent<string>()
const addPlacedObjectClicked = createEvent<AddPlacedObjectPayload>()
const updatePlacedObjectChanged = createEvent<UpdateObjectPayload>()
const deletePlacedObjectClicked = createEvent<{ roomId: string; objectId: string }>()
const activeToolChanged = createEvent<EditorTool>()
const selectedEntityChanged = createEvent<SelectedEntity>()
const selectedTemplateChanged = createEvent<string | null>()
const gridVisibilityToggled = createEvent()
const snapToggled = createEvent()
const zoomChanged = createEvent<number>()

const updateTimestamp = (project: Project): Project => ({
  ...project,
  updatedAt: new Date().toISOString()
})

const updateRoom = (project: Project, roomId: string, updater: (room: Room) => Room): Project => {
  return updateTimestamp({
    ...project,
    rooms: project.rooms.map((room) => (room.id === roomId ? updater(room) : room))
  })
}

const $project = createStore<Project>(createDefaultProject())
  .on(projectLoaded, (_, project) => project)
  .on(createRoomClicked, (project) => {
    const roomNumber = project.rooms.length + 1

    return updateTimestamp({
      ...project,
      rooms: [
        ...project.rooms,
        {
          id: nanoid(),
          name: `Комната ${roomNumber}`,
          position: { x: 160 + roomNumber * 32, y: 120 + roomNumber * 32 },
          rotation: 0,
          walls: [],
          placedObjects: []
        }
      ]
    })
  })
  .on(renameRoomChanged, (project, { roomId, name }) =>
    updateRoom(project, roomId, (room) => ({ ...room, name: name.trim() || room.name }))
  )
  .on(moveRoomChanged, (project, { roomId, position }) =>
    updateRoom(project, roomId, (room) => ({ ...room, position }))
  )
  .on(rotateRoomChanged, (project, { roomId, rotation }) =>
    updateRoom(project, roomId, (room) => ({ ...room, rotation }))
  )
  .on(addWallClicked, (project, { roomId, start, end, thickness }) =>
    updateRoom(project, roomId, (room) => ({
      ...room,
      walls: [...room.walls, { id: nanoid(), start, end, thickness }]
    }))
  )
  .on(updateWallChanged, (project, { roomId, wallId, patch }) =>
    updateRoom(project, roomId, (room) => ({
      ...room,
      walls: room.walls.map((wall) => (wall.id === wallId ? { ...wall, ...patch } : wall))
    }))
  )
  .on(updateWallLengthChanged, (project, { roomId, wallId, length }) =>
    updateRoom(project, roomId, (room) => ({
      ...room,
      walls: room.walls.map((wall) => {
        if (wall.id !== wallId) {
          return wall
        }

        const angle = getAngleBetweenPoints(wall.start, wall.end)
        const end = getPointByAngleAndDistance(wall.start, angle, Math.max(1, length))

        return { ...wall, end }
      })
    }))
  )
  .on(deleteWallClicked, (project, { roomId, wallId }) =>
    updateRoom(project, roomId, (room) => ({
      ...room,
      walls: room.walls.filter((wall) => wall.id !== wallId),
      placedObjects: room.placedObjects.filter((placedObject) => placedObject.attachedWallId !== wallId)
    }))
  )
  .on(addTemplateSubmitted, (project, template) =>
    updateTimestamp({
      ...project,
      objectTemplates: [...project.objectTemplates, { ...template, id: nanoid() }]
    })
  )
  .on(updateTemplateSubmitted, (project, template) =>
    updateTimestamp({
      ...project,
      objectTemplates: project.objectTemplates.map((currentTemplate) =>
        currentTemplate.id === template.id ? template : currentTemplate
      )
    })
  )
  .on(deleteTemplateClicked, (project, templateId) =>
    updateTimestamp({
      ...project,
      objectTemplates: project.objectTemplates.filter((template) => template.id !== templateId),
      rooms: project.rooms.map((room) => ({
        ...room,
        placedObjects: room.placedObjects.filter((placedObject) => placedObject.templateId !== templateId)
      }))
    })
  )
  .on(addPlacedObjectClicked, (project, payload) =>
    updateRoom(project, payload.roomId, (room) => ({
      ...room,
      placedObjects: [
        ...room.placedObjects,
        {
          id: nanoid(),
          templateId: payload.templateId,
          position: payload.position,
          rotation: payload.rotation,
          attachedWallId: payload.attachedWallId
        }
      ]
    }))
  )
  .on(updatePlacedObjectChanged, (project, { roomId, objectId, patch }) =>
    updateRoom(project, roomId, (room) => ({
      ...room,
      placedObjects: room.placedObjects.map((placedObject) =>
        placedObject.id === objectId ? { ...placedObject, ...patch } : placedObject
      )
    }))
  )
  .on(deletePlacedObjectClicked, (project, { roomId, objectId }) =>
    updateRoom(project, roomId, (room) => ({
      ...room,
      placedObjects: room.placedObjects.filter((placedObject) => placedObject.id !== objectId)
    }))
  )

const $activeTool = createStore<EditorTool>('select').on(activeToolChanged, (_, tool) => tool)

const $selectedEntity = createStore<SelectedEntity>(null).on(selectedEntityChanged, (_, selectedEntity) => selectedEntity)

const $selectedTemplateId = createStore<string | null>(null).on(
  selectedTemplateChanged,
  (_, selectedTemplateId) => selectedTemplateId
)

const $editorSettings = createStore<EditorSettings>({
  gridSize: 24,
  isGridVisible: true,
  isSnapEnabled: true,
  zoom: 1
})
  .on(settingsLoaded, (_, settings) => settings)
  .on(gridVisibilityToggled, (settings) => ({ ...settings, isGridVisible: !settings.isGridVisible }))
  .on(snapToggled, (settings) => ({ ...settings, isSnapEnabled: !settings.isSnapEnabled }))
  .on(zoomChanged, (settings, zoom) => ({ ...settings, zoom: Math.min(2.5, Math.max(0.35, zoom)) }))

export {
  $activeTool,
  $editorSettings,
  $project,
  $selectedEntity,
  $selectedTemplateId,
  activeToolChanged,
  addPlacedObjectClicked,
  addTemplateSubmitted,
  addWallClicked,
  createRoomClicked,
  deletePlacedObjectClicked,
  deleteTemplateClicked,
  deleteWallClicked,
  gridVisibilityToggled,
  moveRoomChanged,
  projectLoaded,
  renameRoomChanged,
  rotateRoomChanged,
  selectedEntityChanged,
  selectedTemplateChanged,
  settingsLoaded,
  snapToggled,
  updatePlacedObjectChanged,
  updateTemplateSubmitted,
  updateWallChanged,
  updateWallLengthChanged,
  zoomChanged
}
