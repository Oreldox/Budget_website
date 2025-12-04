'use client'

import { useState, useEffect } from 'react'
import { X, Info } from 'lucide-react'
import type { Invoice, BudgetDomain, InvoiceNature } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { useBudgetStructure } from '@/lib/hooks'

interface InvoiceFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => void
}

export function InvoiceFormDrawer({ open, onOpenChange, onSubmit }: InvoiceFormDrawerProps) {
  const { allBudgetLines, domains, types } = useBudgetStructure()
  const [contracts, setContracts] = useState<any[]>([])
  const [loadingContracts, setLoadingContracts] = useState(false)
  const [formData, setFormData] = useState({
    number: '',
    lineNumber: '',
    vendor: '',
    supplierCode: '',
    description: '',
    domainId: '',
    typeId: '',
    nature: 'Fonctionnement' as InvoiceNature,
    budgetLineId: '',
    amount: '',
    amountHT: '',
    isCredit: false,
    invoiceDate: '',
    dueDate: '',
    status: 'En attente' as const,
    contractId: '',
    accountingCode: '',
    allocationCode: '',
    commandNumber: '',
    comment: '',
    tags: [] as string[],
  })
  const [tagInput, setTagInput] = useState('')

  // Charger les contrats actifs
  useEffect(() => {
    const fetchContracts = async () => {
      setLoadingContracts(true)
      try {
        const response = await fetch('/api/contracts?all=true&status=Actif')
        if (response.ok) {
          const data = await response.json()
          setContracts(data.data || data || [])
        }
      } catch (error) {
        console.error('Error fetching contracts:', error)
      } finally {
        setLoadingContracts(false)
      }
    }
    if (open) {
      fetchContracts()
    }
  }, [open])

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) })
  }

  const handleSubmit = () => {
    if (!formData.number || !formData.vendor || !formData.description || !formData.domainId || !formData.typeId || !formData.amount || !formData.invoiceDate || !formData.dueDate) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    onSubmit({
      ...formData,
      amount: Number(formData.amount),
      amountHT: formData.amountHT ? Number(formData.amountHT) : undefined,
      invoiceYear: new Date(formData.invoiceDate).getFullYear(),
    })

    // Reset form
    setFormData({
      number: '',
      lineNumber: '',
      vendor: '',
      supplierCode: '',
      description: '',
      domainId: '',
      typeId: '',
      nature: 'Fonctionnement',
      budgetLineId: '',
      amount: '',
      amountHT: '',
      isCredit: false,
      invoiceDate: '',
      dueDate: '',
      status: 'En attente',
      contractId: '',
      accountingCode: '',
      allocationCode: '',
      commandNumber: '',
      comment: '',
      tags: [],
    })
    setTagInput('')
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle className="text-white">Nouvelle facture</DrawerTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        <div className="space-y-6 overflow-y-auto px-6 pb-8 max-h-[70vh]">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">N° de facture*</label>
              <Input
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                placeholder="INV-2024-001"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fournisseur*</label>
              <Input
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                placeholder="Nom du fournisseur"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description*</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de la facture"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Domaine*</label>
              <Select value={formData.domainId} onValueChange={(value) => setFormData({ ...formData, domainId: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white [&>span]:text-white">
                  <SelectValue placeholder="Sélectionner un domaine" className="text-white" />
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
              <label className="block text-sm font-medium text-slate-300 mb-2">Type*</label>
              <Select value={formData.typeId} onValueChange={(value) => setFormData({ ...formData, typeId: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white [&>span]:text-white">
                  <SelectValue placeholder="Sélectionner un type" className="text-white" />
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

          {/* Row 2b */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nature*</label>
              <Select value={formData.nature} onValueChange={(value) => setFormData({ ...formData, nature: value as InvoiceNature })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white [&>span]:text-white">
                  <SelectValue placeholder="Sélectionner une nature" className="text-white" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Investissement">Investissement</SelectItem>
                  <SelectItem value="Fonctionnement">Fonctionnement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div></div>
          </div>

          {/* Checkbox Avoir */}
          <div className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <input
              type="checkbox"
              id="isCredit"
              checked={formData.isCredit}
              onChange={(e) => setFormData({ ...formData, isCredit: e.target.checked })}
              className="w-4 h-4 text-cyan-500 bg-slate-700 border-slate-600 rounded focus:ring-cyan-500 focus:ring-2"
            />
            <label htmlFor="isCredit" className="text-sm font-medium text-slate-300 cursor-pointer flex items-center gap-2">
              <span>Avoir (crédit/remboursement)</span>
              {formData.isCredit && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30">
                  Montant à soustraire
                </span>
              )}
            </label>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Montant TTC* {formData.isCredit && <span className="text-red-400">(à soustraire)</span>}
              </label>
              <div className="relative">
                {formData.isCredit && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 font-medium">-</span>
                )}
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                  className={`bg-slate-800 border-slate-700 text-white ${formData.isCredit ? 'pl-7 text-red-400' : ''}`}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Montant HT {formData.isCredit && <span className="text-red-400">(à soustraire)</span>}
              </label>
              <div className="relative">
                {formData.isCredit && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 font-medium">-</span>
                )}
                <Input
                  type="number"
                  value={formData.amountHT}
                  onChange={(e) => setFormData({ ...formData, amountHT: e.target.value })}
                  placeholder="0"
                  className={`bg-slate-800 border-slate-700 text-white ${formData.isCredit ? 'pl-7 text-red-400' : ''}`}
                />
              </div>
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Date de facture*</label>
              <DatePicker
                value={formData.invoiceDate}
                onChange={(date) => setFormData({ ...formData, invoiceDate: date })}
                placeholder="JJ/MM/AAAA"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Date d'échéance*</label>
              <DatePicker
                value={formData.dueDate}
                onChange={(date) => setFormData({ ...formData, dueDate: date })}
                placeholder="JJ/MM/AAAA"
                required
              />
            </div>
          </div>

          {/* Row 5 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Ligne budgétaire</label>
              <Select value={formData.budgetLineId} onValueChange={(value) => setFormData({ ...formData, budgetLineId: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white [&>span]:text-white">
                  <SelectValue placeholder="Sélectionner une ligne" className="text-white" />
                </SelectTrigger>
                <SelectContent>
                  {allBudgetLines.map((bl) => (
                    <SelectItem key={bl.id} value={bl.id}>
                      {bl.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Statut</label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white [&>span]:text-white">
                  <SelectValue placeholder="Statut" className="text-white" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Payée">Payée</SelectItem>
                  <SelectItem value="En attente">En attente</SelectItem>
                  <SelectItem value="Retard">Retard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 6 - Contrat */}
          <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/50">
            <div className="flex items-start gap-2 mb-3">
              <Info className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-300">
                <p className="font-medium mb-1">Lier cette facture à un contrat (optionnel)</p>
                <p className="text-slate-400 text-xs">
                  Si cette facture correspond à un contrat existant, sélectionnez-le ici.
                  Les factures liées aux contrats sont automatiquement prises en compte dans le calcul de l'engagé.
                  Les factures sans contrat sont considérées comme des achats ponctuels.
                </p>
              </div>
            </div>
            <Select
              value={formData.contractId || "none"}
              onValueChange={(value) => setFormData({ ...formData, contractId: value === "none" ? "" : value })}
            >
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                <SelectValue placeholder={loadingContracts ? "Chargement..." : "Aucun contrat (achat ponctuel)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun contrat (achat ponctuel)</SelectItem>
                {contracts.map((contract) => (
                  <SelectItem key={contract.id} value={contract.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{contract.number} - {contract.label}</span>
                      <span className="text-xs text-slate-400">
                        {contract.vendor} • {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(contract.amount)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Accounting Section */}
          <div className="border-t border-slate-700 pt-4">
            <h4 className="font-medium text-slate-300 mb-3">Informations comptables</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Code comptable</label>
                <Input
                  placeholder="Code comptable"
                  value={formData.accountingCode}
                  onChange={(e) => setFormData({ ...formData, accountingCode: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Code d'allocation</label>
                <Input
                  placeholder="Code d'allocation"
                  value={formData.allocationCode}
                  onChange={(e) => setFormData({ ...formData, allocationCode: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">N° commande</label>
                <Input
                  placeholder="N° commande"
                  value={formData.commandNumber}
                  onChange={(e) => setFormData({ ...formData, commandNumber: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Code fournisseur</label>
                <Input
                  placeholder="Code fournisseur"
                  value={formData.supplierCode}
                  onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">N° ligne</label>
                <Input
                  placeholder="N° ligne"
                  value={formData.lineNumber}
                  onChange={(e) => setFormData({ ...formData, lineNumber: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-700 text-slate-200 text-sm cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                  {tag}
                  <X className="h-3 w-3" />
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter un tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <Button variant="outline" size="sm" onClick={handleAddTag} className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">
                Ajouter
              </Button>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Commentaire interne</label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Notes internes..."
              className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white placeholder-slate-500"
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-700 px-6 py-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">
            Annuler
          </Button>
          <Button onClick={handleSubmit} className="bg-cyan-600 hover:bg-cyan-700 text-white">
            Créer la facture
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
