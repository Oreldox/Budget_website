'use client'

import { Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { Contract } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'

interface ContractDetailDrawerProps {
  contract: Contract | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (contract: Contract) => void
  onDelete: (id: string) => void
}

export function ContractDetailDrawer({ contract, open, onOpenChange, onEdit, onDelete }: ContractDetailDrawerProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  if (!contract) return null

  const handleDelete = () => {
    onDelete(contract.id)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Détails du contrat</DrawerTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        <div className="space-y-6 overflow-y-auto px-6 pb-8">
          {/* Header */}
          <div className="space-y-2 border-b border-slate-700 pb-4">
            <h3 className="text-lg font-semibold text-slate-50">{contract.label}</h3>
            <p className="text-sm text-slate-400">{contract.number}</p>
          </div>

          {/* Main Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Fournisseur</label>
              <p className="mt-1 text-slate-50">{contract.vendor}</p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Type</label>
              <p className="mt-1 text-slate-50">{contract.type?.name}</p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Domaine</label>
              <p className="mt-1 text-slate-50">{contract.domain?.name}</p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Statut</label>
              <div className="mt-1">
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    contract.status === 'Actif'
                      ? 'bg-emerald-900/50 text-emerald-300'
                      : contract.status === 'Expirant'
                        ? 'bg-amber-900/50 text-amber-300'
                        : 'bg-red-900/50 text-red-300'
                  }`}
                >
                  {contract.status}
                </span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Début</label>
              <p className="mt-1 text-slate-50">{new Date(contract.startDate).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Fin</label>
              <p className="mt-1 text-slate-50">{new Date(contract.endDate).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          {/* Amounts */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">
              Montants par année
            </label>
            <div className="space-y-2">
              {contract.yearlyAmounts.map((ya) => (
                <div key={ya.year} className="flex justify-between rounded bg-slate-800/50 px-3 py-2">
                  <span className="text-slate-300">{ya.year}</span>
                  <span className="font-medium text-cyan-400">{ya.amount.toLocaleString('fr-FR')}€</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {contract.description && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Description</label>
              <p className="mt-2 text-slate-300">{contract.description}</p>
            </div>
          )}

          {/* Constraints */}
          {contract.constraints && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Contraintes</label>
              <p className="mt-2 rounded bg-amber-900/20 px-3 py-2 text-amber-300">{contract.constraints}</p>
            </div>
          )}

          {/* Accounting */}
          {contract.accountingCode && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                Code comptable
              </label>
              <p className="mt-1 text-slate-50">{contract.accountingCode}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-slate-700 px-6 py-4 flex gap-2 justify-end">
          {showConfirm ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>
                Annuler
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Supprimer
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirm(true)}
                className="text-red-400 hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
