'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

interface DataContextType {
  types: any[]
  domains: any[]
  allBudgetLines: any[]
  loading: boolean
  refreshTypes: () => Promise<void>
  refreshDomains: () => Promise<void>
  refreshBudgetLines: () => Promise<void>
}

const DataContext = createContext<DataContextType | null>(null)

// Simple cache to prevent duplicate fetches
const cache: {
  types: any[] | null
  domains: any[] | null
  budgetLines: any[] | null
  lastFetch: { types: number; domains: number; budgetLines: number }
  userId: string | null
} = {
  types: null,
  domains: null,
  budgetLines: null,
  lastFetch: { types: 0, domains: 0, budgetLines: 0 },
  userId: null,
}

const CACHE_TTL = 5000 // 5 secondes - navigation instantanée

// Clear cache when user changes
function clearCacheIfUserChanged(userId: string | null) {
  if (cache.userId !== userId) {
    cache.types = null
    cache.domains = null
    cache.budgetLines = null
    cache.lastFetch = { types: 0, domains: 0, budgetLines: 0 }
    cache.userId = userId
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [types, setTypes] = useState<any[]>(cache.types || [])
  const [domains, setDomains] = useState<any[]>(cache.domains || [])
  const [allBudgetLines, setAllBudgetLines] = useState<any[]>(cache.budgetLines || [])
  const [loading, setLoading] = useState(!cache.types || !cache.domains)

  const fetchTypes = useCallback(async () => {
    const now = Date.now()
    if (cache.types && now - cache.lastFetch.types < CACHE_TTL) {
      setTypes(cache.types)
      return
    }

    try {
      const res = await fetch('/api/budget-types')
      if (res.ok) {
        const data = await res.json()
        cache.types = data
        cache.lastFetch.types = now
        setTypes(data)
      }
    } catch (error) {
      console.error('Error fetching types:', error)
    }
  }, [])

  const fetchDomains = useCallback(async () => {
    const now = Date.now()
    if (cache.domains && now - cache.lastFetch.domains < CACHE_TTL) {
      setDomains(cache.domains)
      return
    }

    try {
      const res = await fetch('/api/budget-domains')
      if (res.ok) {
        const data = await res.json()
        cache.domains = data
        cache.lastFetch.domains = now
        setDomains(data)
      }
    } catch (error) {
      console.error('Error fetching domains:', error)
    }
  }, [])

  const fetchBudgetLines = useCallback(async () => {
    const now = Date.now()
    if (cache.budgetLines && now - cache.lastFetch.budgetLines < CACHE_TTL) {
      setAllBudgetLines(cache.budgetLines)
      return
    }

    try {
      // Récupération en une seule requête sans pagination
      const res = await fetch('/api/budget-lines?all=true')
      if (!res.ok) {
        console.error('Error fetching budget lines:', res.statusText)
        return
      }

      const data = await res.json()
      const allLines = data.data || data

      cache.budgetLines = allLines
      cache.lastFetch.budgetLines = now
      setAllBudgetLines(allLines)
    } catch (error) {
      console.error('Error fetching budget lines:', error)
    }
  }, [])

  // Clear cache when user changes and reload data
  useEffect(() => {
    const currentUserId = session?.user?.id || null
    const userChanged = cache.userId !== currentUserId

    if (userChanged) {
      clearCacheIfUserChanged(currentUserId)
      // Force reload after user change
      const loadData = async () => {
        setLoading(true)
        await Promise.all([fetchTypes(), fetchDomains(), fetchBudgetLines()])
        setLoading(false)
      }
      loadData()
    }
  }, [session?.user?.id, fetchTypes, fetchDomains, fetchBudgetLines])

  useEffect(() => {
    const loadData = async () => {
      // Ne charger que si on n'a pas déjà les données en cache
      if (!cache.types || !cache.domains || !cache.budgetLines) {
        setLoading(true)
        await Promise.all([fetchTypes(), fetchDomains(), fetchBudgetLines()])
        setLoading(false)
      } else {
        // Si on a le cache, juste mettre à jour les states
        setTypes(cache.types)
        setDomains(cache.domains)
        setAllBudgetLines(cache.budgetLines)
      }
    }
    loadData()
    // Retirer session?.user?.id des dépendances car on gère le changement d'utilisateur dans un useEffect séparé
  }, [fetchTypes, fetchDomains, fetchBudgetLines])

  const refreshTypes = useCallback(async () => {
    cache.types = null
    cache.lastFetch.types = 0
    await fetchTypes()
  }, [fetchTypes])

  const refreshDomains = useCallback(async () => {
    cache.domains = null
    cache.lastFetch.domains = 0
    await fetchDomains()
  }, [fetchDomains])

  const refreshBudgetLines = useCallback(async () => {
    cache.budgetLines = null
    cache.lastFetch.budgetLines = 0
    await fetchBudgetLines()
  }, [fetchBudgetLines])

  return (
    <DataContext.Provider value={{ types, domains, allBudgetLines, loading, refreshTypes, refreshDomains, refreshBudgetLines }}>
      {children}
    </DataContext.Provider>
  )
}

export function useGlobalData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useGlobalData must be used within DataProvider')
  }
  return context
}
