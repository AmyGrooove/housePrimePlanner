'use client'

import { use } from 'react'
import { Navigation } from '@/widgets/navigation/navigation'
import { Sidebar } from '@/widgets/sidebar/sidebar'
import { Toolbar } from '@/widgets/toolbar/toolbar'
import { InspectorPanel } from '@/widgets/inspector-panel/inspector-panel'
import { RoomCanvas } from '@/widgets/editor-canvas/room-canvas'
import styles from '@/shared/ui/workspace.module.css'

type RoomPageProperties = {
  params: Promise<{
    roomId: string
  }>
}

const RoomPage = ({ params }: RoomPageProperties) => {
  const { roomId } = use(params)

  return (
    <main className={styles.shell}>
      <Navigation />
      <Sidebar mode="room" roomId={roomId} />
      <section className={styles.canvasArea}>
        <div style={{ position: 'absolute', left: 12, top: 12, zIndex: 2 }}>
          <Toolbar mode="room" />
        </div>
        <RoomCanvas roomId={roomId} />
      </section>
      <InspectorPanel />
    </main>
  )
}

export default RoomPage
