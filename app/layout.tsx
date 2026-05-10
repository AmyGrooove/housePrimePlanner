import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { AppInitializer } from '@/shared/ui/app-initializer'
import './globals.css'

export const metadata: Metadata = {
  title: 'House Prime Planner',
  description: '2D редактор планировки дома'
}

type RootLayoutProperties = {
  children: ReactNode
}

const RootLayout = ({ children }: RootLayoutProperties) => {
  return (
    <html lang="ru">
      <body>
        <AppInitializer />
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}

export default RootLayout
