'use client'

import { X, FileText, FileStack, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import type { SearchResult } from '@/lib/types'

interface SearchResultsDrawerProps {
  query: string
  results: SearchResult[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchResultsDrawer({ query, results, open, onOpenChange }: SearchResultsDrawerProps) {
  const router = useRouter()

  const invoices = results.filter((r) => r.type === 'invoice')
  const contracts = results.filter((r) => r.type === 'contract')
  const budgetLines = results.filter((r) => r.type === 'budget-line')

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'invoice') {
      router.push(`/factures?search=${encodeURIComponent(result.title)}`)
    } else if (result.type === 'contract') {
      router.push(`/contrats?search=${encodeURIComponent(result.title)}`)
    } else if (result.type === 'budget-line') {
      router.push(`/structure-budgetaire?search=${encodeURIComponent(result.title)}`)
    }
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Résultats de recherche: "{query}"</DrawerTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        <div className="space-y-6 overflow-y-auto px-6 pb-8 max-h-[70vh]">
          {results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">Aucun résultat trouvé pour "{query}"</p>
            </div>
          ) : (
            <>
              {/* Invoices Section */}
              {invoices.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-50 mb-3">
                    <FileText className="h-5 w-5 text-blue-400" />
                    Factures ({invoices.length})
                  </h3>
                  <div className="space-y-2">
                    {invoices.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-slate-50">{result.title}</p>
                            <p className="text-sm text-slate-400 mt-1">{result.subtitle}</p>
                          </div>
                          {result.amount && <p className="font-semibold text-blue-400 ml-2">{result.amount.toLocaleString('fr-FR')}€</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Contracts Section */}
              {contracts.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-50 mb-3">
                    <FileStack className="h-5 w-5 text-cyan-400" />
                    Contrats ({contracts.length})
                  </h3>
                  <div className="space-y-2">
                    {contracts.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-slate-50">{result.title}</p>
                            <p className="text-sm text-slate-400 mt-1">{result.subtitle}</p>
                          </div>
                          {result.amount && <p className="font-semibold text-cyan-400 ml-2">{result.amount.toLocaleString('fr-FR')}€</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget Lines Section */}
              {budgetLines.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-50 mb-3">
                    <BookOpen className="h-5 w-5 text-green-400" />
                    Lignes Budgétaires ({budgetLines.length})
                  </h3>
                  <div className="space-y-2">
                    {budgetLines.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-green-500/50 hover:bg-slate-800 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-slate-50">{result.title}</p>
                            <p className="text-sm text-slate-400 mt-1">{result.subtitle}</p>
                          </div>
                          {result.amount && <p className="font-semibold text-green-400 ml-2">{result.amount.toLocaleString('fr-FR')}€</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
