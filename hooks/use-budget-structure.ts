'use client'

import { useState, useCallback } from 'react'
import type { BudgetLine, BudgetType, BudgetStructureDomain } from '@/lib/types'
import { budgetLines as initialLines, budgetTypes as initialTypes, budgetDomains as initialDomains } from '@/lib/mock-data'

export function useBudgetStructure() {
  const [types, setTypes] = useState<BudgetType[]>(initialTypes)
  const [domains, setDomains] = useState<BudgetStructureDomain[]>(initialDomains)
  const [lines, setLines] = useState<BudgetLine[]>(initialLines)

  const addType = useCallback((type: Omit<BudgetType, 'id'>) => {
    const newId = `type-${Date.now()}`
    const newType: BudgetType = { ...type, id: newId }
    setTypes(prev => [...prev, newType])
    return newType
  }, [])

  const updateType = useCallback((id: string, updates: Partial<BudgetType>) => {
    setTypes(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }, [])

  const deleteType = useCallback((id: string) => {
    setTypes(prev => prev.filter(t => t.id !== id))
  }, [])

  const addDomain = useCallback((domain: Omit<BudgetStructureDomain, 'id'>) => {
    const newId = `domain-${Date.now()}`
    const newDomain: BudgetStructureDomain = { ...domain, id: newId }
    setDomains(prev => [...prev, newDomain])
    return newDomain
  }, [])

  const updateDomain = useCallback((id: string, updates: Partial<BudgetStructureDomain>) => {
    setDomains(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
  }, [])

  const deleteDomain = useCallback((id: string) => {
    setDomains(prev => prev.filter(d => d.id !== id))
  }, [])

  const addLine = useCallback((line: Omit<BudgetLine, 'id'>) => {
    const newId = `line-${Date.now()}`
    const newLine: BudgetLine = { ...line, id: newId }
    setLines(prev => [...prev, newLine])
    return newLine
  }, [])

  const updateLine = useCallback((id: string, updates: Partial<BudgetLine>) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }, [])

  const deleteLine = useCallback((id: string) => {
    setLines(prev => prev.filter(l => l.id !== id))
  }, [])

  return {
    types,
    domains,
    lines,
    addType,
    updateType,
    deleteType,
    addDomain,
    updateDomain,
    deleteDomain,
    addLine,
    updateLine,
    deleteLine,
    getTypeById: (id: string) => types.find(t => t.id === id),
    getDomainById: (id: string) => domains.find(d => d.id === id),
    getLineById: (id: string) => lines.find(l => l.id === id),
    getDomainsByType: (typeId: string) => domains.filter(d => d.typeId === typeId),
    getLinesByDomain: (domainId: string) => lines.filter(l => l.domainId === domainId),
  }
}
