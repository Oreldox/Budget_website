'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Plus, Search, FileDown, FileUp, Filter, X, ChevronUp, ChevronDown, Settings2, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { ContractEditDrawer } from '@/components/drawers/contract-edit'
import { ContractFormDrawer } from '@/components/drawers/contract-form'
import { useContracts } from '@/lib/hooks'
import { useGlobalData } from '@/lib/data-context'
import { exportContractsToExcel, exportContractsToCSV, importContractsFromFile } from '@/lib/export'
import type { Contract } from '@/lib/types'

// Helper: Calculer les jours jusqu'à expiration
function getDaysUntilExpiration(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Helper: Obtenir le badge d'expiration
function getExpirationBadge(daysRemaining: number): { icon: any, color: string, label: string } {
  if (daysRemaining < 0) {
    return { icon: X, color: 'text-red-400', label: 'Expiré' }
  } else if (daysRemaining <= 15) {
    return { icon: AlertCircle, color: 'text-red-400', label: `${daysRemaining}j restants` }
  } else if (daysRemaining <= 60) {
    return { icon: AlertTriangle, color: 'text-orange-400', label: `${daysRemaining}j restants` }
  } else {
    return { icon: CheckCircle, color: 'text-emerald-400', label: `${daysRemaining}j restants` }
  }
}

export default function ContratsPage() {
  const { contracts, total, filters, setFilters, fetchContracts, addContract, updateContract, deleteContract } = useContracts()
  const { types } = useGlobalData()
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [allVendors, setAllVendors] = useState<string[]>([])
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set([
    'number', 'label', 'type', 'vendor', 'startDate', 'endDate', 'amount', 'consumed', 'status'
  ]))
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Calculer les statistiques d'expiration
  const expirationStats = useMemo(() => {
    const critical = contracts.filter(c => {
      const days = getDaysUntilExpiration(c.endDate)
      return days >= 0 && days <= 15
    })
    const warning = contracts.filter(c => {
      const days = getDaysUntilExpiration(c.endDate)
      return days > 15 && days <= 60
    })
    const expired = contracts.filter(c => getDaysUntilExpiration(c.endDate) < 0)

    return { critical, warning, expired }
  }, [contracts])

  // Toutes les colonnes disponibles
  const allColumns = [
    { key: 'number', label: 'N° Contrat' },
    { key: 'label', label: 'Libellé' },
    { key: 'type', label: 'Type' },
    { key: 'domain', label: 'Domaine' },
    { key: 'vendor', label: 'Fournisseur' },
    { key: 'providerName', label: 'Prestataire' },
    { key: 'startDate', label: 'Date début' },
    { key: 'endDate', label: 'Date fin' },
    { key: 'amount', label: 'Montant total' },
    { key: 'consumed', label: 'Consommé' },
    { key: 'budgetLine', label: 'Ligne budgétaire' },
    { key: 'description', label: 'Description' },
    { key: 'constraints', label: 'Commentaire interne' },
    { key: 'accountingCode', label: 'Code comptable' },
    { key: 'allocationCode', label: 'Code imputation' },
    { key: 'status', label: 'Statut' },
  ]

  const toggleColumn = (key: string) => {
    const newSet = new Set(visibleColumns)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setVisibleColumns(newSet)
  }

  // Charger tous les fournisseurs une seule fois au démarrage
  useEffect(() => {
    const fetchAllVendors = async () => {
      try {
        const response = await fetch('/api/vendors-list')
        if (response.ok) {
          const vendors = await response.json()
          setAllVendors(vendors)
        }
      } catch (error) {
        console.error('Error fetching vendors:', error)
      }
    }
    fetchAllVendors()
  }, [])

  const clearFilters = () => {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setAmountMin('')
    setAmountMax('')
    setFilters({
      page: 1,
      pageSize: filters.pageSize,
    })
  }

  const handleSort = (key: 'amount' | 'startDate' | 'endDate' | 'number') => {
    const newOrder = filters.sortBy === key && filters.sortOrder === 'asc' ? 'desc' : 'asc'
    setFilters({
      ...filters,
      sortBy: key,
      sortOrder: newOrder,
      page: 1
    })
  }

  const hasActiveFilters = search || filters.status || filters.type || filters.vendor || dateFrom || dateTo || amountMin || amountMax

  const handleSearch = (value: string) => {
    setSearch(value)
    setFilters({ ...filters, page: 1, search: value })
  }

  const handleRowClick = (contract: Contract) => {
    setSelectedContract(contract)
    setEditOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteContract(id)
  }

  const handleAddContract = (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
    addContract(contract)
    setFormOpen(false)
  }

  const handleExportExcel = () => {
    try {
      exportContractsToExcel(contracts)
      toast.success('Export Excel réussi')
    } catch (error) {
      toast.error('Erreur lors de l\'export')
    }
  }

  const handleExportCSV = () => {
    try {
      exportContractsToCSV(contracts)
      toast.success('Export CSV réussi')
    } catch (error) {
      toast.error('Erreur lors de l\'export')
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]
    if (!validTypes.includes(file.type)) {
      toast.error('Format de fichier non supporté. Utilisez Excel (.xlsx) ou CSV (.csv)')
      return
    }

    setImporting(true)
    const toastId = toast.loading('Import en cours...')

    try {
      const result = await importContractsFromFile(file, (current, total) => {
        toast.loading(`Import en cours... ${current}/${total}`, { id: toastId })
      })

      if (result.success > 0) {
        toast.success(`${result.success} contrat(s) importé(s) avec succès`, { id: toastId })
        fetchContracts()
      } else {
        toast.error('Aucun contrat importé', { id: toastId })
      }

      if (result.errors.length > 0) {
        console.error('Erreurs d\'import:', result.errors)
        toast.error(`${result.errors.length} erreur(s) détectée(s). Voir la console pour les détails.`)
      }
    } catch (error: any) {
      toast.error(`Erreur lors de l'import: ${error.message}`, { id: toastId })
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: 'amount' | 'startDate' | 'endDate' | 'number' }) => (
    <button
      onClick={() => handleSort(sortKey)}
      className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
    >
      {label}
      {filters.sortBy === sortKey && (
        filters.sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      )}
    </button>
  )

  // Définition de toutes les colonnes possibles
  const columnDefinitions: Record<string, any> = {
    number: {
      header: <SortHeader label="N° Contrat" sortKey="number" />,
      key: 'number' as const,
      className: 'font-medium text-cyan-400',
    },
    label: {
      header: 'Libellé',
      key: 'label' as const,
      render: (value: string) => <span className="text-slate-50">{value}</span>,
    },
    type: {
      header: 'Type',
      key: 'type' as const,
      render: (value: any) => (
        <span className="inline-block px-2 py-1 rounded text-xs bg-slate-800 text-slate-300">{value?.name || '-'}</span>
      ),
    },
    domain: {
      header: 'Domaine',
      key: 'domain' as const,
      render: (value: any) => (
        <span className="inline-block px-2 py-1 rounded text-xs bg-slate-800 text-slate-300">{value?.name || '-'}</span>
      ),
    },
    vendor: {
      header: 'Fournisseur',
      key: 'vendor' as const,
      render: (value: string) => <span className="text-slate-300">{value}</span>,
    },
    providerName: {
      header: 'Prestataire',
      key: 'providerName' as const,
      render: (value: string) => <span className="text-slate-300 text-sm">{value || '-'}</span>,
    },
    startDate: {
      header: <SortHeader label="Début" sortKey="startDate" />,
      key: 'startDate' as const,
      render: (value: string) => (
        <span className="text-slate-400 text-sm">
          {value ? new Date(value).toLocaleDateString('fr-FR') : '-'}
        </span>
      ),
    },
    endDate: {
      header: <SortHeader label="Fin" sortKey="endDate" />,
      key: 'endDate' as const,
      render: (value: string) => {
        if (!value) return <span className="text-slate-400 text-sm">-</span>
        const daysRemaining = getDaysUntilExpiration(value)
        const badge = getExpirationBadge(daysRemaining)
        const Icon = badge.icon

        return (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">
              {new Date(value).toLocaleDateString('fr-FR')}
            </span>
            <div className={`flex items-center gap-1 ${badge.color}`}>
              <Icon className="h-3 w-3" />
              <span className="text-xs">{badge.label}</span>
            </div>
          </div>
        )
      },
    },
    amount: {
      header: <SortHeader label="Montant" sortKey="amount" />,
      key: 'amount' as const,
      render: (value: number) => <span className="font-semibold text-cyan-400">{value?.toLocaleString('fr-FR') || 0}€</span>,
      className: 'text-right',
    },
    consumed: {
      header: 'Consommé',
      key: 'totalInvoiced' as const,
      render: (value: number, row: Contract) => {
        const invoiced = value || 0
        const total = row.amount || 0
        const percentage = total > 0 ? (invoiced / total) * 100 : 0
        const percentageColor = percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-orange-500' : 'bg-cyan-500'

        return (
          <div className="w-32">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300">{invoiced.toLocaleString('fr-FR')}€</span>
              <span className="text-slate-400">{percentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${percentageColor} transition-all`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        )
      },
    },
    budgetLine: {
      header: 'Ligne budgétaire',
      key: 'budgetLine' as const,
      render: (value: any) => <span className="text-slate-300 text-sm">{value?.label || '-'}</span>,
    },
    description: {
      header: 'Description',
      key: 'description' as const,
      render: (value: string) => <span className="text-slate-300 text-sm truncate max-w-48">{value || '-'}</span>,
    },
    constraints: {
      header: 'Commentaire interne',
      key: 'constraints' as const,
      render: (value: string) => <span className="text-slate-300 text-sm truncate max-w-48">{value || '-'}</span>,
    },
    accountingCode: {
      header: 'Code comptable',
      key: 'accountingCode' as const,
      render: (value: string) => <span className="text-slate-400 text-sm font-mono">{value || '-'}</span>,
    },
    allocationCode: {
      header: 'Code imputation',
      key: 'allocationCode' as const,
      render: (value: string) => <span className="text-slate-400 text-sm font-mono">{value || '-'}</span>,
    },
    status: {
      header: 'Statut',
      key: 'status' as const,
      render: (value: string) => {
        const colors =
          value === 'Actif'
            ? 'bg-emerald-900/50 text-emerald-300'
            : value === 'Expirant'
              ? 'bg-amber-900/50 text-amber-300'
              : 'bg-red-900/50 text-red-300'
        return <span className={`inline-block px-2 py-1 rounded text-xs ${colors}`}>{value || '-'}</span>
      },
    },
  }

  // Colonnes filtrées selon la sélection
  const columns = allColumns
    .filter(col => visibleColumns.has(col.key))
    .map(col => columnDefinitions[col.key])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-50">Gestion des Contrats</h2>
          <p className="text-slate-400 mt-2">Créer, modifier et supprimer vos contrats pluriannuels</p>
        </div>

        {/* Alertes d'expiration */}
        {(expirationStats.critical.length > 0 || expirationStats.warning.length > 0 || expirationStats.expired.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {expirationStats.expired.length > 0 && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-900/50 rounded-lg">
                    <X className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">{expirationStats.expired.length}</div>
                    <div className="text-sm text-slate-300">Contrat{expirationStats.expired.length > 1 ? 's' : ''} expiré{expirationStats.expired.length > 1 ? 's' : ''}</div>
                  </div>
                </div>
              </div>
            )}

            {expirationStats.critical.length > 0 && (
              <div className="bg-red-900/10 border border-red-700/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-900/30 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">{expirationStats.critical.length}</div>
                    <div className="text-sm text-slate-300">Expire{expirationStats.critical.length > 1 ? 'nt' : ''} sous 15 jours</div>
                  </div>
                </div>
              </div>
            )}

            {expirationStats.warning.length > 0 && (
              <div className="bg-orange-900/10 border border-orange-700/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-900/30 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-400">{expirationStats.warning.length}</div>
                    <div className="text-sm text-slate-300">Expire{expirationStats.warning.length > 1 ? 'nt' : ''} sous 60 jours</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Rechercher un contrat..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700"
              />
            </div>

            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value as any, page: 1 })}
            >
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white [&>span]:text-white">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="Actif">Actif</SelectItem>
                <SelectItem value="Expirant">Expirant</SelectItem>
                <SelectItem value="Expiré">Expiré</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.type || 'all'}
              onValueChange={(value) => setFilters({ ...filters, type: value === 'all' ? undefined : value, page: 1 })}
            >
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white [&>span]:text-white">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {types.map((type) => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.vendor || 'all'}
              onValueChange={(value) => setFilters({ ...filters, vendor: value === 'all' ? undefined : value, page: 1 })}
            >
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white [&>span]:text-white">
                <SelectValue placeholder="Tous les fournisseurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les fournisseurs</SelectItem>
                {allVendors.map((vendor) => (
                  <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 ${showAdvancedFilters ? 'bg-cyan-600/20 border-cyan-600' : ''}`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className={`bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 ${showColumnSelector ? 'bg-purple-600/20 border-purple-600' : ''}`}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Colonnes
            </Button>

            <Button onClick={handleImportClick} variant="outline" size="sm" disabled={importing} className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">
              <FileUp className="h-4 w-4 mr-2" />
              Importer
            </Button>
            <Button onClick={handleExportExcel} variant="outline" size="sm" className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">
              <FileDown className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button onClick={handleExportCSV} variant="outline" size="sm" className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">
              <FileDown className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button onClick={() => setFormOpen(true)} size="sm" className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau contrat
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4 mr-1" />
                Effacer
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Filtres avancés */}
        {showAdvancedFilters && (
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Date début (après)</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setFilters({ ...filters, dateFrom: e.target.value || undefined, page: 1 })
                  }}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Date fin (avant)</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setFilters({ ...filters, dateTo: e.target.value || undefined, page: 1 })
                  }}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Montant min (€)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Montant max (€)</label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sélecteur de colonnes */}
        {showColumnSelector && (
          <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-200">Colonnes à afficher</h3>
              <span className="text-xs text-slate-400">{visibleColumns.size} colonnes sélectionnées</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {allColumns.map(col => (
                <button
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  className={`px-3 py-2 rounded text-xs font-medium transition-all text-left ${
                    visibleColumns.has(col.key)
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-600 hover:bg-slate-700'
                  }`}
                >
                  {col.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <DataTable
          data={contracts}
          columns={columns}
          total={total}
          page={filters.page || 1}
          pageSize={filters.pageSize || 25}
          onPageChange={(page) => setFilters({ ...filters, page })}
          onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
          onRowClick={handleRowClick}
        />
      </div>

      <ContractEditDrawer
        contract={selectedContract}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdate={updateContract}
        onDelete={handleDelete}
      />

      <ContractFormDrawer open={formOpen} onOpenChange={setFormOpen} onSubmit={handleAddContract} />
    </MainLayout>
  )
}
