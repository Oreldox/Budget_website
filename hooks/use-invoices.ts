'use client'

import { useState, useCallback } from 'react'
import type { Invoice, InvoicesFilter } from '@/lib/types'
import { invoices as initialInvoices } from '@/lib/mock-data'

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)

  const addInvoice = useCallback((invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newId = `inv-${Date.now()}`
    const now = new Date().toISOString()
    const newInvoice: Invoice = {
      ...invoice,
      id: newId,
      createdAt: now,
      updatedAt: now,
    }
    setInvoices(prev => [newInvoice, ...prev])
    return newInvoice
  }, [])

  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>) => {
    setInvoices(prev =>
      prev.map(i => i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i)
    )
  }, [])

  const deleteInvoice = useCallback((id: string) => {
    setInvoices(prev => prev.filter(i => i.id !== id))
  }, [])

  const getFiltered = useCallback((filters?: InvoicesFilter) => {
    let result = [...invoices]

    if (filters?.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(i =>
        i.number.toLowerCase().includes(q) ||
        i.vendor.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.commandNumber?.toLowerCase().includes(q) ||
        i.tags?.some(tag => tag.toLowerCase().includes(q)) ||
        i.comment?.toLowerCase().includes(q)
      )
    }

    if (filters?.status) {
      result = result.filter(i => i.status === filters.status)
    }

    if (filters?.type) {
      result = result.filter(i => i.typeId === filters.type)
    }

    if (filters?.domain) {
      result = result.filter(i => i.domainId === filters.domain)
    }

    if (filters?.nature) {
      result = result.filter(i => i.nature === filters.nature)
    }

    if (filters?.year) {
      result = result.filter(i => i.invoiceYear === filters.year)
    }

    return result
  }, [invoices])

  return {
    invoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    getFiltered,
  }
}
