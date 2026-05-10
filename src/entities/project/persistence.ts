'use client'

import type { EditorSettings, Project } from '@/shared/types'
import { $editorSettings, $project, projectLoaded, settingsLoaded } from './model'
import { editorSettingsSchema, projectSchema } from './schema'

const PROJECT_STORAGE_KEY = 'house-prime-planner/project'
const SETTINGS_STORAGE_KEY = 'house-prime-planner/settings'

let isPersistenceInitialized = false

const readJson = (key: string): unknown => {
  const rawValue = window.localStorage.getItem(key)

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue)
  } catch {
    return null
  }
}

const initializePersistence = () => {
  if (isPersistenceInitialized || typeof window === 'undefined') {
    return
  }

  isPersistenceInitialized = true

  const projectResult = projectSchema.safeParse(readJson(PROJECT_STORAGE_KEY))
  const settingsResult = editorSettingsSchema.safeParse(readJson(SETTINGS_STORAGE_KEY))

  if (projectResult.success) {
    projectLoaded(projectResult.data as Project)
  }

  if (settingsResult.success) {
    settingsLoaded(settingsResult.data as EditorSettings)
  }

  $project.watch((project) => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project))
  })

  $editorSettings.watch((settings) => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  })
}

export { initializePersistence }
