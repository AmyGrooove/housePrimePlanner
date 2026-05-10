'use client'

import { useEffect, useRef, useState } from 'react'

type CanvasSize = {
  width: number
  height: number
}

const useCanvasSize = () => {
  const containerReference = useRef<HTMLDivElement | null>(null)
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 900, height: 640 })

  useEffect(() => {
    const container = containerReference.current

    if (!container) {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return
      }

      setCanvasSize({
        width: Math.max(320, entry.contentRect.width),
        height: Math.max(320, entry.contentRect.height)
      })
    })

    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  return { canvasSize, containerReference }
}

export { useCanvasSize }
