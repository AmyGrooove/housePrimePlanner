'use client'

import type { ReactNode } from 'react'
import { useUnit } from 'effector-react'
import { Grid2X2, Hand, Magnet, MousePointer2, PenLine, RectangleHorizontal, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import clsx from 'clsx'
import {
  $activeTool,
  $editorSettings,
  $project,
  $selectedEntity,
  activeToolChanged,
  gridVisibilityToggled,
  rotateRoomChanged,
  snapToggled,
  zoomChanged
} from '@/entities/project/model'
import type { EditorTool } from '@/shared/types'
import styles from '@/shared/ui/workspace.module.css'

const tools: Array<{ id: EditorTool; title: string; icon: ReactNode }> = [
  { id: 'select', title: 'Выбор', icon: <MousePointer2 size={16} /> },
  { id: 'wall', title: 'Стена', icon: <PenLine size={16} /> },
  { id: 'object', title: 'Объект', icon: <RectangleHorizontal size={16} /> },
  { id: 'pan', title: 'Панорама', icon: <Hand size={16} /> }
]

type ToolbarProperties = {
  mode: 'plan' | 'room'
}

const Toolbar = ({ mode }: ToolbarProperties) => {
  const [activeTool, settings, project, selectedEntity, setTool, toggleGrid, toggleSnap, setZoom, rotateRoom] = useUnit([
    $activeTool,
    $editorSettings,
    $project,
    $selectedEntity,
    activeToolChanged,
    gridVisibilityToggled,
    snapToggled,
    zoomChanged,
    rotateRoomChanged
  ])

  return (
    <div className={styles.toolbarGroup}>
      {tools.map((tool) => (
        <button
          className={clsx(styles.iconButton, activeTool === tool.id && styles.active)}
          key={tool.id}
          type="button"
          title={tool.title}
          onClick={() => setTool(tool.id)}
        >
          {tool.icon}
        </button>
      ))}
      <button className={clsx(styles.iconButton, settings.isGridVisible && styles.active)} type="button" title="Сетка" onClick={() => toggleGrid()}>
        <Grid2X2 size={16} />
      </button>
      <button className={clsx(styles.iconButton, settings.isSnapEnabled && styles.active)} type="button" title="Snap" onClick={() => toggleSnap()}>
        <Magnet size={16} />
      </button>
      <button className={styles.iconButton} type="button" title="Уменьшить" onClick={() => setZoom(settings.zoom - 0.1)}>
        <ZoomOut size={16} />
      </button>
      <span className={styles.itemMeta}>{Math.round(settings.zoom * 100)}%</span>
      <button className={styles.iconButton} type="button" title="Увеличить" onClick={() => setZoom(settings.zoom + 0.1)}>
        <ZoomIn size={16} />
      </button>
      {mode === 'plan' && selectedEntity?.type === 'room' ? (
        <button
          className={styles.iconButton}
          type="button"
          title="Повернуть комнату на 45 градусов"
          onClick={() => {
            const room = project.rooms.find((availableRoom) => availableRoom.id === selectedEntity.id)
            rotateRoom({ roomId: selectedEntity.id, rotation: room ? (room.rotation + 45) % 360 : 45 })
          }}
        >
          <RotateCw size={16} />
        </button>
      ) : null}
    </div>
  )
}

export { Toolbar }
