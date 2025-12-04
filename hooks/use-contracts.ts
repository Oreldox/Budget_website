'use client'

import { useState, useCallback, useMemo } from 'react'
import type { Contract, ContractsFilter } from '@/lib/types'
import { contracts as initialContracts } from '@/lib/mock-data'

export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>(initialContracts)

  const addContract = useCallback((contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newId = `ctr-${Date.now()}`
    const now = new Date().toISOString()
    const newContract: Contract = {
      ...contract,
      id: newId,
      createdAt: now,
      updatedAt: now,
    }
    setContracts(prev => [newContract, ...prev])
    return newContract
  }, [])

  const updateContract = useCallback((id: string, updates: Partial<Contract>) => {
    setContracts(prev =>
      prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)
    )
  }, [])

  const deleteContract = useCallback((id: string) => {
    setContracts(prev => prev.filter(c => c.id !== id))
  }, [])

  const getFiltered = useCallback((filters?: ContractsFilter) => {
    let result = [...contracts]

    if (filters?.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(c =>
        c.number.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q) ||
        c.vendor.toLowerCase().includes(q)
      )
    }

    if (filters?.status) {
      result = result.filter(c => c.status === filters.status)
    }

    if (filters?.type) {
      result = result.filter(c => c.typeId === filters.type)
    }

    if (filters?.domain) {
      result = result.filter(c => c.domainId === filters.domain)
    }

    return result
  }, [contracts])

  return {
    contracts,
    addContract,
    updateContract,
    deleteContract,
    getFiltered,
  }
}
