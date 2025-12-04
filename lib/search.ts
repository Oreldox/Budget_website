'use client'

import type { SearchResult } from './types'
import { useContracts, useInvoices, useBudgetStructure } from './hooks'

export function useGlobalSearchAdvanced() {
  const { contracts } = useContracts()
  const { invoices } = useInvoices()
  const { allBudgetLines } = useBudgetStructure()

  const search = (query: string): SearchResult[] => {
    if (!query.trim()) return []

    const q = query.toLowerCase()
    const results: SearchResult[] = []

    // Search invoices
    invoices.forEach((inv) => {
      if (
        inv.number.toLowerCase().includes(q) ||
        inv.vendor.toLowerCase().includes(q) ||
        inv.domain?.name.toLowerCase().includes(q) ||
        inv.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        inv.comment?.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'invoice',
          id: inv.id,
          title: inv.number,
          subtitle: `${inv.vendor} - ${inv.domain}`,
          amount: inv.amount,
          date: inv.invoiceDate,
          metadata: inv,
        })
      }
    })

    // Search contracts
    contracts.forEach((ctr) => {
      if (
        ctr.number.toLowerCase().includes(q) ||
        ctr.label.toLowerCase().includes(q) ||
        ctr.vendor.toLowerCase().includes(q) ||
        ctr.type?.name.toLowerCase().includes(q) ||
        ctr.domain?.name.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'contract',
          id: ctr.id,
          title: ctr.number,
          subtitle: `${ctr.label} - ${ctr.vendor}`,
          amount: ctr.amount,
          date: ctr.startDate,
          metadata: ctr,
        })
      }
    })

    // Search budget lines
    allBudgetLines.forEach((line) => {
      if (
        line.label.toLowerCase().includes(q) ||
        line.type.toLowerCase().includes(q) ||
        line.domain.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'budget-line',
          id: line.id,
          title: line.label,
          subtitle: `${line.type} - ${line.domain}`,
          amount: line.budget,
          metadata: line,
        })
      }
    })

    return results.slice(0, 20)
  }

  return { search }
}
