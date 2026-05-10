'use client'

import { Navigation } from '@/widgets/navigation/navigation'
import { Sidebar } from '@/widgets/sidebar/sidebar'
import { Toolbar } from '@/widgets/toolbar/toolbar'
import { InspectorPanel } from '@/widgets/inspector-panel/inspector-panel'
import { PlanCanvas } from '@/widgets/editor-canvas/plan-canvas'
import styles from '@/shared/ui/workspace.module.css'

const EditorPage = () => {
  return (
    <main className={styles.shell}>
      <Navigation />
      <Sidebar mode="plan" />
      <section className={styles.canvasArea}>
        <div style={{ position: 'absolute', left: 12, top: 12, zIndex: 2 }}>
          <Toolbar mode="plan" />
        </div>
        <PlanCanvas />
      </section>
      <InspectorPanel />
    </main>
  )
}

export default EditorPage
