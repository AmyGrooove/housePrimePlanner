'use client'

import { useEffect } from 'react'
import { initializePersistence } from '@/entities/project/persistence'

const AppInitializer = () => {
  useEffect(() => {
    initializePersistence()
  }, [])

  return null
}

export { AppInitializer }
