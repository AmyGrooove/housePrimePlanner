export type Point = {
  x: number
  y: number
}

export type Wall = {
  id: string
  start: Point
  end: Point
  thickness: number
}

export type ObjectTemplateType = 'door' | 'window' | 'furniture' | 'custom'

export type ObjectTemplate = {
  id: string
  type: ObjectTemplateType
  name: string
  width: number
  height: number
  thickness: number
  metadata?: Record<string, unknown>
}

export type PlacedObject = {
  id: string
  templateId: string
  position: Point
  rotation: number
  attachedWallId?: string
}

export type Room = {
  id: string
  name: string
  position: Point
  rotation: number
  walls: Wall[]
  placedObjects: PlacedObject[]
}

export type Project = {
  id: string
  name: string
  rooms: Room[]
  objectTemplates: ObjectTemplate[]
  createdAt: string
  updatedAt: string
}

export type EditorTool = 'select' | 'wall' | 'object' | 'pan'

export type SelectedEntity =
  | { type: 'room'; id: string }
  | { type: 'wall'; roomId: string; wallId: string }
  | { type: 'object'; roomId: string; objectId: string }
  | null

export type EditorSettings = {
  gridSize: number
  isGridVisible: boolean
  isSnapEnabled: boolean
  zoom: number
}
