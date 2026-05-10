'use client'

import { useMemo } from 'react'
import { useUnit } from 'effector-react'
import { Trash2 } from 'lucide-react'
import {
  $project,
  $selectedEntity,
  deletePlacedObjectClicked,
  deleteWallClicked,
  renameRoomChanged,
  rotateRoomChanged,
  updateWallChanged,
  updateWallLengthChanged
} from '@/entities/project/model'
import { getDistanceBetweenPoints } from '@/shared/lib/geometry'
import { convertMillimetersToPixels, convertPixelsToMillimeters } from '@/shared/lib/units'
import styles from '@/shared/ui/workspace.module.css'

const InspectorPanel = () => {
  const [project, selectedEntity, renameRoom, rotateRoom, updateWall, updateWallLength, deleteWall, deletePlacedObject] =
    useUnit([
      $project,
      $selectedEntity,
      renameRoomChanged,
      rotateRoomChanged,
      updateWallChanged,
      updateWallLengthChanged,
      deleteWallClicked,
      deletePlacedObjectClicked
    ])

  const selectedRoom = useMemo(() => {
    if (!selectedEntity) {
      return null
    }

    const roomId = selectedEntity.type === 'room' ? selectedEntity.id : selectedEntity.roomId

    return project.rooms.find((room) => room.id === roomId) ?? null
  }, [project.rooms, selectedEntity])

  const selectedWall = useMemo(() => {
    if (selectedEntity?.type !== 'wall' || !selectedRoom) {
      return null
    }

    return selectedRoom.walls.find((wall) => wall.id === selectedEntity.wallId) ?? null
  }, [selectedEntity, selectedRoom])

  const selectedObject = useMemo(() => {
    if (selectedEntity?.type !== 'object' || !selectedRoom) {
      return null
    }

    return selectedRoom.placedObjects.find((placedObject) => placedObject.id === selectedEntity.objectId) ?? null
  }, [selectedEntity, selectedRoom])

  const selectedTemplate = selectedObject
    ? project.objectTemplates.find((template) => template.id === selectedObject.templateId)
    : null

  return (
    <aside className={styles.inspector}>
      <section className={styles.panelSection}>
        <h2 className={styles.sectionTitle}>Инспектор</h2>
      </section>

      {!selectedEntity ? <p className={styles.empty}>Выберите комнату, стену или объект.</p> : null}

      {selectedEntity?.type === 'room' && selectedRoom ? (
        <section className={styles.panelSection}>
          <div className={styles.form}>
            <label className={styles.label}>
              Название
              <input
                className={styles.field}
                value={selectedRoom.name}
                onChange={(event) => renameRoom({ roomId: selectedRoom.id, name: event.target.value })}
              />
            </label>
            <label className={styles.label}>
              Поворот
              <input
                className={styles.field}
                type="number"
                step={45}
                value={selectedRoom.rotation}
                onChange={(event) => rotateRoom({ roomId: selectedRoom.id, rotation: Number(event.target.value) })}
              />
            </label>
            <p className={styles.hint}>Позиция: {Math.round(selectedRoom.position.x)}, {Math.round(selectedRoom.position.y)} px</p>
          </div>
        </section>
      ) : null}

      {selectedEntity?.type === 'wall' && selectedWall ? (
        <section className={styles.panelSection}>
          <div className={styles.form}>
            <label className={styles.label}>
              Длина, мм
              <input
                className={styles.field}
                type="number"
                min={10}
                value={convertPixelsToMillimeters(getDistanceBetweenPoints(selectedWall.start, selectedWall.end))}
                onChange={(event) =>
                  updateWallLength({
                    roomId: selectedEntity.roomId,
                    wallId: selectedWall.id,
                    length: convertMillimetersToPixels(Number(event.target.value))
                  })
                }
              />
            </label>
            <label className={styles.label}>
              Толщина, мм
              <input
                className={styles.field}
                type="number"
                min={10}
                value={convertPixelsToMillimeters(selectedWall.thickness)}
                onChange={(event) =>
                  updateWall({
                    roomId: selectedEntity.roomId,
                    wallId: selectedWall.id,
                    patch: { thickness: convertMillimetersToPixels(Number(event.target.value)) }
                  })
                }
              />
            </label>
            <button
              className={`${styles.button} ${styles.danger}`}
              type="button"
              onClick={() => deleteWall({ roomId: selectedEntity.roomId, wallId: selectedWall.id })}
            >
              <Trash2 size={16} />
              Удалить стену
            </button>
          </div>
        </section>
      ) : null}

      {selectedEntity?.type === 'object' && selectedObject ? (
        <section className={styles.panelSection}>
          <div className={styles.form}>
            <p className={styles.itemTitle}>{selectedTemplate?.name ?? 'Объект'}</p>
            <p className={styles.hint}>Поворот: {Math.round(selectedObject.rotation)} градусов</p>
            <button
              className={`${styles.button} ${styles.danger}`}
              type="button"
              onClick={() => deletePlacedObject({ roomId: selectedEntity.roomId, objectId: selectedObject.id })}
            >
              <Trash2 size={16} />
              Удалить объект
            </button>
          </div>
        </section>
      ) : null}
    </aside>
  )
}

export { InspectorPanel }
