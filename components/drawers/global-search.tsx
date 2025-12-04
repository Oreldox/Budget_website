'use client'

import { Search, X } from 'lucide-react'
import { useState } from 'react'
import type { SearchResult } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { useGlobalSearch } from '@/lib/hooks'

interface GlobalSearchDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectResult: (result: SearchResult) => void
}

export function GlobalSearchDrawer({ open, onOpenChange, onSelectResult }: GlobalSearchDrawerProps) {
  const { searchAll } = useGlobalSearch()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])

  const handleSearch = async (value: string) => {
    setQuery(value)
    if (value.trim()) {
      const results = await searchAll(value)
      setResults(results)
    } else {
      setResults([])
    }
  }

  const handleSelectResult = (result: SearchResult) => {
    onSelectResult(result)
    setQuery('')
    setResults([])
    onOpenChange(false)
  }

  const groupedResults = {
    invoices: results.filter((r) => r.type === 'invoice'),
    contracts: results.filter((r) => r.type === 'contract'),
    budgetLines: results.filter((r) => r.type === 'budget-line'),
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Recherche globale</DrawerTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        <div className="space-y-4 px-6 pb-8">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              autoFocus
              placeholder="Chercher une facture, contrat ou ligne budgétaire..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-base"
            />
          </div>

          {/* Results */}
          {results.length > 0 ? (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Invoices */}
              {groupedResults.invoices.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase text-slate-400 mb-3">Factures ({groupedResults.invoices.length})</h3>
                  <div className="space-y-2">
                    {groupedResults.invoices.map((result) => (
                      <div
                        key={result.id}
                        onClick={() => handleSelectResult(result)}
                        className="p-3 rounded bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-50">{result.title}</p>
                            <p className="text-xs text-slate-400">{result.subtitle}</p>
                          </div>
                          <span className="text-cyan-400 font-semibold">{result.amount?.toLocaleString('fr-FR')}€</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contracts */}
              {groupedResults.contracts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase text-slate-400 mb-3">Contrats ({groupedResults.contracts.length})</h3>
                  <div className="space-y-2">
                    {groupedResults.contracts.map((result) => (
                      <div
                        key={result.id}
                        onClick={() => handleSelectResult(result)}
                        className="p-3 rounded bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-50">{result.title}</p>
                            <p className="text-xs text-slate-400">{result.subtitle}</p>
                          </div>
                          <span className="text-cyan-400 font-semibold">{result.amount?.toLocaleString('fr-FR')}€</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget Lines */}
              {groupedResults.budgetLines.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase text-slate-400 mb-3">Lignes budgétaires ({groupedResults.budgetLines.length})</h3>
                  <div className="space-y-2">
                    {groupedResults.budgetLines.map((result) => (
                      <div
                        key={result.id}
                        onClick={() => handleSelectResult(result)}
                        className="p-3 rounded bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-50">{result.title}</p>
                            <p className="text-xs text-slate-400">{result.subtitle}</p>
                          </div>
                          <span className="text-cyan-400 font-semibold">{result.amount?.toLocaleString('fr-FR')}€</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : query ? (
            <div className="text-center py-12">
              <p className="text-slate-400">Aucun résultat pour "{query}"</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400">Commencez à taper pour rechercher...</p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
