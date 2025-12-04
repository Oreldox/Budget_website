'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Search, FileDown, FileUp, Filter, X, ChevronUp, ChevronDown, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { InvoiceEditDrawer } from '@/components/drawers/invoice-edit'
import { InvoiceFormDrawer } from '@/components/drawers/invoice-form'
import { useInvoices } from '@/lib/hooks'
import { useGlobalData } from '@/lib/data-context'
import { exportInvoicesToExcel, exportInvoicesToCSV, importInvoicesFromFile } from '@/lib/export'
import type { Invoice } from '@/lib/types'

export default function FacturesPage() {
  const searchParams = useSearchParams()
  const { invoices, total, filters, setFilters, addInvoice, updateInvoice, deleteInvoice, fetchInvoices } = useInvoices()
  const { domains } = useGlobalData()
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set([
    'invoiceDate', 'invoiceYear', 'number', 'description', 'amount', 'pointed', 'type', 'domain', 'budgetLine'
  ]))
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Lire les paramètres URL au montage
  useEffect(() => {
    const withoutContract = searchParams.get('withoutContract')
    if (withoutContract === 'true') {
      setFilters({ ...filters, withoutContract: true })
    }
  }, [searchParams])

  // Toutes les colonnes disponibles (alignées avec le template d'import)
  const allColumns = [
    { key: 'supplierCode', label: 'Code fournisseur' },
    { key: 'lineNumber', label: 'Num Ligne' },
    { key: 'invoiceDate', label: 'Date' },
    { key: 'invoiceYear', label: 'Année' },
    { key: 'number', label: 'N° KIM' },
    { key: 'description', label: 'Description' },
    { key: 'amountHT', label: 'Montant code comptable' },
    { key: 'allocationCode', label: 'Imputation' },
    { key: 'amount', label: 'Montant TTC' },
    { key: 'pointed', label: 'Pointée' },
    { key: 'commandNumber', label: 'N° commande' },
    { key: 'type', label: 'Type suivi budget' },
    { key: 'domain', label: 'Domaine suivi budget' },
    { key: 'budgetLine', label: 'Lignes detail suivi budget' },
    { key: 'vendor', label: 'Fournisseur' },
    { key: 'nature', label: 'Nature' },
    { key: 'status', label: 'Statut' },
    { key: 'dueDate', label: 'Date échéance' },
    { key: 'paymentDate', label: 'Date paiement' },
    { key: 'contract', label: 'Contrat' },
    { key: 'comment', label: 'Commentaire interne' },
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

  const applyDateFilter = () => {
    setFilters({
      ...filters,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: 1
    })
  }

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

  const handleSort = (key: 'amount' | 'dueDate' | 'invoiceDate' | 'number') => {
    const newOrder = filters.sortBy === key && filters.sortOrder === 'asc' ? 'desc' : 'asc'
    setFilters({
      ...filters,
      sortBy: key,
      sortOrder: newOrder,
      page: 1
    })
  }

  const hasActiveFilters = search || filters.status || filters.domain || filters.nature || filters.withoutContract || dateFrom || dateTo || amountMin || amountMax

  const handleSearch = (value: string) => {
    setSearch(value)
    setFilters({ ...filters, page: 1, search: value })
  }

  const handleRowClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setEditOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteInvoice(id)
  }

  const handleAddInvoice = (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    addInvoice(invoice)
    setFormOpen(false)
  }

  const handleExportExcel = () => {
    try {
      exportInvoicesToExcel(invoices)
      toast.success('Export Excel réussi')
    } catch (error) {
      toast.error('Erreur lors de l\'export')
    }
  }

  const handleExportCSV = () => {
    try {
      exportInvoicesToCSV(invoices)
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

    // Vérifier le type de fichier
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
      const result = await importInvoicesFromFile(file, (current, total) => {
        toast.loading(`Import en cours... ${current}/${total}`, { id: toastId })
      })

      if (result.success > 0) {
        toast.success(`${result.success} facture(s) importée(s) avec succès`, { id: toastId })
        // Rafraîchir la liste
        fetchInvoices()
      } else {
        toast.error('Aucune facture importée', { id: toastId })
      }

      if (result.errors.length > 0) {
        console.error('Erreurs d\'import:', result.errors)
        // Afficher les 3 premières erreurs dans les toasts
        result.errors.slice(0, 3).forEach((error, index) => {
          setTimeout(() => {
            toast.error(error, { duration: 10000 })
          }, index * 100)
        })
        if (result.errors.length > 3) {
          setTimeout(() => {
            toast.error(`... et ${result.errors.length - 3} autre(s) erreur(s)`, { duration: 10000 })
          }, 300)
        }
      }
    } catch (error: any) {
      toast.error(`Erreur lors de l'import: ${error.message}`, { id: toastId })
    } finally {
      setImporting(false)
      // Réinitialiser l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: 'amount' | 'dueDate' | 'invoiceDate' | 'number' }) => (
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

  // Définition de toutes les colonnes possibles (alignées avec template d'import)
  const columnDefinitions: Record<string, any> = {
    supplierCode: {
      header: 'Code fournisseur',
      key: 'supplierCode' as const,
      render: (value: string) => <span className="text-slate-400 text-sm font-mono">{value || '-'}</span>,
    },
    lineNumber: {
      header: 'Num Ligne',
      key: 'lineNumber' as const,
      render: (value: string) => <span className="text-slate-400 text-sm">{value || '-'}</span>,
    },
    invoiceDate: {
      header: <SortHeader label="Date" sortKey="invoiceDate" />,
      key: 'invoiceDate' as const,
      render: (value: string) => <span className="text-slate-300 text-sm">{value ? new Date(value).toLocaleDateString('fr-FR') : '-'}</span>,
      className: 'w-24',
    },
    invoiceYear: {
      header: 'Année',
      key: 'invoiceYear' as const,
      render: (value: number) => <span className="text-slate-300 text-sm">{value || '-'}</span>,
    },
    number: {
      header: <SortHeader label="N° KIM" sortKey="number" />,
      key: 'number' as const,
      className: 'font-medium text-cyan-400 w-32',
    },
    description: {
      header: 'Description',
      key: 'description' as const,
      render: (value: string) => <span className="text-slate-300 text-sm truncate max-w-48">{value || '-'}</span>,
    },
    amountHT: {
      header: 'Montant code comptable',
      key: 'amountHT' as const,
      render: (value: number) => <span className="text-slate-300">{value?.toLocaleString('fr-FR') || 0}€</span>,
      className: 'text-right',
    },
    allocationCode: {
      header: 'Imputation',
      key: 'allocationCode' as const,
      render: (value: string) => <span className="text-slate-400 text-sm font-mono">{value || '-'}</span>,
    },
    amount: {
      header: <SortHeader label="Montant TTC" sortKey="amount" />,
      key: 'amount' as const,
      render: (value: number) => <span className="font-semibold text-cyan-400">{value?.toLocaleString('fr-FR') || 0}€</span>,
      className: 'text-right',
    },
    pointed: {
      header: 'Pointée',
      key: 'pointed' as const,
      render: (value: boolean) => (
        <span className={`inline-block px-2 py-0.5 rounded text-xs ${value ? 'bg-emerald-900/50 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
          {value ? 'Oui' : 'Non'}
        </span>
      ),
    },
    commandNumber: {
      header: 'N° commande',
      key: 'commandNumber' as const,
      render: (value: string) => <span className="text-slate-300 text-sm">{value || '-'}</span>,
    },
    type: {
      header: 'Type suivi budget',
      key: 'type' as const,
      render: (value: any) => <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300">{value?.name || '-'}</span>,
    },
    domain: {
      header: 'Domaine suivi budget',
      key: 'domain' as const,
      render: (value: any) => <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300">{value?.name || '-'}</span>,
    },
    budgetLine: {
      header: 'Lignes detail suivi budget',
      key: 'budgetLine' as const,
      render: (value: any) => <span className="text-slate-300 text-sm">{value?.label || '-'}</span>,
    },
    vendor: {
      header: 'Fournisseur',
      key: 'vendor' as const,
      render: (value: string) => <span className="text-slate-300">{value}</span>,
    },
    nature: {
      header: 'Nature',
      key: 'nature' as const,
      render: (value: string) => (
        <span className={`inline-block px-2 py-0.5 rounded text-xs ${value === 'Investissement' ? 'bg-blue-900/30 text-blue-300' : 'bg-slate-800 text-slate-300'}`}>
          {value || '-'}
        </span>
      ),
    },
    status: {
      header: 'Statut',
      key: 'status' as const,
      render: (value: string) => {
        const colors =
          value === 'Payée'
            ? 'bg-emerald-900/50 text-emerald-300'
            : value === 'En attente'
              ? 'bg-blue-900/50 text-blue-300'
              : 'bg-red-900/50 text-red-300'
        return <span className={`inline-block px-2 py-0.5 rounded text-xs ${colors}`}>{value || '-'}</span>
      },
    },
    dueDate: {
      header: <SortHeader label="Date échéance" sortKey="dueDate" />,
      key: 'dueDate' as const,
      render: (value: string) => <span className="text-slate-300 text-sm">{value ? new Date(value).toLocaleDateString('fr-FR') : '-'}</span>,
      className: 'w-24',
    },
    paymentDate: {
      header: 'Date paiement',
      key: 'paymentDate' as const,
      render: (value: string) => <span className="text-slate-300 text-sm">{value ? new Date(value).toLocaleDateString('fr-FR') : '-'}</span>,
      className: 'w-24',
    },
    contract: {
      header: 'Contrat',
      key: 'contract' as const,
      render: (value: any) => <span className="text-slate-300 text-sm">{value?.number || '-'}</span>,
    },
    comment: {
      header: 'Commentaire interne',
      key: 'comment' as const,
      render: (value: string) => <span className="text-slate-300 text-sm truncate max-w-48">{value || '-'}</span>,
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
          <h2 className="text-3xl font-bold text-slate-50">Suivi des Factures</h2>
          <p className="text-slate-400 mt-2">Créer, modifier et supprimer vos factures avec tags et commentaires</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Rechercher une facture..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700"
              />
            </div>

            <Select
              value={filters.status || ''}
              onValueChange={(value) => setFilters({ ...filters, status: value as any, page: 1 })}
            >
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white [&>span]:text-white">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Payée">Payée</SelectItem>
                <SelectItem value="En attente">En attente</SelectItem>
                <SelectItem value="Retard">Retard</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.domain || ''}
              onValueChange={(value) => setFilters({ ...filters, domain: value as any, page: 1 })}
            >
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white [&>span]:text-white">
                <SelectValue placeholder="Tous les domaines" />
              </SelectTrigger>
              <SelectContent>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>{domain.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.nature || 'all'}
              onValueChange={(value) => setFilters({ ...filters, nature: value === 'all' ? undefined : value as any, page: 1 })}
            >
              <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white [&>span]:text-white">
                <SelectValue placeholder="Toutes les natures" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-50">Toutes</SelectItem>
                <SelectItem value="Fonctionnement" className="text-slate-50">Fonctionnement</SelectItem>
                <SelectItem value="Investissement" className="text-slate-50">Investissement</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setFilters({ ...filters, withoutContract: !filters.withoutContract, page: 1 })}
              className={`bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 ${filters.withoutContract ? 'bg-amber-600/20 border-amber-600 text-amber-300' : ''}`}
            >
              {filters.withoutContract ? 'Achats ponctuels actif' : 'Achats ponctuels'}
            </Button>

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
              Nouvelle facture
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
                <label className="block text-sm text-slate-400 mb-1">Date début</label>
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
                <label className="block text-sm text-slate-400 mb-1">Date fin</label>
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
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
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
          data={invoices}
          columns={columns}
          total={total}
          page={filters.page || 1}
          pageSize={filters.pageSize || 50}
          onPageChange={(page) => setFilters({ ...filters, page })}
          onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
          onRowClick={handleRowClick}
        />
      </div>

      <InvoiceEditDrawer
        invoice={selectedInvoice}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdate={updateInvoice}
        onDelete={handleDelete}
      />

      <InvoiceFormDrawer open={formOpen} onOpenChange={setFormOpen} onSubmit={handleAddInvoice} />
    </MainLayout>
  )
}
