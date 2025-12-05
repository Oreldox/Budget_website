'use client'

import { Suspense } from 'react'
import FacturesPage from './FacturesPageContent'

export default function FacturesContent() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Chargement...</div>}>
      <FacturesPage />
    </Suspense>
  )
}
