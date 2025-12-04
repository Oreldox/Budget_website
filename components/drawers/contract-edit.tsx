'use client'

import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import type { Contract, BudgetTypeLabel, BudgetDomain } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { useBudgetStructure } from '@/lib/hooks'

interface ContractEditDrawerProps {
  contract: Contract | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, updates: Partial<Contract>) => void
  onDelete: (id: string) => void
}

export function ContractEditDrawer({ contract, open, onOpenChange, onUpdate, onDelete }: ContractEditDrawerProps) {
  const { budgetLines, types, domains } = useBudgetStructure()
  const [formData, setFormData] = useState<Partial<Contract> | null>(null)
  const [yearlyAmounts, setYearlyAmounts] = useState(contract?.yearlyAmounts || [])
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (contract) {
      setFormData(contract)
      setYearlyAmounts(contract.yearlyAmounts)
    }
  }, [contract])

  if (!contract || !formData) return null

  const handleSave = () => {
    if (!formData.number || !formData.label || !formData.vendor || !formData.type) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }
    
    onUpdate(contract.id, {
      ...formData,
      yearlyAmounts: yearlyAmounts.filter((ya) => ya.amount > 0),
    })
    
    onOpenChange(false)
  }

  const handleDelete = () => {
    onDelete(contract.id)
    onOpenChange(false)
  }

  const addYearlyAmount = () => {
    setYearlyAmounts([...yearlyAmounts, { year: new Date().getFullYear() + 1, amount: 0 }])
  }

  const removeYearlyAmount = (index: number) => {
    setYearlyAmounts(yearlyAmounts.filter((_, i) => i !== index))
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Modifier le contrat</DrawerTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        <div className="space-y-6 overflow-y-auto px-6 pb-8 max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">N° de contrat</label>
              <Input
                value={formData.number || ''}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Libellé</label>
              <Input
                value={formData.label || ''}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fournisseur</label>
              <Input
                value={formData.vendor || ''}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
              <Select value={(typeof formData.type === 'string' ? formData.type : formData.type?.id) || ''} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Domaine</label>
              <Select value={(typeof formData.domain === 'string' ? formData.domain : formData.domain?.id) || ''} onValueChange={(value) => setFormData({ ...formData, domain: value as any })}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Statut</label>
              <Select value={formData.status || ''} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Actif">Actif</SelectItem>
                  <SelectItem value="Expirant">Expirant</SelectItem>
                  <SelectItem value="Expiré">Expiré</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Date de début</label>
              <DatePicker
                value={formData.startDate ? formData.startDate.split('T')[0] : ''}
                onChange={(date) => setFormData({ ...formData, startDate: date })}
                placeholder="JJ/MM/AAAA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Date de fin</label>
              <DatePicker
                value={formData.endDate ? formData.endDate.split('T')[0] : ''}
                onChange={(date) => setFormData({ ...formData, endDate: date })}
                placeholder="JJ/MM/AAAA"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Montant total</label>
            <Input
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              className="bg-slate-800 border-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Montants par année</label>
            <div className="space-y-2">
              {yearlyAmounts.map((ya, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    type="number"
                    value={ya.year}
                    onChange={(e) => {
                      const newAmounts = [...yearlyAmounts]
                      newAmounts[idx].year = Number(e.target.value)
                      setYearlyAmounts(newAmounts)
                    }}
                    className="w-20 bg-slate-800 border-slate-700"
                  />
                  <Input
                    type="number"
                    value={ya.amount}
                    onChange={(e) => {
                      const newAmounts = [...yearlyAmounts]
                      newAmounts[idx].amount = Number(e.target.value)
                      setYearlyAmounts(newAmounts)
                    }}
                    className="flex-1 bg-slate-800 border-slate-700"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeYearlyAmount(idx)}
                    className="px-2 text-red-400 hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addYearlyAmount} className="mt-2">
              Ajouter une année
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-slate-50 placeholder-slate-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Contraintes</label>
            <textarea
              value={formData.constraints || ''}
              onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
              className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-slate-50 placeholder-slate-500"
              rows={2}
            />
          </div>
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
              <Button variant="outline" onClick={() => onOpenChange(false)}>
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
              <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700">
                Enregistrer
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
