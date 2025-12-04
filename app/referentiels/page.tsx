'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Edit2, Trash2, Search, Building2, Tag, Folder, AlertTriangle, Download, TrendingUp, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useBudgetStructure, useContracts, useInvoices } from '@/lib/hooks'
import Link from 'next/link'
import { DomainDrawer } from '@/components/drawers/domain-drawer'

interface Vendor {
  id: string
  name: string
  code?: string
  contact?: string
  email?: string
  phone?: string
  address?: string
  siret?: string
  tvaNumber?: string
  paymentTerms?: number
  notes?: string
  isActive: boolean
  stats?: {
    totalContracts: number
    activeContracts: number
    totalContractAmount: number
    totalInvoices: number
    totalInvoiceAmount: number
    paidInvoices: number
  }
}

interface VendorDetail extends Vendor {
  contracts: any[]
  invoices: any[]
  analytics: {
    totalContractAmount: number
    totalInvoiceAmount: number
    activeContracts: number
    expiringContracts: number
    paidInvoices: number
    pendingInvoices: number
    invoicesByYear: Record<number, number>
  }
}

export default function ReferentielsPage() {
  const { types, domains, addType, updateType, deleteType, addDomain, updateDomain, deleteDomain } = useBudgetStructure()
  const { contracts } = useContracts()
  const { invoices } = useInvoices()

  const [activeTab, setActiveTab] = useState('fournisseurs')
  const [search, setSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | null>(null) // null = toutes années
  const [availableYears, setAvailableYears] = useState<number[]>([])

  // Vendors state
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loadingVendors, setLoadingVendors] = useState(true)

  // Fetch available years from API
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const response = await fetch('/api/budget-years')
        if (response.ok) {
          const data = await response.json()
          setAvailableYears((data.years || []).sort((a: number, b: number) => b - a))
        }
      } catch (error) {
        console.error('Error fetching years:', error)
      }
    }
    fetchAvailableYears()
  }, [])

  // States for type/domain editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editColor, setEditColor] = useState('')

  // Domain details drawer
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null)
  const [showDomainDetails, setShowDomainDetails] = useState(false)

  // Type details drawer
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [showTypeDetails, setShowTypeDetails] = useState(false)

  // Vendor details drawer
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null)
  const [showVendorDetails, setShowVendorDetails] = useState(false)

  // States for adding
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#06b6d4')
  const [newTypeId, setNewTypeId] = useState('')
  const [newDescription, setNewDescription] = useState('')

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Filter contracts and invoices by year
  const filteredContracts = useMemo(() => {
    if (selectedYear === null) return contracts
    return contracts.filter(c => new Date(c.startDate).getFullYear() === selectedYear)
  }, [contracts, selectedYear])

  const filteredInvoices = useMemo(() => {
    if (selectedYear === null) return invoices
    return invoices.filter(i => new Date(i.invoiceDate).getFullYear() === selectedYear)
  }, [invoices, selectedYear])

  // Extract vendors from filtered contracts and invoices
  useEffect(() => {
    setLoadingVendors(true)

    // Extraire les noms uniques de fournisseurs depuis les contrats et factures filtrés
    const vendorMap = new Map<string, Vendor>()

    // Parcourir les contrats filtrés
    filteredContracts.forEach(contract => {
      if (contract.vendor) {
        if (!vendorMap.has(contract.vendor)) {
          vendorMap.set(contract.vendor, {
            id: contract.vendor,
            name: contract.vendor,
            isActive: true,
            stats: {
              totalContracts: 0,
              activeContracts: 0,
              totalContractAmount: 0,
              totalInvoices: 0,
              totalInvoiceAmount: 0,
              paidInvoices: 0,
            }
          })
        }

        const vendor = vendorMap.get(contract.vendor)!
        vendor.stats!.totalContracts++

        // Vérifier si le contrat est actif
        const now = new Date()
        const endDate = new Date(contract.endDate)
        if (endDate >= now) {
          vendor.stats!.activeContracts++
        }

        vendor.stats!.totalContractAmount += contract.amount || 0
      }
    })

    // Parcourir les factures filtrées
    filteredInvoices.forEach(invoice => {
      if (invoice.vendor) {
        if (!vendorMap.has(invoice.vendor)) {
          vendorMap.set(invoice.vendor, {
            id: invoice.vendor,
            name: invoice.vendor,
            isActive: true,
            stats: {
              totalContracts: 0,
              activeContracts: 0,
              totalContractAmount: 0,
              totalInvoices: 0,
              totalInvoiceAmount: 0,
              paidInvoices: 0,
            }
          })
        }

        const vendor = vendorMap.get(invoice.vendor)!
        vendor.stats!.totalInvoices++
        vendor.stats!.totalInvoiceAmount += invoice.amount || 0

        if (invoice.status === 'Payée') {
          vendor.stats!.paidInvoices++
        }
      }
    })

    setVendors(Array.from(vendorMap.values()))
    setLoadingVendors(false)
  }, [filteredContracts, filteredInvoices])

  // Calculate total budget for concentration alerts
  const totalBudget = useMemo(() => {
    return vendors.reduce((sum, v) => sum + (v.stats?.totalInvoiceAmount || 0), 0)
  }, [vendors])

  // Vendors with concentration risk (>30% of total spending)
  const concentrationAlerts = useMemo(() => {
    return vendors
      .filter(v => {
        const percentage = totalBudget > 0 ? ((v.stats?.totalInvoiceAmount || 0) / totalBudget) * 100 : 0
        return percentage > 30
      })
      .sort((a, b) => (b.stats?.totalInvoiceAmount || 0) - (a.stats?.totalInvoiceAmount || 0))
  }, [vendors, totalBudget])

  // Filter vendors
  const filteredVendorsList = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.code && v.code.toLowerCase().includes(search.toLowerCase()))
  )

  // Filter types - show all types, not just those with usage
  const filteredTypes = useMemo(() => {
    return types.filter(t =>
      t.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [types, search])

  // Filter domains - show all domains, not just those with usage
  const filteredDomains = useMemo(() => {
    return domains.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [domains, search])

  // Usage counts and analytics (using filtered data)
  const getTypeUsageCount = (typeId: string) => {
    const contractCount = filteredContracts.filter(c => c.typeId === typeId).length
    const invoiceCount = filteredInvoices.filter(i => i.typeId === typeId).length
    return contractCount + invoiceCount
  }

  const getDomainUsageCount = (domainId: string) => {
    const contractCount = filteredContracts.filter(c => c.domainId === domainId).length
    const invoiceCount = filteredInvoices.filter(i => i.domainId === domainId).length
    return contractCount + invoiceCount
  }

  // Type analytics (using filtered data)
  const getTypeStats = (typeId: string) => {
    const typeContracts = filteredContracts.filter(c => c.typeId === typeId)
    const typeInvoices = filteredInvoices.filter(i => i.typeId === typeId)
    const totalContractAmount = typeContracts.reduce((sum, c) => sum + (c.amount || 0), 0)
    const totalInvoiceAmount = typeInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)
    const domainsCount = filteredDomains.filter(d => d.typeId === typeId).length
    return {
      contractCount: typeContracts.length,
      invoiceCount: typeInvoices.length,
      totalContractAmount,
      totalInvoiceAmount,
      domainsCount,
    }
  }

  // Domain analytics (using filtered data)
  const getDomainStats = (domainId: string) => {
    const domainContracts = filteredContracts.filter(c => c.domainId === domainId)
    const domainInvoices = filteredInvoices.filter(i => i.domainId === domainId)
    const totalContractAmount = domainContracts.reduce((sum, c) => sum + (c.amount || 0), 0)
    const totalInvoiceAmount = domainInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)
    return {
      contractCount: domainContracts.length,
      invoiceCount: domainInvoices.length,
      totalContractAmount,
      totalInvoiceAmount,
    }
  }

  // Total amounts for percentage calculations (using filtered data)
  const totalTypesBudget = useMemo(() => {
    return filteredInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)
  }, [filteredInvoices])

  const totalDomainsBudget = totalTypesBudget


  // Export vendors to CSV
  const exportVendorsCSV = () => {
    const headers = ['Nom', 'Code', 'Contact', 'Email', 'Téléphone', 'SIRET', 'N° TVA', 'Délai paiement', 'Contrats', 'Factures', 'Total facturé']
    const rows = vendors.map(v => [
      v.name,
      v.code || '',
      v.contact || '',
      v.email || '',
      v.phone || '',
      v.siret || '',
      v.tvaNumber || '',
      v.paymentTerms || 30,
      v.stats?.totalContracts || 0,
      v.stats?.totalInvoices || 0,
      v.stats?.totalInvoiceAmount || 0,
    ])

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'fournisseurs.csv'
    link.click()
  }

  // Handlers for types
  const handleAddType = () => {
    if (!newName.trim()) {
      toast.error('Le nom est requis')
      return
    }
    addType({ name: newName as any, color: newColor })
    setNewName('')
    setNewColor('#06b6d4')
    setShowAddForm(false)
    toast.success('Type ajouté')
  }


  const handleDeleteType = (id: string) => {
    const usageCount = getTypeUsageCount(id)
    if (usageCount > 0) {
      toast.error(`Impossible de supprimer : utilisé dans ${usageCount} élément(s)`)
      return
    }
    deleteType(id)
    toast.success('Type supprimé')
  }

  // Handlers for domains
  const handleAddDomain = () => {
    if (!newName.trim() || !newTypeId) {
      toast.error('Le nom et le type sont requis')
      return
    }
    addDomain({ name: newName as any, typeId: newTypeId, description: newDescription })
    setNewName('')
    setNewTypeId('')
    setNewDescription('')
    setShowAddForm(false)
    toast.success('Domaine ajouté')
  }


  const handleDeleteDomain = (id: string) => {
    const usageCount = getDomainUsageCount(id)
    if (usageCount > 0) {
      toast.error(`Impossible de supprimer : utilisé dans ${usageCount} élément(s)`)
      return
    }
    deleteDomain(id)
    toast.success('Domaine supprimé')
  }

  const startEdit = (id: string, value: string, color?: string) => {
    setEditingId(id)
    setEditValue(value)
    setEditColor(color || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
    setEditColor('')
  }

  const resetAddForm = () => {
    setShowAddForm(false)
    setNewName('')
    setNewColor('#06b6d4')
    setNewTypeId('')
    setNewDescription('')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header avec sélecteur d'année */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-50">Gestion des Référentiels</h2>
            <p className="text-slate-400 mt-2">Gérer les fournisseurs, types et domaines avec analyse détaillée</p>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-cyan-400" />
            <Select
              value={selectedYear?.toString() || 'all'}
              onValueChange={(value) => setSelectedYear(value === 'all' ? null : parseInt(value))}
            >
              <SelectTrigger className="w-40 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border-cyan-700 text-cyan-400 font-bold hover:from-cyan-900/40 hover:to-blue-900/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-50">Toutes années</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()} className="text-slate-50">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Alertes de concentration */}
        {concentrationAlerts.length > 0 && (
          <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Alertes de concentration</span>
            </div>
            <p className="text-sm text-amber-200 mb-3">
              Les fournisseurs suivants représentent plus de 30% des dépenses totales :
            </p>
            <div className="flex flex-wrap gap-2">
              {concentrationAlerts.map(v => {
                const percentage = totalBudget > 0 ? ((v.stats?.totalInvoiceAmount || 0) / totalBudget) * 100 : 0
                return (
                  <span
                    key={v.id}
                    className="px-3 py-1 bg-amber-800/50 rounded-full text-sm text-amber-100"
                  >
                    {v.name}: {percentage.toFixed(1)}%
                  </span>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="fournisseurs" className="text-white data-[state=active]:bg-cyan-600">
              <Building2 className="h-4 w-4 mr-2" />
              Fournisseurs ({vendors.length})
            </TabsTrigger>
            <TabsTrigger value="types" className="text-white data-[state=active]:bg-cyan-600">
              <Tag className="h-4 w-4 mr-2" />
              Types ({filteredTypes.length})
            </TabsTrigger>
            <TabsTrigger value="domaines" className="text-white data-[state=active]:bg-cyan-600">
              <Folder className="h-4 w-4 mr-2" />
              Domaines ({filteredDomains.length})
            </TabsTrigger>
          </TabsList>

          {/* Fournisseurs */}
          <TabsContent value="fournisseurs" className="space-y-4">
            <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50 mb-4">
              <p className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-cyan-400 font-semibold">ℹ️</span>
                <span>
                  Les fournisseurs sont automatiquement extraits de vos contrats et factures. Pour ajouter un nouveau fournisseur, créez un contrat ou une facture.
                </span>
              </p>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-400">
                Total facturé: <span className="text-cyan-400 font-semibold">{formatCurrency(totalBudget)}</span>
              </div>
              <Button variant="outline" onClick={exportVendorsCSV} className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>
            </div>

            {/* Vendors list */}
            {loadingVendors ? (
              <div className="text-center py-8 text-slate-400">Chargement...</div>
            ) : filteredVendorsList.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                Aucun fournisseur trouvé
              </div>
            ) : (
              <div className="space-y-2">
                {filteredVendorsList.map((vendor) => {
                  const percentage = totalBudget > 0 ? ((vendor.stats?.totalInvoiceAmount || 0) / totalBudget) * 100 : 0

                  return (
                    <div
                      key={vendor.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-900/50 cursor-pointer hover:bg-slate-800/50 transition-colors"
                      onClick={() => {
                        setSelectedVendor(vendor.name)
                        setShowVendorDetails(true)
                      }}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <Building2 className="h-5 w-5 text-slate-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-50">{vendor.name}</p>
                            {vendor.code && (
                              <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                                {vendor.code}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {vendor.stats?.totalContracts || 0} contrat(s) • {vendor.stats?.totalInvoices || 0} facture(s) • {formatCurrency(vendor.stats?.totalInvoiceAmount || 0)}
                          </p>
                        </div>
                        {/* Progress bar showing percentage of total */}
                        <div className="w-32 hidden md:block">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${percentage > 30 ? 'bg-amber-500' : 'bg-cyan-500'}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Types */}
          <TabsContent value="types" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-400">
                Total facturé: <span className="text-cyan-400 font-semibold">{formatCurrency(totalTypesBudget)}</span>
              </div>
              {!showAddForm && (
                <Button onClick={() => setShowAddForm(true)} className="bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau type
                </Button>
              )}
            </div>

            {showAddForm && (
              <div className="p-4 rounded-lg border border-cyan-700 bg-slate-900/50 space-y-3">
                <h4 className="font-medium text-slate-50">Nouveau type</h4>
                <div className="flex gap-3">
                  <Input
                    placeholder="Nom du type"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 bg-slate-800 border-slate-700"
                  />
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="h-10 w-16 rounded border border-slate-700 bg-slate-800 cursor-pointer"
                  />
                  <Button onClick={handleAddType} className="bg-cyan-600 hover:bg-cyan-700">
                    Ajouter
                  </Button>
                  <Button variant="outline" onClick={resetAddForm}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {filteredTypes.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  Aucun type trouvé
                </div>
              ) : (
                filteredTypes.map((type) => {
                  const stats = getTypeStats(type.id)
                  const percentage = totalTypesBudget > 0 ? (stats.totalInvoiceAmount / totalTypesBudget) * 100 : 0
                  const isEditing = editingId === type.id

                  return (
                    <div
                      key={type.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-900/50 hover:border-cyan-600/50 transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="h-10 w-12 rounded border border-slate-700 bg-slate-800 cursor-pointer"
                          />
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 bg-slate-800 border-slate-700 text-white"
                            placeholder="Nom du type"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              updateType(type.id, { name: editValue as any, color: editColor })
                              cancelEdit()
                              toast.success('Type modifié')
                            }}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white"
                          >
                            Enregistrer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                            className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                          >
                            Annuler
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div
                            className="flex items-center gap-4 flex-1 cursor-pointer hover:bg-slate-800/50 -mx-4 px-4 py-2 rounded-lg transition-colors"
                            onClick={() => {
                              setSelectedTypeId(type.id)
                              setShowTypeDetails(true)
                            }}
                          >
                            <div
                              className="w-4 h-4 rounded flex-shrink-0"
                              style={{ backgroundColor: type.color || '#06b6d4' }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-50">{type.name}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {stats.domainsCount} domaine(s) • {stats.contractCount} contrat(s) • {stats.invoiceCount} facture(s) • {formatCurrency(stats.totalInvoiceAmount)}
                              </p>
                            </div>
                            <div className="w-32 hidden md:block">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-400">{percentage.toFixed(1)}%</span>
                              </div>
                              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(percentage, 100)}%`,
                                    backgroundColor: type.color || '#06b6d4'
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(type.id, type.name, type.color)}
                              className="h-8 w-8 p-0 hover:bg-slate-700"
                            >
                              <Edit2 className="h-4 w-4 text-slate-400" />
                            </Button>
                            {stats.domainsCount === 0 && stats.contractCount === 0 && stats.invoiceCount === 0 ? (
                              deleteConfirmId === type.id ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      handleDeleteType(type.id)
                                      setDeleteConfirmId(null)
                                    }}
                                    className="h-8"
                                  >
                                    Confirmer
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="h-8 bg-slate-800 border-slate-700"
                                  >
                                    Annuler
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteConfirmId(type.id)}
                                  className="h-8 w-8 p-0 hover:bg-red-900/20 text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </TabsContent>

          {/* Domaines */}
          <TabsContent value="domaines" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-400">
                Total facturé: <span className="text-cyan-400 font-semibold">{formatCurrency(totalDomainsBudget)}</span>
              </div>
              {!showAddForm && (
                <Button onClick={() => setShowAddForm(true)} className="bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau domaine
                </Button>
              )}
            </div>

            {showAddForm && (
              <div className="p-4 rounded-lg border border-cyan-700 bg-slate-900/50 space-y-3">
                <h4 className="font-medium text-slate-50">Nouveau domaine</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Nom du domaine"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-slate-800 border-slate-700"
                  />
                  <select
                    value={newTypeId}
                    onChange={(e) => setNewTypeId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-md px-3 text-sm"
                  >
                    <option value="">Sélectionner un type</option>
                    {types.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <Input
                  placeholder="Description (optionnel)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="bg-slate-800 border-slate-700"
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddDomain} className="bg-cyan-600 hover:bg-cyan-700">
                    Ajouter
                  </Button>
                  <Button variant="outline" onClick={resetAddForm}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {filteredDomains.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  Aucun domaine trouvé
                </div>
              ) : (
                filteredDomains.map((domain) => {
                  const stats = getDomainStats(domain.id)
                  const percentage = totalDomainsBudget > 0 ? (stats.totalInvoiceAmount / totalDomainsBudget) * 100 : 0
                  const parentType = types.find(t => t.id === domain.typeId)
                  const isEditing = editingId === domain.id

                  return (
                    <div
                      key={domain.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-900/50 hover:border-cyan-600/50 transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-3 flex-1">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 bg-slate-800 border-slate-700 text-white"
                            placeholder="Nom du domaine"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              updateDomain(domain.id, { name: editValue })
                              cancelEdit()
                              toast.success('Domaine modifié')
                            }}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white"
                          >
                            Enregistrer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                            className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                          >
                            Annuler
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div
                            className="flex items-center gap-4 flex-1 cursor-pointer"
                            onClick={() => {
                              setSelectedDomainId(domain.id)
                              setShowDomainDetails(true)
                            }}
                          >
                            <div
                              className="w-4 h-4 rounded flex-shrink-0"
                              style={{ backgroundColor: parentType?.color || '#64748b' }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-50">{domain.name}</p>
                                {parentType && (
                                  <span
                                    className="px-2 py-0.5 rounded text-xs"
                                    style={{
                                      backgroundColor: `${parentType.color}20`,
                                      color: parentType.color
                                    }}
                                  >
                                    {parentType.name}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-1">
                                {stats.contractCount} contrat(s) • {stats.invoiceCount} facture(s) • {formatCurrency(stats.totalInvoiceAmount)}
                                {domain.description && ` • ${domain.description}`}
                              </p>
                            </div>
                            <div className="w-32 hidden md:block">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-400">{percentage.toFixed(1)}%</span>
                              </div>
                              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(percentage, 100)}%`,
                                    backgroundColor: parentType?.color || '#06b6d4'
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                startEdit(domain.id, domain.name)
                              }}
                              className="h-8 w-8 p-0 hover:bg-slate-700"
                            >
                              <Edit2 className="h-4 w-4 text-slate-400" />
                            </Button>
                            {stats.contractCount === 0 && stats.invoiceCount === 0 ? (
                              deleteConfirmId === domain.id ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      handleDeleteDomain(domain.id)
                                      setDeleteConfirmId(null)
                                    }}
                                    className="h-8"
                                  >
                                    Confirmer
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="h-8 bg-slate-800 border-slate-700"
                                  >
                                    Annuler
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteConfirmId(domain.id)
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-red-900/20 text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Domain Details Drawer */}
      <Sheet open={showDomainDetails} onOpenChange={setShowDomainDetails}>
        <SheetContent className="bg-slate-900 border-slate-700 text-slate-50 sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-slate-50 text-xl">
              {selectedDomainId && (() => {
                const domain = domains.find(d => d.id === selectedDomainId)
                const parentType = domain ? types.find(t => t.id === domain.typeId) : null
                return domain ? (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: parentType?.color || '#64748b' }}
                    />
                    <span>{domain.name}</span>
                    {parentType && (
                      <span
                        className="px-2 py-0.5 rounded text-xs font-normal"
                        style={{
                          backgroundColor: `${parentType.color}20`,
                          color: parentType.color
                        }}
                      >
                        {parentType.name}
                      </span>
                    )}
                  </div>
                ) : null
              })()}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {selectedDomainId && (() => {
              const domainContracts = filteredContracts.filter(c => c.domainId === selectedDomainId)
              const domainInvoices = filteredInvoices.filter(i => i.domainId === selectedDomainId)
              const stats = getDomainStats(selectedDomainId)

              return (
                <>
                  {/* Statistiques */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Total Contrats</p>
                      <p className="text-2xl font-bold text-cyan-400 mt-1">{formatCurrency(stats.totalContractAmount)}</p>
                      <p className="text-xs text-slate-500 mt-1">{stats.contractCount} contrat(s)</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Total Facturé</p>
                      <p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(stats.totalInvoiceAmount)}</p>
                      <p className="text-xs text-slate-500 mt-1">{stats.invoiceCount} facture(s)</p>
                    </div>
                  </div>

                  {/* Contrats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-200">Contrats ({domainContracts.length})</h3>
                      {domainContracts.length > 0 && (
                        <Link href={`/contrats?domain=${selectedDomainId}`}>
                          <Button size="sm" variant="outline" className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">
                            Voir tous
                          </Button>
                        </Link>
                      )}
                    </div>
                    {domainContracts.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Aucun contrat</p>
                    ) : (
                      <div className="space-y-2">
                        {domainContracts.map(contract => (
                          <Link
                            key={contract.id}
                            href={`/contrats?id=${contract.id}`}
                            className="block p-3 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 hover:border-cyan-600/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-slate-200">{contract.label}</p>
                                <p className="text-sm text-slate-400 mt-1">
                                  {contract.vendor} • {contract.number}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {new Date(contract.startDate).toLocaleDateString('fr-FR')} - {new Date(contract.endDate).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-cyan-400">{formatCurrency(contract.amount)}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Factures */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-200">Factures ({domainInvoices.length})</h3>
                      {domainInvoices.length > 0 && (
                        <Link href={`/factures?domain=${selectedDomainId}`}>
                          <Button size="sm" variant="outline" className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">
                            Voir toutes
                          </Button>
                        </Link>
                      )}
                    </div>
                    {domainInvoices.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Aucune facture</p>
                    ) : (
                      <div className="space-y-2">
                        {domainInvoices.map(invoice => (
                          <Link
                            key={invoice.id}
                            href={`/factures?id=${invoice.id}`}
                            className="block p-3 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 hover:border-amber-600/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-slate-200">{invoice.description}</p>
                                <p className="text-sm text-slate-400 mt-1">
                                  {invoice.vendor} • {invoice.number}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')}
                                  {invoice.status && (
                                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                      invoice.status === 'Payée' ? 'bg-green-900/30 text-green-400' : 'bg-orange-900/30 text-orange-400'
                                    }`}>
                                      {invoice.status === 'Payée' ? 'Payée' : 'En attente'}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-amber-400">{formatCurrency(invoice.amount)}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Type Details Sheet */}
      <Sheet open={showTypeDetails} onOpenChange={setShowTypeDetails}>
        <SheetContent className="bg-slate-900 border-slate-700 text-slate-50 sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-slate-50 text-xl">
              {selectedTypeId && (() => {
                const type = types.find(t => t.id === selectedTypeId)
                return type ? (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: type.color || '#64748b' }}
                    />
                    <span>{type.name}</span>
                  </div>
                ) : null
              })()}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {selectedTypeId && (() => {
              const typeContracts = filteredContracts.filter(c => c.typeId === selectedTypeId)
              const typeInvoices = filteredInvoices.filter(i => i.typeId === selectedTypeId)
              const totalContractAmount = typeContracts.reduce((sum, c) => sum + (c.amount || 0), 0)
              const totalInvoiceAmount = typeInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)

              return (
                <>
                  {/* Statistiques */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Total Contrats</p>
                      <p className="text-2xl font-bold text-cyan-400 mt-1">{formatCurrency(totalContractAmount)}</p>
                      <p className="text-xs text-slate-500 mt-1">{typeContracts.length} contrat(s)</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Total Facturé</p>
                      <p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(totalInvoiceAmount)}</p>
                      <p className="text-xs text-slate-500 mt-1">{typeInvoices.length} facture(s)</p>
                    </div>
                  </div>

                  {/* Contrats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-200">Contrats ({typeContracts.length})</h3>
                    </div>
                    {typeContracts.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Aucun contrat</p>
                    ) : (
                      <div className="space-y-2">
                        {typeContracts.map(contract => (
                          <Link
                            key={contract.id}
                            href={`/contrats?id=${contract.id}`}
                            className="block p-3 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 hover:border-cyan-600/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-slate-200">{contract.label}</p>
                                <p className="text-sm text-slate-400 mt-1">
                                  {contract.vendor} • {contract.number}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {new Date(contract.startDate).toLocaleDateString('fr-FR')} - {new Date(contract.endDate).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-cyan-400">{formatCurrency(contract.amount)}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Factures */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-200">Factures ({typeInvoices.length})</h3>
                    </div>
                    {typeInvoices.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Aucune facture</p>
                    ) : (
                      <div className="space-y-2">
                        {typeInvoices.map(invoice => (
                          <Link
                            key={invoice.id}
                            href={`/factures?id=${invoice.id}`}
                            className="block p-3 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 hover:border-amber-600/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-slate-200">{invoice.description}</p>
                                <p className="text-sm text-slate-400 mt-1">
                                  {invoice.vendor} • {invoice.number}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')}
                                  {invoice.status && (
                                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                      invoice.status === 'Payée' ? 'bg-green-900/30 text-green-400' : 'bg-orange-900/30 text-orange-400'
                                    }`}>
                                      {invoice.status === 'Payée' ? 'Payée' : 'En attente'}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-amber-400">{formatCurrency(invoice.amount)}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Vendor Details Sheet */}
      <Sheet open={showVendorDetails} onOpenChange={setShowVendorDetails}>
        <SheetContent className="bg-slate-900 border-slate-700 text-slate-50 sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-slate-50 text-xl">
              {selectedVendor && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-cyan-400" />
                  <span>{selectedVendor}</span>
                </div>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {selectedVendor && (() => {
              const vendorContracts = filteredContracts.filter(c => c.vendor === selectedVendor)
              const vendorInvoices = filteredInvoices.filter(i => i.vendor === selectedVendor)
              const totalContractAmount = vendorContracts.reduce((sum, c) => sum + (c.amount || 0), 0)
              const totalInvoiceAmount = vendorInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)

              return (
                <>
                  {/* Statistiques */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Total Contrats</p>
                      <p className="text-2xl font-bold text-cyan-400 mt-1">{formatCurrency(totalContractAmount)}</p>
                      <p className="text-xs text-slate-500 mt-1">{vendorContracts.length} contrat(s)</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Total Facturé</p>
                      <p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(totalInvoiceAmount)}</p>
                      <p className="text-xs text-slate-500 mt-1">{vendorInvoices.length} facture(s)</p>
                    </div>
                  </div>

                  {/* Contrats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-200">Contrats ({vendorContracts.length})</h3>
                    </div>
                    {vendorContracts.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Aucun contrat</p>
                    ) : (
                      <div className="space-y-2">
                        {vendorContracts.map(contract => (
                          <Link
                            key={contract.id}
                            href={`/contrats?id=${contract.id}`}
                            className="block p-3 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 hover:border-cyan-600/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-slate-200">{contract.label}</p>
                                <p className="text-sm text-slate-400 mt-1">
                                  {contract.vendor} • {contract.number}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {new Date(contract.startDate).toLocaleDateString('fr-FR')} - {new Date(contract.endDate).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-cyan-400">{formatCurrency(contract.amount)}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Factures */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-200">Factures ({vendorInvoices.length})</h3>
                    </div>
                    {vendorInvoices.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Aucune facture</p>
                    ) : (
                      <div className="space-y-2">
                        {vendorInvoices.map(invoice => (
                          <Link
                            key={invoice.id}
                            href={`/factures?id=${invoice.id}`}
                            className="block p-3 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 hover:border-amber-600/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-slate-200">{invoice.description}</p>
                                <p className="text-sm text-slate-400 mt-1">
                                  {invoice.vendor} • {invoice.number}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')}
                                  {invoice.status && (
                                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                      invoice.status === 'Payée' ? 'bg-green-900/30 text-green-400' : 'bg-orange-900/30 text-orange-400'
                                    }`}>
                                      {invoice.status === 'Payée' ? 'Payée' : 'En attente'}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-amber-400">{formatCurrency(invoice.amount)}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </SheetContent>
      </Sheet>

    </MainLayout>
  )
}
