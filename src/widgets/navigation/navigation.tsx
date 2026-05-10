'use client'

import Link from 'next/link'
import { Boxes, LayoutGrid, LibraryBig } from 'lucide-react'
import styles from '@/shared/ui/workspace.module.css'

const Navigation = () => {
  return (
    <div className={styles.topbar}>
      <Link className={styles.brand} href="/">
        <Boxes size={22} />
        House Prime Planner
      </Link>
      <nav className={styles.nav}>
        <Link className={styles.navLink} href="/editor">
          <LayoutGrid size={16} />
          План
        </Link>
        <Link className={styles.navLink} href="/templates">
          <LibraryBig size={16} />
          Шаблоны
        </Link>
      </nav>
    </div>
  )
}

export { Navigation }
