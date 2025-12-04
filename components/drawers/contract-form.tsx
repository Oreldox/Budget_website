'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { Contract, BudgetTypeLabel, BudgetDomain } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { useBudgetStructure } from '@/lib/hooks'

interface ContractFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => void
}

export function ContractFormDrawer({ open, onOpenChange, onSubmit }: ContractFormDrawerProps) {
  const { budgetLines, types, domains } = useBudgetStructure()
  const [formData, setFormData] = useState({
    number: '',
    label: '',
    vendor: '',
    providerName: '',
    typeId: '',
    domainId: '',
    budgetLineId: '',
    startDate: '',
    endDate: '',
    amount: '',
    description: '',
    constraints: '',
    accountingCode: '',
    allocationCode: '',
    status: 'Actif' as const,
  })

  const [yearlyAmounts, setYearlyAmounts] = useState([{ year: new Date().getFullYear(), amount: '' }])

  const handleSubmit = () => {
    if (!formData.number || !formData.label || !formData.vendor || !formData.typeId || !formData.startDate || !formData.endDate || !formData.amount) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    onSubmit({
      ...formData,
      amount: Number(formData.amount),
      status: 'Actif',
      yearlyAmounts: yearlyAmounts
        .filter((ya) => ya.amount)
        .map((ya) => ({
          year: ya.year,
          amount: Number(ya.amount),
        })),
    })

    // Reset form
    setFormData({
      number: '',
      label: '',
      vendor: '',
      providerName: '',
      typeId: '',
      domainId: '',
      budgetLineId: '',
      startDate: '',
      endDate: '',
      amount: '',
      description: '',
      constraints: '',
      accountingCode: '',
      allocationCode: '',
      status: 'Actif',
    })
    setYearlyAmounts([{ year: new Date().getFullYear(), amount: '' }])
  }

  const addYearlyAmount = () => {
    setYearlyAmounts([...yearlyAmounts, { year: new Date().getFullYear() + 1, amount: '' }])
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Nouveau contrat</DrawerTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        <div className="space-y-6 overflow-y-auto px-6 pb-8 max-h-[70vh]">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">N° de contrat*</label>
              <Input
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                placeholder="CTR-2024-001"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Libellé*</label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Licenses Microsoft 365"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fournisseur*</label>
              <Input
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                placeholder="Microsoft"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Type*</label>
              <Select value={formData.typeId} onValueChange={(value) => setFormData({ ...formData, typeId: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Sélectionner un type" />
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

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Domaine</label>
              <Select value={formData.domainId} onValueChange={(value) => setFormData({ ...formData, domainId: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Sélectionner un domaine" />
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
              <label className="block text-sm font-medium text-slate-300 mb-2">Ligne budgétaire</label>
              <Select value={formData.budgetLineId} onValueChange={(value) => setFormData({ ...formData, budgetLineId: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Sélectionner une ligne" />
                </SelectTrigger>
                <SelectContent>
                  {budgetLines.map((bl) => (
                    <SelectItem key={bl.id} value={bl.id}>
                      {bl.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Date de début*</label>
              <DatePicker
                value={formData.startDate}
                onChange={(date) => setFormData({ ...formData, startDate: date })}
                placeholder="JJ/MM/AAAA"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Date de fin*</label>
              <DatePicker
                value={formData.endDate}
                onChange={(date) => setFormData({ ...formData, endDate: date })}
                placeholder="JJ/MM/AAAA"
                required
              />
            </div>
          </div>

          {/* Row 5 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Montant total*</label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Code comptable</label>
              <Input
                value={formData.accountingCode}
                onChange={(e) => setFormData({ ...formData, accountingCode: e.target.value })}
                placeholder="6120-01"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Détails du contrat..."
              className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white placeholder-slate-500"
              rows={3}
            />
          </div>

          {/* Constraints */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Contraintes / Renouvellement</label>
            <textarea
              value={formData.constraints}
              onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
              placeholder="Contraintes importantes..."
              className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white placeholder-slate-500"
              rows={2}
            />
          </div>

          {/* Yearly Amounts */}
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
                    className="w-20 bg-slate-800 border-slate-700 text-white"
                  />
                  <Input
                    type="number"
                    value={ya.amount}
                    onChange={(e) => {
                      const newAmounts = [...yearlyAmounts]
                      newAmounts[idx].amount = e.target.value
                      setYearlyAmounts(newAmounts)
                    }}
                    placeholder="Montant"
                    className="flex-1 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addYearlyAmount} className="mt-2 bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">
              Ajouter une année
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-700 px-6 py-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">
            Annuler
          </Button>
          <Button onClick={handleSubmit} className="bg-cyan-600 hover:bg-cyan-700 text-white">
            Créer le contrat
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
