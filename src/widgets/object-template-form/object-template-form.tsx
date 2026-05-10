'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useUnit } from 'effector-react'
import { Trash2 } from 'lucide-react'
import {
  $project,
  addTemplateSubmitted,
  deleteTemplateClicked,
  updateTemplateSubmitted
} from '@/entities/project/model'
import { objectTemplateSchema } from '@/entities/project/schema'
import type { ObjectTemplate, ObjectTemplateType } from '@/shared/types'
import styles from '@/shared/ui/workspace.module.css'

type TemplateFormValues = {
  name: string
  type: ObjectTemplateType
  width: number
  height: number
  thickness: number
}

const formSchema = objectTemplateSchema.omit({ id: true, metadata: true })

const defaultValues: TemplateFormValues = {
  name: '',
  type: 'door',
  width: 900,
  height: 2100,
  thickness: 80
}

const ObjectTemplateForm = () => {
  const [project, addTemplate, updateTemplate, deleteTemplate] = useUnit([
    $project,
    addTemplateSubmitted,
    updateTemplateSubmitted,
    deleteTemplateClicked
  ])
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, reset } = useForm<TemplateFormValues>({ defaultValues })

  const submitTemplate = (values: TemplateFormValues) => {
    const parsedTemplate = formSchema.safeParse({
      ...values,
      width: Number(values.width),
      height: Number(values.height),
      thickness: Number(values.thickness)
    })

    if (!parsedTemplate.success) {
      setFormError(parsedTemplate.error.issues[0]?.message ?? 'Проверьте поля')
      return
    }

    setFormError(null)

    if (editingTemplateId) {
      updateTemplate({ ...parsedTemplate.data, id: editingTemplateId })
    } else {
      addTemplate(parsedTemplate.data)
    }

    setEditingTemplateId(null)
    reset(defaultValues)
  }

  const startEditingTemplate = (template: ObjectTemplate) => {
    setEditingTemplateId(template.id)
    reset({
      name: template.name,
      type: template.type,
      width: template.width,
      height: template.height,
      thickness: template.thickness
    })
  }

  return (
    <div className={styles.cardGrid}>
      <form className={styles.card} onSubmit={handleSubmit(submitTemplate)}>
        <h2 className={styles.sectionTitle}>{editingTemplateId ? 'Редактирование' : 'Новый шаблон'}</h2>
        <label className={styles.label}>
          Название
          <input className={styles.field} {...register('name')} />
        </label>
        <label className={styles.label}>
          Тип
          <select className={styles.select} {...register('type')}>
            <option value="door">Дверь</option>
            <option value="window">Окно</option>
            <option value="custom">Кастомный объект</option>
          </select>
        </label>
        <label className={styles.label}>
          Ширина, мм
          <input className={styles.field} type="number" min={1} {...register('width', { valueAsNumber: true })} />
        </label>
        <label className={styles.label}>
          Высота, мм
          <input className={styles.field} type="number" min={1} {...register('height', { valueAsNumber: true })} />
        </label>
        <label className={styles.label}>
          Толщина, мм
          <input className={styles.field} type="number" min={1} {...register('thickness', { valueAsNumber: true })} />
        </label>
        {formError ? <p className={styles.danger}>{formError}</p> : null}
        <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit">
          {editingTemplateId ? 'Сохранить' : 'Создать'}
        </button>
      </form>

      {project.objectTemplates.map((template) => (
        <article className={styles.card} key={template.id}>
          <div>
            <h2 className={styles.itemTitle}>{template.name}</h2>
            <p className={styles.itemMeta}>
              {template.type} · {template.width}x{template.height}x{template.thickness} мм
            </p>
          </div>
          <button className={styles.button} type="button" onClick={() => startEditingTemplate(template)}>
            Редактировать
          </button>
          <button className={`${styles.button} ${styles.danger}`} type="button" onClick={() => deleteTemplate(template.id)}>
            <Trash2 size={16} />
            Удалить
          </button>
        </article>
      ))}
    </div>
  )
}

export { ObjectTemplateForm }
