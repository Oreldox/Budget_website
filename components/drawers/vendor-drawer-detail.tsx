'use client'

import { useMemo } from 'react'
import { Building2, FileText, Receipt, TrendingUp, Calendar, DollarSign, Package } from 'lucide-react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useContracts, useInvoices } from '@/lib/hooks'

interface VendorDrawerDetailProps {
  vendor: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VendorDrawerDetail({ vendor, open, onOpenChange }: VendorDrawerDetailProps) {
  const { contracts } = useContracts()
  const { invoices } = useInvoices()

  // Computed stats
  const stats = useMemo(() => {
    if (!vendor) return null

    const vendorContracts = contracts.filter(c => c.vendor === vendor)
    const vendorInvoices = invoices.filter(i => i.vendor === vendor)

    const totalContractAmount = vendorContracts.reduce((sum, c) => sum + (c.amount || 0), 0)
    const totalInvoiceAmount = vendorInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)
    const activeContracts = vendorContracts.filter(c => c.status === 'Actif').length
    const paidInvoices = vendorInvoices.filter(i => i.status === 'Payée').length
    const pendingInvoices = vendorInvoices.filter(i => i.status === 'En attente')
    const pendingAmount = pendingInvoices.reduce((sum, i) => sum + i.amount, 0)

    // Calculate yearly spending
    const currentYear = new Date().getFullYear()
    const yearlySpending: Record<number, number> = {}

    vendorInvoices.forEach(invoice => {
      const year = new Date(invoice.invoiceDate).getFullYear()
      yearlySpending[year] = (yearlySpending[year] || 0) + invoice.amount
    })

    // Calculate monthly spending for current year
    const monthlySpending: Record<number, number> = {}
    vendorInvoices
      .filter(i => new Date(i.invoiceDate).getFullYear() === currentYear)
      .forEach(invoice => {
        const month = new Date(invoice.invoiceDate).getMonth()
        monthlySpending[month] = (monthlySpending[month] || 0) + invoice.amount
      })

    // Find first and last transaction dates
    const allDates = vendorInvoices.map(i => new Date(i.invoiceDate).getTime())
    const firstTransaction = allDates.length > 0 ? new Date(Math.min(...allDates)) : null
    const lastTransaction = allDates.length > 0 ? new Date(Math.max(...allDates)) : null

    return {
      contracts: vendorContracts,
      invoices: vendorInvoices,
      totalContractAmount,
      totalInvoiceAmount,
      activeContracts,
      paidInvoices,
      pendingInvoices: pendingInvoices.length,
      pendingAmount,
      yearlySpending,
      monthlySpending,
      currentYear,
      firstTransaction,
      lastTransaction,
    }
  }, [vendor, contracts, invoices])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('fr-FR')
  }

  const getMonthName = (monthIndex: number) => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    return months[monthIndex]
  }

  if (!vendor || !stats) return null

  const maxYearlySpending = Math.max(...Object.values(stats.yearlySpending), 1)
  const maxMonthlySpending = Math.max(...Object.values(stats.monthlySpending), 1)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl">
        <DrawerHeader className="border-b border-slate-700 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-600/20">
                <Building2 className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <DrawerTitle className="text-xl font-bold text-slate-50">
                  {vendor}
                </DrawerTitle>
                <span className="text-xs text-slate-400">Fournisseur</span>
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                <Building2 className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Fournisseur</p>
                  <p className="text-slate-50 font-medium">{vendor}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                <FileText className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Contrats</p>
                  <p className="text-slate-50 font-medium">{stats.contracts.length}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                <Receipt className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Factures</p>
                  <p className="text-slate-50 font-medium">{stats.invoices.length}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                <DollarSign className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">Total dépensé</p>
                  <p className="text-slate-50 font-medium">{formatCurrency(stats.totalInvoiceAmount)}</p>
                </div>
              </div>
              {stats.firstTransaction && (
                <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Première transaction</p>
                    <p className="text-slate-50 font-medium">{formatDate(stats.firstTransaction)}</p>
                  </div>
                </div>
              )}
              {stats.lastTransaction && (
                <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Dernière transaction</p>
                    <p className="text-slate-50 font-medium">{formatDate(stats.lastTransaction)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Pending amount alert */}
            {stats.pendingAmount > 0 && (
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Package className="h-4 w-4 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-xs text-amber-400 font-medium">Factures en attente</p>
                  <p className="text-slate-50 font-medium">{formatCurrency(stats.pendingAmount)}</p>
                  <p className="text-xs text-slate-400 mt-1">{stats.pendingInvoices} facture(s)</p>
                </div>
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

            {/* Yearly Spending */}
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

            {/* Monthly Spending for Current Year */}
            {Object.keys(stats.monthlySpending).length > 0 && (
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <p className="text-sm font-medium text-slate-300">Dépenses mensuelles {stats.currentYear}</p>
                </div>
                <div className="space-y-2">
                  {Object.entries(stats.monthlySpending)
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .slice(0, 6)
                    .map(([month, amount]) => (
                      <div key={month}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">{getMonthName(Number(month))}</span>
                          <span className="text-slate-50 font-medium">{formatCurrency(amount)}</span>
                        </div>
                        <Progress
                          value={(amount / maxMonthlySpending) * 100}
                          className="h-1.5"
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
