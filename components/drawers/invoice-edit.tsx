'use client'
// VERSION: 2024-12-04-FIX-LIAISON-v2

import { useState, useEffect } from 'react'
import { X, Trash2, Link as LinkIcon, Unlink } from 'lucide-react'
import type { Invoice, BudgetDomain, InvoiceNature } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Badge } from '@/components/ui/badge'
import { useBudgetStructure } from '@/lib/hooks'
import { toast } from 'sonner'

interface InvoiceEditDrawerProps {
  invoice: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, updates: Partial<Invoice>) => void
  onDelete: (id: string) => void
}

export function InvoiceEditDrawer({ invoice, open, onOpenChange, onUpdate, onDelete }: InvoiceEditDrawerProps) {
  console.log('📦 InvoiceEditDrawer VERSION: 2024-12-04-FIX-LIAISON-v3 LOADED')

  const { allBudgetLines, domains } = useBudgetStructure()
  const [formData, setFormData] = useState<Partial<Invoice> | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [forecastExpenses, setForecastExpenses] = useState<any[]>([])
  const [selectedForecastId, setSelectedForecastId] = useState<string | null>(null)
  const [linkedForecastExpenseId, setLinkedForecastExpenseId] = useState<string | null>(null)
  const [loadingForecast, setLoadingForecast] = useState(false)

  useEffect(() => {
    if (invoice) {
      setFormData(invoice)
      setTags(invoice.tags || [])
      const linkedId = (invoice as any).linkedForecastExpenseId || null
      setLinkedForecastExpenseId(linkedId)
      setSelectedForecastId(linkedId)
    }
  }, [invoice])

  // Charger les dépenses prévisionnelles disponibles
  useEffect(() => {
    if (open && invoice?.invoiceYear) {
      fetchForecastExpenses(invoice.invoiceYear)
    }
  }, [open, invoice?.invoiceYear])

  const fetchForecastExpenses = async (year: number) => {
    try {
      setLoadingForecast(true)
      // Charger uniquement les dépenses disponibles (non liées à une autre facture)
      // mais permettre celle qui est déjà liée à CETTE facture (pour pouvoir la changer)
      const url = `/api/forecast-expenses?year=${year}&onlyAvailable=true${invoice?.id ? `&excludeInvoiceId=${invoice.id}` : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setForecastExpenses(data)
      }
    } catch (error) {
      console.error('Error fetching forecast expenses:', error)
    } finally {
      setLoadingForecast(false)
    }
  }

  const handleLinkForecast = async (e?: React.MouseEvent) => {
    // IMPORTANT: Empêcher toute propagation d'événement
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (!invoice || !selectedForecastId) {
      console.error('❌ Missing data - invoice:', invoice?.id, 'forecast:', selectedForecastId)
      return
    }

    console.log('🔗🔗🔗 LINK FORECAST FUNCTION CALLED 🔗🔗🔗')
    console.log('🔗 Invoice ID:', invoice.id)
    console.log('🔗 Forecast ID:', selectedForecastId)
    const url = `/api/invoices/${invoice.id}/link-forecast`
    console.log('🔗 Full URL:', url)

    try {
      console.log('🔗 Sending fetch request...')
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forecastExpenseId: selectedForecastId }),
      })

      console.log('🔗 Response received - status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('🔗 Success! Data:', data)
        // Mettre à jour l'état local pour afficher immédiatement la liaison
        setLinkedForecastExpenseId(selectedForecastId)
        toast.success('Facture liée à la dépense prévisionnelle')
        onOpenChange(false)
        window.location.reload()
      } else {
        const error = await response.json()
        console.error('🔗 Server error:', error)
        toast.error('Erreur lors de la liaison')
      }
    } catch (error) {
      console.error('🔗 Exception caught:', error)
      toast.error('Erreur lors de la liaison')
    }
  }

  const handleUnlinkForecast = async () => {
    if (!invoice) return

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/link-forecast`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forecastExpenseId: null }),
      })

      if (response.ok) {
        // Réinitialiser l'état local
        setLinkedForecastExpenseId(null)
        setSelectedForecastId(null)
        toast.success('Facture déliée de la dépense prévisionnelle')
        onOpenChange(false)
        window.location.reload()
      } else {
        toast.error('Erreur lors de la déliaison')
      }
    } catch (error) {
      toast.error('Erreur lors de la déliaison')
    }
  }

  if (!invoice || !formData) return null

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSave = () => {
    if (!formData.number || !formData.vendor || !formData.amount) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    onUpdate(invoice.id, {
      ...formData,
      tags,
      amount: Number(formData.amount),
      amountHT: formData.amountHT ? Number(formData.amountHT) : undefined,
    })

    onOpenChange(false)
  }

  const handleDelete = () => {
    onDelete(invoice.id)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle className="text-white">Modifier la facture</DrawerTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        <div className="space-y-6 overflow-y-auto px-6 pb-8 max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">N° de facture</label>
              <Input
                value={formData.number || ''}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fournisseur</label>
              <Input
                value={formData.vendor || ''}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Domaine</label>
              <Select value={formData.domainId || ''} onValueChange={(value) => setFormData({ ...formData, domainId: value })}>
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
              <label className="block text-sm font-medium text-slate-300 mb-2">Nature</label>
              <Select value={formData.nature || ''} onValueChange={(value) => setFormData({ ...formData, nature: value as InvoiceNature })}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Investissement">Investissement</SelectItem>
                  <SelectItem value="Fonctionnement">Fonctionnement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Checkbox Avoir */}
          <div className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <input
              type="checkbox"
              id="isCredit"
              checked={formData.isCredit || false}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Montant TTC {formData.isCredit && <span className="text-red-400">(à soustraire)</span>}
              </label>
              <div className="relative">
                {formData.isCredit && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 font-medium">-</span>
                )}
                <Input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className={`bg-slate-800 border-slate-700 ${formData.isCredit ? 'pl-7 text-red-400' : ''}`}
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
                  value={formData.amountHT || ''}
                  onChange={(e) => setFormData({ ...formData, amountHT: Number(e.target.value) })}
                  className={`bg-slate-800 border-slate-700 ${formData.isCredit ? 'pl-7 text-red-400' : ''}`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Date de facture</label>
              <DatePicker
                value={formData.invoiceDate ? formData.invoiceDate.split('T')[0] : ''}
                onChange={(date) => setFormData({ ...formData, invoiceDate: date })}
                placeholder="JJ/MM/AAAA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Date d'échéance</label>
              <DatePicker
                value={formData.dueDate ? formData.dueDate.split('T')[0] : ''}
                onChange={(date) => setFormData({ ...formData, dueDate: date })}
                placeholder="JJ/MM/AAAA"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Statut</label>
              <Select value={formData.status || ''} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Payée">Payée</SelectItem>
                  <SelectItem value="En attente">En attente</SelectItem>
                  <SelectItem value="Retard">Retard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Ligne budgétaire</label>
              <Select value={formData.budgetLineId || ''} onValueChange={(value) => setFormData({ ...formData, budgetLineId: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
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
          </div>

          <div className="border-t border-slate-700 pt-4">
            <h4 className="font-medium text-slate-300 mb-3">Informations comptables</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Code comptable</label>
                <Input
                  placeholder="Code comptable"
                  value={formData.accountingCode || ''}
                  onChange={(e) => setFormData({ ...formData, accountingCode: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Code d'allocation</label>
                <Input
                  placeholder="Code d'allocation"
                  value={formData.allocationCode || ''}
                  onChange={(e) => setFormData({ ...formData, allocationCode: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">N° commande</label>
                <Input
                  placeholder="N° commande"
                  value={formData.commandNumber || ''}
                  onChange={(e) => setFormData({ ...formData, commandNumber: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Code fournisseur</label>
                <Input
                  placeholder="Code fournisseur"
                  value={formData.supplierCode || ''}
                  onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">N° ligne</label>
                <Input
                  placeholder="N° ligne"
                  value={formData.lineNumber || ''}
                  onChange={(e) => setFormData({ ...formData, lineNumber: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Section PIVOT : Lier à une dépense prévisionnelle */}
          <div className="border-t border-slate-700 pt-4">
            <h4 className="font-medium text-white mb-3 flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-cyan-400" />
              Lien avec Budget Prévisionnel
            </h4>

            {linkedForecastExpenseId ? (
              <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-white mb-1">Cette facture est liée à :</p>
                    <p className="font-medium text-cyan-400">
                      {forecastExpenses.find(f => f.id === linkedForecastExpenseId)?.label || 'Dépense prévisionnelle'}
                    </p>
                    {forecastExpenses.find(f => f.id === linkedForecastExpenseId) && (
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="text-slate-400">
                          Prévu: <span className="text-cyan-400 font-medium">
                            {forecastExpenses.find(f => f.id === linkedForecastExpenseId)?.amount?.toLocaleString('fr-FR')}€
                          </span>
                        </span>
                        <span className="text-slate-400">
                          Réel: <span className="text-cyan-400 font-medium">{formData.amount?.toLocaleString('fr-FR')}€</span>
                        </span>
                        {formData.amount && forecastExpenses.find(f => f.id === linkedForecastExpenseId) && (
                          <span className={`font-medium ${
                            (formData.amount - forecastExpenses.find(f => f.id === linkedForecastExpenseId)!.amount) < 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}>
                            {(formData.amount - forecastExpenses.find(f => f.id === linkedForecastExpenseId)!.amount) < 0 ? '↓' : '↑'}
                            {Math.abs(formData.amount - forecastExpenses.find(f => f.id === linkedForecastExpenseId)!.amount).toLocaleString('fr-FR')}€
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleUnlinkForecast}
                    className="text-red-400 hover:bg-red-900/20"
                  >
                    <Unlink className="h-4 w-4 mr-1" />
                    Délier
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-white">
                  Liez cette facture à une dépense prévisionnelle pour suivre les écarts prévu/réalisé
                </p>
                <div className="flex gap-2">
                  <Select
                    value={selectedForecastId || ''}
                    onValueChange={setSelectedForecastId}
                    disabled={loadingForecast}
                  >
                    <SelectTrigger className="flex-1 bg-slate-800 border-slate-700 !text-white [&_[data-placeholder]]:!text-white">
                      <SelectValue placeholder={loadingForecast ? "Chargement..." : "Sélectionner une dépense prévisionnelle"} />
                    </SelectTrigger>
                    <SelectContent>
                      {forecastExpenses.map((expense) => (
                        <SelectItem key={expense.id} value={expense.id}>
                          <div className="flex flex-col">
                            <span>{expense.label}</span>
                            <span className="text-xs text-slate-400">
                              {expense.forecastBudgetLine?.label} - {expense.amount?.toLocaleString('fr-FR')}€
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={(e) => {
                      console.log('✅ BUTTON CLICKED - Lier button')
                      handleLinkForecast(e)
                    }}
                    disabled={!selectedForecastId || loadingForecast}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    <LinkIcon className="h-4 w-4 mr-1" />
                    Lier
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Tags</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                  {tag}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter un tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="bg-slate-800 border-slate-700"
              />
              <Button variant="outline" size="sm" onClick={handleAddTag}>
                Ajouter
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Commentaire interne</label>
            <textarea
              value={formData.comment || ''}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-slate-50 placeholder-slate-500"
              rows={3}
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
