'use client'

import { useState, useCallback, useMemo, useEffect, useContext } from 'react'
import { toast } from 'sonner'
import type {
  Contract,
  Invoice,
  BudgetLine,
  ContractsFilter,
  InvoicesFilter,
  BudgetLinesFilter,
  ImportHistoryEntry,
  SearchResult,
  BudgetTypeLabel,
  BudgetDomain,
  PaginatedResponse,
} from './types'
import { useGlobalData } from './data-context'

// Cache pour contracts et invoices
const contractsCache: {
  data: Contract[] | null
  total: number
  lastFetch: number
  filters: string | null
} = {
  data: null,
  total: 0,
  lastFetch: 0,
  filters: null,
}

const invoicesCache: {
  data: Invoice[] | null
  total: number
  lastFetch: number
  filters: string | null
} = {
  data: null,
  total: 0,
  lastFetch: 0,
  filters: null,
}

const CACHE_TTL = 30000 // 30 secondes

// CONTRACTS HOOK
export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<ContractsFilter>({ page: 1, pageSize: 25 })

  // Fetch contracts from API
  const fetchContracts = useCallback(async () => {
    const params = new URLSearchParams()
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.pageSize) params.append('pageSize', filters.pageSize.toString())
    if (filters.status) params.append('status', filters.status)
    if (filters.type) params.append('type', filters.type)
    if (filters.vendor) params.append('vendor', filters.vendor)
    if (filters.search) params.append('search', filters.search)
    if (filters.sortBy) params.append('sortBy', filters.sortBy)
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

    const filtersKey = params.toString()
    const now = Date.now()

    // Vérifier le cache
    if (
      contractsCache.data &&
      contractsCache.filters === filtersKey &&
      now - contractsCache.lastFetch < CACHE_TTL
    ) {
      setContracts(contractsCache.data)
      setTotal(contractsCache.total)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/contracts?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch contracts')

      const data: PaginatedResponse<Contract> = await response.json()

      // Mettre à jour le cache
      contractsCache.data = data.data
      contractsCache.total = data.total
      contractsCache.lastFetch = now
      contractsCache.filters = filtersKey

      setContracts(data.data)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Fetch contracts when filters change
  useEffect(() => {
    fetchContracts()
  }, [fetchContracts])

  const addContract = useCallback(async (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      toast.loading('Création du contrat en cours...', { id: 'create-contract' })

      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contract),
      })

      if (!response.ok) throw new Error('Failed to create contract')

      const newContract: Contract = await response.json()

      // Invalider le cache
      contractsCache.data = null

      // Optimistic update: add to local state
      setContracts((prev) => [newContract, ...prev])
      setTotal((prev) => prev + 1)

      toast.success('Contrat créé avec succès', { id: 'create-contract' })
      return newContract
    } catch (error) {
      console.error('Error creating contract:', error)
      toast.error('Erreur lors de la création du contrat', { id: 'create-contract' })
      throw error
    }
  }, [])

  const updateContract = useCallback(async (id: string, updates: Partial<Contract>) => {
    try {
      toast.loading('Mise à jour du contrat...', { id: 'update-contract' })

      const response = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error('Failed to update contract')

      const updatedContract: Contract = await response.json()

      // Invalider le cache
      contractsCache.data = null

      // Optimistic update
      setContracts((prev) => prev.map((c) => (c.id === id ? updatedContract : c)))

      toast.success('Contrat mis à jour avec succès', { id: 'update-contract' })
    } catch (error) {
      console.error('Error updating contract:', error)
      toast.error('Erreur lors de la mise à jour du contrat', { id: 'update-contract' })
      throw error
    }
  }, [])

  const deleteContract = useCallback(async (id: string) => {
    try {
      toast.loading('Suppression du contrat...', { id: 'delete-contract' })

      const response = await fetch(`/api/contracts/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete contract')

      // Invalider le cache
      contractsCache.data = null

      // Optimistic update
      setContracts((prev) => prev.filter((c) => c.id !== id))
      setTotal((prev) => prev - 1)

      toast.success('Contrat supprimé avec succès', { id: 'delete-contract' })
    } catch (error) {
      console.error('Error deleting contract:', error)
      toast.error('Erreur lors de la suppression du contrat', { id: 'delete-contract' })
      throw error
    }
  }, [])

  return {
    contracts,
    total,
    loading,
    filters,
    setFilters,
    fetchContracts,
    addContract,
    updateContract,
    deleteContract,
  }
}

// INVOICES HOOK
export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<InvoicesFilter>({ page: 1, pageSize: 50 })

  // Fetch invoices from API
  const fetchInvoices = useCallback(async () => {
    const params = new URLSearchParams()
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.pageSize) params.append('pageSize', filters.pageSize.toString())
    if (filters.status) params.append('status', filters.status)
    if (filters.vendor) params.append('vendor', filters.vendor)
    if (filters.domain) params.append('domain', filters.domain)
    if (filters.nature) params.append('nature', filters.nature)
    if (filters.year) params.append('year', filters.year.toString())
    if (filters.unpointedOnly) params.append('unpointedOnly', 'true')
    if (filters.withoutContract) params.append('withoutContract', 'true')
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.append('dateTo', filters.dateTo)
    if (filters.search) params.append('search', filters.search)
    if (filters.sortBy) params.append('sortBy', filters.sortBy)
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

    const filtersKey = params.toString()
    const now = Date.now()

    // Vérifier le cache
    if (
      invoicesCache.data &&
      invoicesCache.filters === filtersKey &&
      now - invoicesCache.lastFetch < CACHE_TTL
    ) {
      setInvoices(invoicesCache.data)
      setTotal(invoicesCache.total)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/invoices?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch invoices')

      const data: PaginatedResponse<Invoice> = await response.json()

      // Mettre à jour le cache
      invoicesCache.data = data.data
      invoicesCache.total = data.total
      invoicesCache.lastFetch = now
      invoicesCache.filters = filtersKey

      setInvoices(data.data)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Fetch invoices when filters change
  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const addInvoice = useCallback(async (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      toast.loading('Création de la facture en cours...', { id: 'create-invoice' })

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice),
      })

      if (!response.ok) throw new Error('Failed to create invoice')

      const newInvoice: Invoice = await response.json()

      // Invalider le cache
      invoicesCache.data = null

      // Optimistic update
      setInvoices((prev) => [newInvoice, ...prev])
      setTotal((prev) => prev + 1)

      toast.success('Facture créée avec succès', { id: 'create-invoice' })
      return newInvoice
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast.error('Erreur lors de la création de la facture', { id: 'create-invoice' })
      throw error
    }
  }, [])

  const updateInvoice = useCallback(async (id: string, updates: Partial<Invoice>) => {
    try {
      toast.loading('Mise à jour de la facture...', { id: 'update-invoice' })

      const response = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error('Failed to update invoice')

      const updatedInvoice: Invoice = await response.json()

      // Invalider le cache
      invoicesCache.data = null

      // Optimistic update
      setInvoices((prev) => prev.map((i) => (i.id === id ? updatedInvoice : i)))

      toast.success('Facture mise à jour avec succès', { id: 'update-invoice' })
    } catch (error) {
      console.error('Error updating invoice:', error)
      toast.error('Erreur lors de la mise à jour de la facture', { id: 'update-invoice' })
      throw error
    }
  }, [])

  const deleteInvoice = useCallback(async (id: string) => {
    try {
      toast.loading('Suppression de la facture...', { id: 'delete-invoice' })

      const response = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete invoice')

      // Invalider le cache
      invoicesCache.data = null

      // Optimistic update
      setInvoices((prev) => prev.filter((i) => i.id !== id))
      setTotal((prev) => prev - 1)

      toast.success('Facture supprimée avec succès', { id: 'delete-invoice' })
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast.error('Erreur lors de la suppression de la facture', { id: 'delete-invoice' })
      throw error
    }
  }, [])

  return {
    invoices,
    total,
    loading,
    filters,
    setFilters,
    fetchInvoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
  }
}

// BUDGET STRUCTURE HOOK
export function useBudgetStructure() {
  const [budgetLines, setBudgetLines] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<BudgetLinesFilter>({ page: 1, pageSize: 25 })

  // Use global cached data for types, domains, and all budget lines
  const { types, domains, allBudgetLines, refreshTypes, refreshDomains, refreshBudgetLines } = useGlobalData()

  // Refresh data function
  const refreshData = useCallback(async () => {
    await refreshBudgetLines()
  }, [refreshBudgetLines])

  // Fetch paginated budget lines when filters change
  useEffect(() => {
    const fetchLines = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (filters.page) params.append('page', filters.page.toString())
        if (filters.pageSize) params.append('pageSize', filters.pageSize.toString())
        if (filters.type) params.append('type', filters.type)
        if (filters.domain) params.append('domain', filters.domain)
        if (filters.sortBy) params.append('sortBy', filters.sortBy)
        if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)
        if (filters.search) params.append('search', filters.search)
        if (filters.year) params.append('year', filters.year)
        if (filters.nature) params.append('nature', filters.nature)

        const response = await fetch(`/api/budget-lines?${params.toString()}`)
        if (!response.ok) throw new Error('Failed to fetch budget lines')

        const data: PaginatedResponse<any> = await response.json()
        setBudgetLines(data.data)
        setTotal(data.total)
      } catch (error) {
        console.error('Error fetching budget lines:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLines()
  }, [filters])

  const addBudgetLine = useCallback(async (line: Omit<BudgetLine, 'id'>) => {
    try {
      const response = await fetch('/api/budget-lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(line),
      })

      if (!response.ok) throw new Error('Failed to create budget line')

      const newLine = await response.json()

      // Optimistic update for local state
      setBudgetLines((prev) => [newLine, ...prev])
      setTotal((prev) => prev + 1)

      // Refresh global cache
      await refreshBudgetLines()

      return newLine
    } catch (error) {
      console.error('Error creating budget line:', error)
      throw error
    }
  }, [refreshBudgetLines])

  const updateBudgetLine = useCallback(async (id: string, updates: Partial<BudgetLine>) => {
    try {
      const response = await fetch(`/api/budget-lines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error('Failed to update budget line')

      const updatedLine = await response.json()

      // Optimistic update for local state
      setBudgetLines((prev) => prev.map((b) => (b.id === id ? updatedLine : b)))

      // Refresh global cache
      await refreshBudgetLines()
    } catch (error) {
      console.error('Error updating budget line:', error)
      throw error
    }
  }, [refreshBudgetLines])

  const deleteBudgetLine = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/budget-lines/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete budget line')

      // Optimistic update for local state
      setBudgetLines((prev) => prev.filter((b) => b.id !== id))
      setTotal((prev) => prev - 1)

      // Refresh global cache
      await refreshBudgetLines()
    } catch (error) {
      console.error('Error deleting budget line:', error)
      throw error
    }
  }, [refreshBudgetLines])

  // CRUD pour les types - use API and refresh global cache
  const addType = useCallback(async (type: { name: string; color?: string }) => {
    try {
      const response = await fetch('/api/budget-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type),
      })
      if (!response.ok) throw new Error('Failed to create type')
      const newType = await response.json()
      await refreshTypes()
      return newType
    } catch (error) {
      console.error('Error creating type:', error)
      throw error
    }
  }, [refreshTypes])

  const updateType = useCallback(async (id: string, updates: { name?: string; color?: string }) => {
    try {
      const response = await fetch(`/api/budget-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) throw new Error('Failed to update type')
      await refreshTypes()
    } catch (error) {
      console.error('Error updating type:', error)
      throw error
    }
  }, [refreshTypes])

  const deleteType = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/budget-types/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete type')
      await refreshTypes()
    } catch (error) {
      console.error('Error deleting type:', error)
      throw error
    }
  }, [refreshTypes])

  // CRUD pour les domaines - use API and refresh global cache
  const addDomain = useCallback(async (domain: { name: string; typeId: string; description?: string }) => {
    try {
      const response = await fetch('/api/budget-domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(domain),
      })
      if (!response.ok) throw new Error('Failed to create domain')
      const newDomain = await response.json()
      await refreshDomains()
      return newDomain
    } catch (error) {
      console.error('Error creating domain:', error)
      throw error
    }
  }, [refreshDomains])

  const updateDomain = useCallback(async (id: string, updates: { name?: string; description?: string }) => {
    try {
      const response = await fetch(`/api/budget-domains/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) throw new Error('Failed to update domain')
      await refreshDomains()
    } catch (error) {
      console.error('Error updating domain:', error)
      throw error
    }
  }, [refreshDomains])

  const deleteDomain = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/budget-domains/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete domain')
      await refreshDomains()
    } catch (error) {
      console.error('Error deleting domain:', error)
      throw error
    }
  }, [refreshDomains])

  return {
    budgetLines,
    allBudgetLines,
    types,
    domains,
    total,
    loading,
    filters,
    setFilters,
    addBudgetLine,
    updateBudgetLine,
    deleteBudgetLine,
    addType,
    updateType,
    deleteType,
    addDomain,
    updateDomain,
    deleteDomain,
    refreshData,
  }
}

// PURCHASE ORDERS HOOK
export function usePurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<any>({ page: 1, pageSize: 25 })

  const fetchPurchaseOrders = useCallback(async () => {
    const params = new URLSearchParams()
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.pageSize) params.append('pageSize', filters.pageSize.toString())
    if (filters.status) params.append('status', filters.status)
    if (filters.vendor) params.append('vendor', filters.vendor)
    if (filters.search) params.append('search', filters.search)
    if (filters.unlinked) params.append('unlinked', 'true')

    setLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch purchase orders')

      const data = await response.json()
      setPurchaseOrders(data.purchaseOrders || [])
      setTotal(data.pagination?.total || 0)
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchPurchaseOrders()
  }, [fetchPurchaseOrders])

  const addPurchaseOrder = useCallback(async (po: any) => {
    try {
      toast.loading('Création du bon de commande...', { id: 'create-po' })

      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(po),
      })

      if (!response.ok) throw new Error('Failed to create purchase order')

      const newPO = await response.json()
      setPurchaseOrders((prev) => [newPO, ...prev])
      setTotal((prev) => prev + 1)

      toast.success('Bon de commande créé avec succès', { id: 'create-po' })
      return newPO
    } catch (error) {
      console.error('Error creating purchase order:', error)
      toast.error('Erreur lors de la création du bon de commande', { id: 'create-po' })
      throw error
    }
  }, [])

  const updatePurchaseOrder = useCallback(async (id: string, updates: any) => {
    try {
      toast.loading('Mise à jour du bon de commande...', { id: 'update-po' })

      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error('Failed to update purchase order')

      const updated = await response.json()
      setPurchaseOrders((prev) => prev.map((po) => (po.id === id ? updated : po)))

      toast.success('Bon de commande mis à jour', { id: 'update-po' })
      return updated
    } catch (error) {
      console.error('Error updating purchase order:', error)
      toast.error('Erreur lors de la mise à jour', { id: 'update-po' })
      throw error
    }
  }, [])

  const deletePurchaseOrder = useCallback(async (id: string) => {
    try {
      toast.loading('Suppression du bon de commande...', { id: 'delete-po' })

      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete purchase order')

      setPurchaseOrders((prev) => prev.filter((po) => po.id !== id))
      setTotal((prev) => prev - 1)

      toast.success('Bon de commande supprimé', { id: 'delete-po' })
    } catch (error) {
      console.error('Error deleting purchase order:', error)
      toast.error('Erreur lors de la suppression', { id: 'delete-po' })
      throw error
    }
  }, [])

  return {
    purchaseOrders,
    total,
    loading,
    filters,
    setFilters,
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    fetchPurchaseOrders,
  }
}

// SEARCH HOOK
export function useGlobalSearch() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const searchAll = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([])
      return []
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error('Search failed')

      const data = await response.json()

      // Flatten results from all categories
      const allResults: SearchResult[] = [
        ...data.invoices,
        ...data.contracts,
        ...data.budgetLines,
      ]

      setResults(allResults)
      return allResults
    } catch (error) {
      console.error('Error searching:', error)
      setResults([])
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return { searchAll, results, loading }
}

// IMPORTS HISTORY HOOK
export function useImportsHistory() {
  const [history, setHistory] = useState<ImportHistoryEntry[]>([
    {
      id: '1',
      filename: 'factures_november.csv',
      type: 'invoices',
      linesCount: 127,
      status: 'success',
      importedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      filename: 'contrats_2024.xlsx',
      type: 'contracts',
      linesCount: 28,
      status: 'success',
      importedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ])

  const addImport = useCallback((entry: Omit<ImportHistoryEntry, 'id'>) => {
    const newEntry: ImportHistoryEntry = {
      ...entry,
      id: Math.random().toString(36).substr(2, 9),
    }
    setHistory((prev) => [newEntry, ...prev])
    return newEntry
  }, [])

  return {
    history,
    addImport,
  }
}
