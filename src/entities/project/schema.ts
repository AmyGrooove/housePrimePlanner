import { z } from 'zod'

const pointSchema = z.object({
  x: z.number(),
  y: z.number()
})

const wallSchema = z.object({
  id: z.string(),
  start: pointSchema,
  end: pointSchema,
  thickness: z.number().positive()
})

const objectTemplateSchema = z.object({
  id: z.string(),
  type: z.enum(['door', 'window', 'furniture', 'custom']),
  name: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  thickness: z.number().positive(),
  metadata: z.record(z.unknown()).optional()
})

const placedObjectSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  position: pointSchema,
  rotation: z.number(),
  attachedWallId: z.string().optional()
})

const roomSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  position: pointSchema,
  rotation: z.number().default(0),
  walls: z.array(wallSchema),
  placedObjects: z.array(placedObjectSchema)
})

const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  rooms: z.array(roomSchema),
  objectTemplates: z.array(objectTemplateSchema),
  createdAt: z.string(),
  updatedAt: z.string()
})

const editorSettingsSchema = z.object({
  gridSize: z.number().positive(),
  isGridVisible: z.boolean(),
  isSnapEnabled: z.boolean(),
  zoom: z.number().positive()
})

export { editorSettingsSchema, objectTemplateSchema, projectSchema }
