'use client'

import { useState, useEffect } from 'react'
import { X, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { DatePicker } from '@/components/ui/date-picker'
import { format } from 'date-fns'

interface PurchaseOrderFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
}

export function PurchaseOrderFormDrawer({
  open,
  onOpenChange,
  onSubmit
}: PurchaseOrderFormDrawerProps) {
  const [formData, setFormData] = useState({
    number: '',
    vendor: '',
    orderDate: new Date(),
    expectedDeliveryDate: undefined as Date | undefined,
    amount: '',
    description: '',
    status: 'DRAFT' as const,
    linkedForecastExpenseId: undefined as string | undefined,
  })
  const [forecastExpenses, setForecastExpenses] = useState<any[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(false)

  // Charger les dépenses prévisionnelles disponibles
  useEffect(() => {
    if (open) {
      fetchForecastExpenses()
    }
  }, [open])

  const fetchForecastExpenses = async () => {
    try {
      setLoadingExpenses(true)
      const currentYear = new Date().getFullYear()
      const response = await fetch(`/api/forecast-expenses?year=${currentYear}`)
      if (response.ok) {
        const data = await response.json()
        setForecastExpenses(data)
      }
    } catch (error) {
      console.error('Error fetching forecast expenses:', error)
    } finally {
      setLoadingExpenses(false)
    }
  }

  const handleSubmit = () => {
    if (!formData.number || !formData.vendor || !formData.amount) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    onSubmit({
      ...formData,
      amount: Number(formData.amount),
      orderDate: format(formData.orderDate, 'yyyy-MM-dd'),
      expectedDeliveryDate: formData.expectedDeliveryDate ? format(formData.expectedDeliveryDate, 'yyyy-MM-dd') : undefined,
      linkedForecastExpenseId: formData.linkedForecastExpenseId || undefined,
    })

    // Reset form
    setFormData({
      number: '',
      vendor: '',
      orderDate: new Date(),
      expectedDeliveryDate: undefined,
      amount: '',
      description: '',
      status: 'DRAFT',
      linkedForecastExpenseId: undefined,
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle className="text-white">Nouveau Bon de Commande</DrawerTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        <div className="space-y-6 overflow-y-auto px-6 pb-8 max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                N° de BC <span className="text-red-400">*</span>
              </label>
              <Input
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                placeholder="BC-2024-001"
                className="bg-slate-800 border-slate-700 text-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Fournisseur <span className="text-red-400">*</span>
              </label>
              <Input
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                placeholder="Nom du fournisseur"
                className="bg-slate-800 border-slate-700 text-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Date de commande <span className="text-red-400">*</span>
              </label>
              <DatePicker
                value={format(formData.orderDate, 'yyyy-MM-dd')}
                onChange={(date) => setFormData({ ...formData, orderDate: date ? new Date(date) : new Date() })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Date de livraison prévue
              </label>
              <DatePicker
                value={formData.expectedDeliveryDate ? format(formData.expectedDeliveryDate, 'yyyy-MM-dd') : ''}
                onChange={(date) => setFormData({ ...formData, expectedDeliveryDate: date ? new Date(date) : undefined })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Montant (€) <span className="text-red-400">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="bg-slate-800 border-slate-700 text-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Statut</label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
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
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-50"
              placeholder="Description du bon de commande..."
            />
          </div>

          {/* Liaison avec Dépense Prévisionnelle */}
          <div className="border-t border-slate-700 pt-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <LinkIcon size={16} className="text-cyan-400" />
              Liaison avec Dépense Prévisionnelle (optionnel)
            </h3>
            <Select
              value={formData.linkedForecastExpenseId || 'none'}
              onValueChange={(value) => setFormData({
                ...formData,
                linkedForecastExpenseId: value === 'none' ? undefined : value
              })}
              disabled={loadingExpenses}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-50">
                <SelectValue placeholder={loadingExpenses ? "Chargement..." : "Sélectionner une dépense prévisionnelle (optionnel)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune liaison</SelectItem>
                {forecastExpenses.map((exp) => (
                  <SelectItem key={exp.id} value={exp.id}>
                    {exp.label} - {exp.amount.toLocaleString('fr-FR')} €
                    {exp.forecastBudgetLine && ` (${exp.forecastBudgetLine.nature})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-2">
              Vous pourrez également lier ce BC à une dépense après sa création
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700"
            >
              Créer le Bon de Commande
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 hover:bg-slate-800"
            >
              Annuler
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
