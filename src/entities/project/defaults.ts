import { nanoid } from 'nanoid'
import type { Project } from '@/shared/types'

const createDefaultProject = (): Project => {
  const now = new Date().toISOString()

  return {
    id: nanoid(),
    name: 'Новый проект',
    rooms: [
      {
        id: nanoid(),
        name: 'Комната 1',
        position: { x: 160, y: 120 },
        rotation: 0,
        walls: [],
        placedObjects: []
      }
    ],
    objectTemplates: [
      {
        id: nanoid(),
        type: 'door',
        name: 'Дверь 900x2100',
        width: 900,
        height: 2100,
        thickness: 80
      },
      {
        id: nanoid(),
        type: 'window',
        name: 'Окно 1870x1610',
        width: 1870,
        height: 1610,
        thickness: 70
      }
    ],
    createdAt: now,
    updatedAt: now
  }
}

export { createDefaultProject }
