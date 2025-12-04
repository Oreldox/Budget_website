'use client'

import { X } from 'lucide-react'
import type { BudgetLine, Contract, Invoice } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { useContracts, useInvoices } from '@/lib/hooks'

interface BudgetLineDetailDrawerProps {
  line: BudgetLine | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BudgetLineDetailDrawer({ line, open, onOpenChange }: BudgetLineDetailDrawerProps) {
  const { contracts: allContracts } = useContracts()
  const { invoices: allInvoices } = useInvoices()

  if (!line) return null

  const relatedContracts = allContracts.filter((c) => c.budgetLineId === line.id)
  const relatedInvoices = allInvoices.filter((i) => i.budgetLineId === line.id)

  const remainingBudget = line.budget - line.engineered
  const budgetPct = line.budget > 0 ? (line.engineered / line.budget) * 100 : 0

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Détails de la ligne budgétaire</DrawerTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        <div className="space-y-6 overflow-y-auto px-6 pb-8 max-h-[70vh]">
          {/* Header */}
          <div className="space-y-2 border-b border-slate-700 pb-4">
            <h3 className="text-lg font-semibold text-slate-50">{line.label}</h3>
            <div className="flex gap-2">
              <span className="inline-block px-2 py-1 rounded text-xs bg-slate-800 text-slate-300">{line.type?.name}</span>
              <span className="inline-block px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">{line.domain?.name}</span>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Budget</p>
              <p className="text-2xl font-bold text-slate-50 mt-1">{line.budget.toLocaleString('fr-FR')}€</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Engagé</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{line.engineered.toLocaleString('fr-FR')}€</p>
              <p className="text-xs text-slate-500 mt-1">{budgetPct.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Disponible</p>
              <p className={`text-2xl font-bold mt-1 ${remainingBudget > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {remainingBudget.toLocaleString('fr-FR')}€
              </p>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(budgetPct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">{budgetPct.toFixed(1)}% utilisé</p>
          </div>

          {/* Accounting */}
          {line.accountingCode && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Code comptable</p>
              <p className="text-slate-50 mt-1">{line.accountingCode}</p>
            </div>
          )}

          {/* Related Contracts */}
          <div>
            <h4 className="font-semibold text-slate-50 mb-3">Contrats associés ({relatedContracts.length})</h4>
            {relatedContracts.length === 0 ? (
              <p className="text-slate-400 text-sm">Aucun contrat</p>
            ) : (
              <div className="space-y-2">
                {relatedContracts.map((contract) => (
                  <div key={contract.id} className="rounded bg-slate-800/50 p-3 text-sm">
                    <p className="font-medium text-slate-50">{contract.label}</p>
                    <p className="text-xs text-slate-400 mt-1">{contract.vendor}</p>
                    <p className="text-sm text-cyan-400 font-semibold mt-1">{contract.amount.toLocaleString('fr-FR')}€</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related Invoices */}
          <div>
            <h4 className="font-semibold text-slate-50 mb-3">Factures associées ({relatedInvoices.length})</h4>
            {relatedInvoices.length === 0 ? (
              <p className="text-slate-400 text-sm">Aucune facture</p>
            ) : (
              <div className="space-y-2">
                {relatedInvoices.slice(0, 10).map((invoice) => (
                  <div key={invoice.id} className="rounded bg-slate-800/50 p-3 text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-slate-50">{invoice.number}</p>
                        <p className="text-xs text-slate-400 mt-1">{invoice.vendor}</p>
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${
                          invoice.status === 'Payée'
                            ? 'bg-emerald-900/50 text-emerald-300'
                            : invoice.status === 'En attente'
                              ? 'bg-blue-900/50 text-blue-300'
                              : 'bg-red-900/50 text-red-300'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </div>
                    <p className="text-sm text-blue-400 font-semibold mt-1">{invoice.amount.toLocaleString('fr-FR')}€</p>
                  </div>
                ))}
                {relatedInvoices.length > 10 && (
                  <p className="text-xs text-slate-400 text-center py-2">+{relatedInvoices.length - 10} autres factures</p>
                )}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
