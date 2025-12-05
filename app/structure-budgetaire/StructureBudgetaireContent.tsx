import { Suspense } from 'react'
import StructureBudgetairePage from './StructureBudgetairePageContent'

export default function StructureBudgetaireContent() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Chargement...</div>}>
      <StructureBudgetairePage />
    </Suspense>
  )
}
