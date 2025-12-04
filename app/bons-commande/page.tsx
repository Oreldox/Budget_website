'use client'

import { useState } from 'react'
import { Plus, Search, Filter, X, Package, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PurchaseOrderEditDrawer } from '@/components/drawers/purchase-order-edit'
import { PurchaseOrderFormDrawer } from '@/components/drawers/purchase-order-form'
import { usePurchaseOrders } from '@/lib/hooks'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default function BonsCommandePage() {
  const { purchaseOrders, total, filters, setFilters, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } = usePurchaseOrders()
  const [selectedPO, setSelectedPO] = useState<any>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = (value: string) => {
    setSearch(value)
    setFilters({ ...filters, page: 1, search: value })
  }

  const clearFilters = () => {
    setSearch('')
    setFilters({ page: 1, pageSize: filters.pageSize })
  }

  const hasActiveFilters = search || filters.status || filters.vendor

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; class: string }> = {
      DRAFT: { label: 'Brouillon', class: 'bg-slate-500/10 text-slate-400' },
      SENT: { label: 'Envoyé', class: 'bg-blue-500/10 text-blue-400' },
      CONFIRMED: { label: 'Confirmé', class: 'bg-cyan-500/10 text-cyan-400' },
      DELIVERED: { label: 'Livré', class: 'bg-purple-500/10 text-purple-400' },
      INVOICED: { label: 'Facturé', class: 'bg-green-500/10 text-green-400' },
      CANCELLED: { label: 'Annulé', class: 'bg-red-500/10 text-red-400' },
    }

    const config = statusConfig[status] || statusConfig.DRAFT
    return (
      <span className={cn('px-2 py-1 rounded-md text-xs font-medium', config.class)}>
        {config.label}
      </span>
    )
  }

  return (
    <MainLayout title="Bons de Commande" description="Gestion des bons de commande et engagements">
      <div className="space-y-4">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <Input
              placeholder="Rechercher par numéro, fournisseur, description..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-slate-800/50 border-slate-700 text-slate-50"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'border-slate-700',
                hasActiveFilters && 'bg-cyan-500/10 border-cyan-500/50'
              )}
            >
              <Filter size={16} />
              Filtres
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 bg-cyan-500 text-white text-xs rounded-full">
                  !
                </span>
              )}
            </Button>
            <Button onClick={() => setFormOpen(true)} className="bg-cyan-600 hover:bg-cyan-700">
              <Plus size={16} />
              Nouveau BC
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Statut</label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) =>
                    setFilters({ ...filters, page: 1, status: value === 'all' ? undefined : value })
                  }
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-50">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="DRAFT">Brouillon</SelectItem>
                    <SelectItem value="SENT">Envoyé</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmé</SelectItem>
                    <SelectItem value="DELIVERED">Livré</SelectItem>
                    <SelectItem value="INVOICED">Facturé</SelectItem>
                    <SelectItem value="CANCELLED">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Fournisseur</label>
                <Input
                  placeholder="Filtrer par fournisseur"
                  value={filters.vendor || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, page: 1, vendor: e.target.value || undefined })
                  }
                  className="bg-slate-800 border-slate-700 text-slate-50"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={14} />
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total BCs</p>
                <p className="text-2xl font-bold text-slate-50">{total}</p>
              </div>
              <Package className="text-cyan-400" size={32} />
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Montant Total</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {purchaseOrders.reduce((sum, po) => sum + po.amount, 0).toLocaleString('fr-FR')}€
                </p>
              </div>
              <FileText className="text-cyan-400" size={32} />
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">En cours</p>
                <p className="text-2xl font-bold text-blue-400">
                  {purchaseOrders.filter(po => ['SENT', 'CONFIRMED', 'DELIVERED'].includes(po.status)).length}
                </p>
              </div>
              <Package className="text-blue-400" size={32} />
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Facturés</p>
                <p className="text-2xl font-bold text-green-400">
                  {purchaseOrders.filter(po => po.status === 'INVOICED').length}
                </p>
              </div>
              <FileText className="text-green-400" size={32} />
            </div>
          </div>
        </div>

        {/* Purchase Orders Table */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/80 border-b border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">N° BC</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Fournisseur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Montant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Lié à</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <Package className="mx-auto mb-3 text-slate-600" size={48} />
                      <p className="text-slate-400 mb-2">Aucun bon de commande</p>
                      <p className="text-sm text-slate-600">
                        Créez votre premier bon de commande pour suivre vos engagements
                      </p>
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr
                      key={po.id}
                      className="hover:bg-slate-700/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedPO(po)
                        setEditOpen(true)
                      }}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-cyan-400">{po.number}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {format(new Date(po.orderDate), 'dd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{po.vendor}</td>
                      <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate">
                        {po.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-200">
                        {po.amount.toLocaleString('fr-FR')} €
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(po.status)}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {po.linkedForecastExpense ? (
                          <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded">
                            {po.linkedForecastExpense.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">Non lié</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Supprimer ce bon de commande ?')) {
                              deletePurchaseOrder(po.id)
                            }
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          Supprimer
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > filters.pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 bg-slate-800/50">
              <p className="text-sm text-slate-400">
                Page {filters.page} sur {Math.ceil(total / filters.pageSize)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
                  disabled={filters.page === 1}
                  className="border-slate-700"
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
                  disabled={filters.page! >= Math.ceil(total / filters.pageSize)}
                  className="border-slate-700"
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drawers */}
      <PurchaseOrderFormDrawer
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={addPurchaseOrder}
      />
      <PurchaseOrderEditDrawer
        purchaseOrder={selectedPO}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdate={updatePurchaseOrder}
        onDelete={deletePurchaseOrder}
      />
    </MainLayout>
  )
}
