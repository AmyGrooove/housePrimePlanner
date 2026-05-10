'use client'

import Link from 'next/link'
import { useUnit } from 'effector-react'
import { ArrowRight, DoorOpen, LayoutPanelLeft, Plus } from 'lucide-react'
import { $project, createRoomClicked } from '@/entities/project/model'
import styles from '@/shared/ui/workspace.module.css'

const HomePage = () => {
  const [project, createRoom] = useUnit([$project, createRoomClicked])

  return (
    <>
      <div className={styles.topbar}>
        <Link className={styles.brand} href="/">
          <LayoutPanelLeft size={22} />
          House Prime Planner
        </Link>
        <nav className={styles.nav}>
          <Link className={styles.navLink} href="/editor">План</Link>
          <Link className={styles.navLink} href="/templates">Шаблоны</Link>
        </nav>
      </div>
      <main className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1>{project.name}</h1>
            <p className={styles.hint}>Комнаты: {project.rooms.length} · Шаблоны: {project.objectTemplates.length}</p>
          </div>
          <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/editor">
            Открыть конструктор
            <ArrowRight size={16} />
          </Link>
        </div>

        <section className={styles.cardGrid}>
          <article className={styles.card}>
            <LayoutPanelLeft size={24} />
            <h2>Общий план</h2>
            <p className={styles.hint}>Перемещайте комнаты на общем canvas, включайте snap и стыкуйте углы.</p>
            <Link className={styles.button} href="/editor">Перейти</Link>
          </article>
          <article className={styles.card}>
            <DoorOpen size={24} />
            <h2>Шаблоны объектов</h2>
            <p className={styles.hint}>Создавайте двери, окна и кастомные элементы в миллиметрах.</p>
            <Link className={styles.button} href="/templates">Настроить</Link>
          </article>
          <article className={styles.card}>
            <Plus size={24} />
            <h2>Новая комната</h2>
            <p className={styles.hint}>Комната создается отдельно и затем появляется в общем плане.</p>
            <button className={styles.button} type="button" onClick={() => createRoom()}>
              Создать
            </button>
          </article>
        </section>
      </main>
    </>
  )
}

export default HomePage
