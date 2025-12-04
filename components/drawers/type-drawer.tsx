'use client'

import { useState, useEffect, useMemo } from 'react'
import { Tag, Folder, FileText, Receipt, Palette, Calendar, TrendingUp, Edit2, Save, X, Trash2 } from 'lucide-react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useContracts, useInvoices, useBudgetStructure } from '@/lib/hooks'

interface TypeDrawerProps {
  typeId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, data: { name: string; color: string }) => void
  onDelete: (id: string) => void
}

export function TypeDrawer({ typeId, open, onOpenChange, onUpdate, onDelete }: TypeDrawerProps) {
  const { types, domains } = useBudgetStructure()
  const { contracts } = useContracts()
  const { invoices } = useInvoices()

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const type = types.find(t => t.id === typeId)

  // Reset editing state when drawer opens/closes
  useEffect(() => {
    if (open && type) {
      setEditName(type.name)
      setEditColor(type.color || '#06b6d4')
      setIsEditing(false)
    }
  }, [open, type])

  // Computed stats
  const stats = useMemo(() => {
    if (!typeId) return null

    const typeContracts = contracts.filter(c => c.typeId === typeId)
    const typeInvoices = invoices.filter(i => i.typeId === typeId)
    const typeDomains = domains.filter(d => d.typeId === typeId)

    const totalContractAmount = typeContracts.reduce((sum, c) => sum + (c.amount || 0), 0)
    const totalInvoiceAmount = typeInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)
    const activeContracts = typeContracts.filter(c => c.status === 'Actif').length
    const paidInvoices = typeInvoices.filter(i => i.status === 'Payée').length

    // Calculate yearly spending
    const currentYear = new Date().getFullYear()
    const yearlySpending: Record<number, number> = {}

    typeInvoices.forEach(invoice => {
      const year = new Date(invoice.invoiceDate).getFullYear()
      yearlySpending[year] = (yearlySpending[year] || 0) + invoice.amount
    })

    return {
      contracts: typeContracts,
      invoices: typeInvoices,
      domains: typeDomains,
      totalContractAmount,
      totalInvoiceAmount,
      activeContracts,
      paidInvoices,
      yearlySpending,
      currentYear,
    }
  }, [typeId, contracts, invoices, domains])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('fr-FR')
  }

  const handleSave = () => {
    if (!typeId || !editName.trim()) return
    onUpdate(typeId, { name: editName, color: editColor })
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (!typeId || !stats) return
    if (stats.contracts.length > 0 || stats.invoices.length > 0) {
      return // Can't delete if in use
    }
    onDelete(typeId)
    onOpenChange(false)
  }

  if (!type || !stats) return null

  const usageCount = stats.contracts.length + stats.invoices.length
  const maxYearlySpending = Math.max(...Object.values(stats.yearlySpending), 1)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl">
        <DrawerHeader className="border-b border-slate-700 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${type.color || '#06b6d4'}20` }}
              >
                <Tag className="h-6 w-6" style={{ color: type.color || '#06b6d4' }} />
              </div>
              <div>
                <DrawerTitle className="text-xl font-bold text-slate-50">
                  {type.name}
                </DrawerTitle>
                <span
                  className="text-xs px-2 py-0.5 rounded font-mono"
                  style={{
                    backgroundColor: `${type.color || '#06b6d4'}20`,
                    color: type.color || '#06b6d4'
                  }}
                >
                  {stats.domains.length} domaine(s)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
              ) : (
                <Button size="sm" onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700">
                  <Save className="h-4 w-4 mr-1" />
                  Sauver
                </Button>
              )}
            </div>
          </div>
        </DrawerHeader>

        <Tabs defaultValue="info" className="p-4">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="info" className="data-[state=active]:bg-cyan-600">
              Informations
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-cyan-600">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-cyan-600">
              Historique
            </TabsTrigger>
          </TabsList>

          {/* Informations Tab */}
          <TabsContent value="info" className="mt-4 space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Nom</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Couleur</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-10 w-20 rounded border border-slate-700 bg-slate-800 cursor-pointer"
                    />
                    <Input
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="bg-slate-800 border-slate-700 font-mono"
                      placeholder="#06b6d4"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={usageCount > 0}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {usageCount > 0
                      ? `Impossible de supprimer (${usageCount} utilisation(s))`
                      : 'Supprimer ce type'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Info Grid - Like VendorDrawer */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <Tag className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400">Nom</p>
                      <p className="text-slate-50 font-medium">{type.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <Palette className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400">Couleur</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: type.color || '#06b6d4' }}
                        />
                        <span className="text-slate-50 font-mono text-sm">{type.color || '#06b6d4'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <Folder className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400">Domaines</p>
                      <p className="text-slate-50 font-medium">{stats.domains.length}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400">Créé le</p>
                      <p className="text-slate-50 font-medium">
                        {type.createdAt ? formatDate(type.createdAt) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Domaines associés */}
                {stats.domains.length > 0 && (
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Folder className="h-4 w-4 text-slate-400" />
                      <p className="text-xs text-slate-400">Domaines associés</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {stats.domains.map(domain => (
                        <span
                          key={domain.id}
                          className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300"
                        >
                          {domain.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-4 space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 rounded-lg border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-cyan-400" />
                  <p className="text-xs text-slate-400">Total Contrats</p>
                </div>
                <p className="text-2xl font-bold text-cyan-400">{formatCurrency(stats.totalContractAmount)}</p>
                <p className="text-xs text-slate-500 mt-1">{stats.contracts.length} contrat(s) • {stats.activeContracts} actif(s)</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-lg border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-4 w-4 text-emerald-400" />
                  <p className="text-xs text-slate-400">Total Factures</p>
                </div>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.totalInvoiceAmount)}</p>
                <p className="text-xs text-slate-500 mt-1">{stats.invoices.length} facture(s) • {stats.paidInvoices} payée(s)</p>
              </div>
            </div>

            {/* Yearly Spending with Progress Bars */}
            {Object.keys(stats.yearlySpending).length > 0 && (
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-slate-400" />
                  <p className="text-sm font-medium text-slate-300">Dépenses par année</p>
                </div>
                <div className="space-y-3">
                  {Object.entries(stats.yearlySpending)
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .slice(0, 5)
                    .map(([year, amount]) => (
                      <div key={year}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">{year}</span>
                          <span className="text-slate-50 font-medium">{formatCurrency(amount)}</span>
                        </div>
                        <Progress
                          value={(amount / maxYearlySpending) * 100}
                          className="h-2"
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4 space-y-4">
            {/* Recent contracts */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Contrats récents
              </h4>
              {stats.contracts.length === 0 ? (
                <p className="text-sm text-slate-500 p-3 bg-slate-800/30 rounded-lg">Aucun contrat</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stats.contracts.slice(0, 5).map(contract => (
                    <div key={contract.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-cyan-400 font-medium">{contract.number}</span>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{contract.label}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-50 font-medium">{formatCurrency(contract.amount)}</span>
                          <p className="text-xs mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              contract.status === 'Actif'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-500/20 text-slate-400'
                            }`}>
                              {contract.status}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent invoices */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Factures récentes
              </h4>
              {stats.invoices.length === 0 ? (
                <p className="text-sm text-slate-500 p-3 bg-slate-800/30 rounded-lg">Aucune facture</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stats.invoices.slice(0, 5).map(invoice => (
                    <div key={invoice.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-cyan-400 font-medium">{invoice.number}</span>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{invoice.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-50 font-medium">{formatCurrency(invoice.amount)}</span>
                          <p className="text-xs mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              invoice.status === 'Payée'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : invoice.status === 'En attente'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-slate-500/20 text-slate-400'
                            }`}>
                              {invoice.status}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  )
}
