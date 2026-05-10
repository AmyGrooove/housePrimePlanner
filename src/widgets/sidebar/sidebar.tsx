'use client'

import Link from 'next/link'
import { useUnit } from 'effector-react'
import { Plus } from 'lucide-react'
import clsx from 'clsx'
import {
  $project,
  $selectedEntity,
  $selectedTemplateId,
  createRoomClicked,
  selectedEntityChanged,
  selectedTemplateChanged
} from '@/entities/project/model'
import styles from '@/shared/ui/workspace.module.css'

type SidebarProperties = {
  mode: 'plan' | 'room'
  roomId?: string
}

const Sidebar = ({ mode, roomId }: SidebarProperties) => {
  const [project, selectedEntity, selectedTemplateId, createRoom, selectEntity, selectTemplate] = useUnit([
    $project,
    $selectedEntity,
    $selectedTemplateId,
    createRoomClicked,
    selectedEntityChanged,
    selectedTemplateChanged
  ])

  return (
    <aside className={styles.sidebar}>
      <section className={styles.panelSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Комнаты</h2>
          <button className={styles.iconButton} type="button" onClick={() => createRoom()} title="Создать комнату">
            <Plus size={16} />
          </button>
        </div>
        <div className={styles.list}>
          {project.rooms.map((room) => (
            <Link
              className={clsx(
                styles.listItem,
                (room.id === roomId || selectedEntity?.id === room.id) && styles.active
              )}
              href={`/rooms/${room.id}`}
              key={room.id}
              onClick={() => selectEntity({ type: 'room', id: room.id })}
            >
              <span className={styles.itemTitle}>{room.name}</span>
              <span className={styles.itemMeta}>{room.walls.length} стен</span>
            </Link>
          ))}
        </div>
      </section>
      <section className={styles.panelSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Шаблоны</h2>
          <Link className={styles.iconButton} href="/templates" title="Редактировать шаблоны">
            <Plus size={16} />
          </Link>
        </div>
        <div className={styles.list}>
          {project.objectTemplates.map((template) => (
            <button
              className={clsx(styles.listItem, selectedTemplateId === template.id && styles.active)}
              key={template.id}
              type="button"
              onClick={() => selectTemplate(template.id)}
            >
              <span className={styles.itemTitle}>{template.name}</span>
              <span className={styles.itemMeta}>
                {template.type} · {template.width}x{template.height} мм
              </span>
            </button>
          ))}
        </div>
        {mode === 'room' ? <p className={styles.hint}>Выберите шаблон и инструмент объекта, затем кликните по стене.</p> : null}
      </section>
    </aside>
  )
}

export { Sidebar }
