'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ObjectTemplateForm } from '@/widgets/object-template-form/object-template-form'
import styles from '@/shared/ui/workspace.module.css'

const TemplatesPage = () => {
  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Шаблоны объектов</h1>
          <p className={styles.hint}>Размеры сохраняются в миллиметрах и используются при размещении на стенах.</p>
        </div>
        <Link className={styles.button} href="/editor">
          <ArrowLeft size={16} />
          В конструктор
        </Link>
      </div>
      <ObjectTemplateForm />
    </main>
  )
}

export default TemplatesPage
