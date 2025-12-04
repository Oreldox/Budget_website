'use client'

import { useState, useEffect } from 'react'
import { X, Trash2, Link as LinkIcon, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface PurchaseOrderEditDrawerProps {
  purchaseOrder: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, updates: any) => void
  onDelete: (id: string) => void
}

export function PurchaseOrderEditDrawer({
  purchaseOrder,
  open,
  onOpenChange,
  onUpdate,
  onDelete
}: PurchaseOrderEditDrawerProps) {
  const [formData, setFormData] = useState<any | null>(null)
  const [forecastExpenses, setForecastExpenses] = useState<any[]>([])
  const [selectedForecastId, setSelectedForecastId] = useState<string | null>(null)
  const [linkedForecastExpenseId, setLinkedForecastExpenseId] = useState<string | null>(null)
  const [loadingForecast, setLoadingForecast] = useState(false)

  useEffect(() => {
    if (purchaseOrder) {
      setFormData(purchaseOrder)
      const linkedId = purchaseOrder.linkedForecastExpenseId || null
      setLinkedForecastExpenseId(linkedId)
      setSelectedForecastId(linkedId)
    }
  }, [purchaseOrder])

  // Charger les dépenses prévisionnelles disponibles
  useEffect(() => {
    if (open) {
      fetchForecastExpenses()
    }
  }, [open])

  const fetchForecastExpenses = async () => {
    try {
      setLoadingForecast(true)
      const currentYear = new Date().getFullYear()
      const url = `/api/forecast-expenses?year=${currentYear}&onlyAvailable=true${purchaseOrder?.id ? `&excludePurchaseOrderId=${purchaseOrder.id}` : ''}`
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
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (!purchaseOrder || !selectedForecastId) {
      return
    }

    try {
      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedForecastExpenseId: selectedForecastId }),
      })

      if (response.ok) {
        setLinkedForecastExpenseId(selectedForecastId)
        toast.success('Bon de commande lié à la dépense prévisionnelle')
        onOpenChange(false)
        window.location.reload()
      } else {
        toast.error('Erreur lors de la liaison')
      }
    } catch (error) {
      console.error('Error linking forecast:', error)
      toast.error('Erreur lors de la liaison')
    }
  }

  const handleUnlinkForecast = async () => {
    if (!purchaseOrder) return

    try {
      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedForecastExpenseId: null }),
      })

      if (response.ok) {
        setLinkedForecastExpenseId(null)
        setSelectedForecastId(null)
        toast.success('Bon de commande délié de la dépense prévisionnelle')
        onOpenChange(false)
        window.location.reload()
      } else {
        toast.error('Erreur lors de la déliaison')
      }
    } catch (error) {
      toast.error('Erreur lors de la déliaison')
    }
  }

  if (!purchaseOrder || !formData) return null

  const handleSave = () => {
    if (!formData.number || !formData.vendor || !formData.amount) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    onUpdate(purchaseOrder.id, {
      ...formData,
      amount: Number(formData.amount),
    })

    onOpenChange(false)
  }

  const handleDelete = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce bon de commande ?')) {
      onDelete(purchaseOrder.id)
      onOpenChange(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle className="text-white">Modifier le bon de commande</DrawerTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        <div className="space-y-6 overflow-y-auto px-6 pb-8 max-h-[70vh]">
          {/* Informations de base */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">N° de BC</label>
              <Input
                value={formData.number || ''}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fournisseur</label>
              <Input
                value={formData.vendor || ''}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Date de commande</label>
              <DatePicker
                value={formData.orderDate ? format(new Date(formData.orderDate), 'yyyy-MM-dd') : ''}
                onChange={(date) => setFormData({ ...formData, orderDate: date })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Date de livraison prévue
              </label>
              <DatePicker
                value={formData.expectedDeliveryDate ? format(new Date(formData.expectedDeliveryDate), 'yyyy-MM-dd') : ''}
                onChange={(date) => setFormData({ ...formData, expectedDeliveryDate: date })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Montant (€)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Statut</label>
              <Select
                value={formData.status || 'DRAFT'}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Brouillon</SelectItem>
                  <SelectItem value="SENT">Envoyé</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmé</SelectItem>
                  <SelectItem value="DELIVERED">Livré</SelectItem>
                  <SelectItem value="INVOICED">Facturé</SelectItem>
                  <SelectItem value="CANCELLED">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-50"
              placeholder="Description du bon de commande..."
            />
          </div>

          {/* Liaison avec Dépense Prévisionnelle */}
          <div className="border-t border-slate-700 pt-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <LinkIcon size={16} className="text-cyan-400" />
              Liaison avec Dépense Prévisionnelle
            </h3>

            {linkedForecastExpenseId && purchaseOrder.linkedForecastExpense ? (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-purple-400">
                      {purchaseOrder.linkedForecastExpense.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {purchaseOrder.linkedForecastExpense.forecastBudgetLine?.label}
                      ({purchaseOrder.linkedForecastExpense.forecastBudgetLine?.nature})
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Montant prévisionnel: {purchaseOrder.linkedForecastExpense.amount.toLocaleString('fr-FR')} €
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnlinkForecast}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Unlink size={14} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Select
                  value={selectedForecastId || ''}
                  onValueChange={setSelectedForecastId}
                  disabled={loadingForecast}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-50">
                    <SelectValue placeholder={loadingForecast ? "Chargement..." : "Sélectionner une dépense prévisionnelle"} />
                  </SelectTrigger>
                  <SelectContent>
                    {forecastExpenses.map((exp) => (
                      <SelectItem key={exp.id} value={exp.id}>
                        {exp.label} - {exp.amount.toLocaleString('fr-FR')} €
                        {exp.forecastBudgetLine && ` (${exp.forecastBudgetLine.nature})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleLinkForecast}
                  disabled={!selectedForecastId}
                  className="w-full bg-cyan-600 hover:bg-cyan-700"
                >
                  <LinkIcon size={14} className="mr-2" />
                  Lier à la dépense sélectionnée
                </Button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <Button
              onClick={handleSave}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700"
            >
              Enregistrer
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 hover:bg-slate-800"
            >
              Annuler
            </Button>
            <Button
              variant="ghost"
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
