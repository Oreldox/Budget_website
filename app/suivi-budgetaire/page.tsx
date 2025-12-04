'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Calendar, TrendingUp, TrendingDown, AlertCircle, CheckCircle, AlertTriangle, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBudgetStructure } from '@/lib/hooks'
import type { BudgetLine } from '@/lib/types'

export default function BudgetReelPage() {
  const searchParams = useSearchParams()
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedType, setSelectedType] = useState<string>('all')
  const { budgetLines, types, domains, filters, setFilters } = useBudgetStructure()

  // Annual budget state
  const [annualBudget, setAnnualBudget] = useState({
    budgetFonctionnement: 0,
    budgetInvestissement: 0,
    exists: false
  })

  // Load available years
  const fetchAvailableYears = useCallback(async () => {
    try {
      const response = await fetch('/api/budget-years')
      if (response.ok) {
        const data = await response.json()
        setAvailableYears(data.years || [])
      }
    } catch (error) {
      console.error('Error fetching years:', error)
    }
  }, [])

  useEffect(() => {
    fetchAvailableYears()
  }, [fetchAvailableYears])

  // Load annual budget for selected year
  const fetchAnnualBudget = useCallback(async (year: number) => {
    try {
      const response = await fetch(`/api/annual-budgets?year=${year}`)
      if (response.ok) {
        const data = await response.json()
        setAnnualBudget(data)
      }
    } catch (error) {
      console.error('Error fetching annual budget:', error)
    }
  }, [])

  useEffect(() => {
    fetchAnnualBudget(selectedYear)
  }, [selectedYear, fetchAnnualBudget])

  // Handle year from URL
  useEffect(() => {
    const yearParam = searchParams.get('year')
    if (yearParam) {
      const year = parseInt(yearParam)
      if (!isNaN(year)) {
        setSelectedYear(year)
      }
    }
  }, [searchParams])

  // Filter by selected year
  useEffect(() => {
    setFilters(prev => ({ ...prev, year: selectedYear.toString(), page: 1 }))
  }, [selectedYear, setFilters])

  // Filter budget lines by type
  const filteredBudgetLines = useMemo(() => {
    if (selectedType === 'all') return budgetLines
    return budgetLines.filter(line => line.typeId === selectedType)
  }, [budgetLines, selectedType])

  // Calculate totals
  const calculateTotals = (nature: 'Fonctionnement' | 'Investissement') => {
    const lines = filteredBudgetLines.filter(line => line.nature === nature)

    const previsionnel = lines.reduce((sum, line) => {
      const yearlyBudget = (line as any).yearlyBudgets?.find((yb: any) => yb.year === selectedYear)
      return sum + (yearlyBudget?.budget || 0)
    }, 0)

    const engage = lines.reduce((sum, line) => {
      const yearlyBudget = (line as any).yearlyBudgets?.find((yb: any) => yb.year === selectedYear)
      return sum + (yearlyBudget?.engineered || 0)
    }, 0)

    const facture = lines.reduce((sum, line) => {
      const yearlyBudget = (line as any).yearlyBudgets?.find((yb: any) => yb.year === selectedYear)
      return sum + (yearlyBudget?.invoiced || 0)
    }, 0)

    const ecart = previsionnel - facture
    const consommation = previsionnel > 0 ? (facture / previsionnel) * 100 : 0

    return { previsionnel, engage, facture, ecart, consommation }
  }

  const fonctionnementTotals = calculateTotals('Fonctionnement')
  const investissementTotals = calculateTotals('Investissement')
  const grandTotal = {
    previsionnel: fonctionnementTotals.previsionnel + investissementTotals.previsionnel,
    engage: fonctionnementTotals.engage + investissementTotals.engage,
    facture: fonctionnementTotals.facture + investissementTotals.facture,
    ecart: fonctionnementTotals.ecart + investissementTotals.ecart,
    consommation: fonctionnementTotals.previsionnel + investissementTotals.previsionnel > 0
      ? ((fonctionnementTotals.facture + investissementTotals.facture) / (fonctionnementTotals.previsionnel + investissementTotals.previsionnel)) * 100
      : 0
  }

  // Get status for a line
  const getStatus = (previsionnel: number, facture: number): 'ok' | 'warning' | 'danger' => {
    if (previsionnel === 0) return 'ok'
    const ratio = (facture / previsionnel) * 100
    if (ratio > 100) return 'danger'
    if (ratio > 80) return 'warning'
    return 'ok'
  }

  // Render comparison card
  const renderComparisonCard = (
    title: string,
    totals: typeof fonctionnementTotals,
    color: string,
    icon: any
  ) => {
    const Icon = icon
    const status = getStatus(totals.previsionnel, totals.facture)
    const disponible = totals.previsionnel - totals.facture

    return (
      <div className={`bg-gradient-to-br ${color} rounded-xl p-6 border border-slate-700`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-800/50 flex items-center justify-center">
              <Icon className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-50">{title}</h3>
          </div>
          {status === 'danger' && <AlertCircle className="w-6 h-6 text-red-400" />}
          {status === 'warning' && <AlertTriangle className="w-6 h-6 text-amber-400" />}
          {status === 'ok' && <CheckCircle className="w-6 h-6 text-green-400" />}
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Prévisionnel</p>
            <p className="text-2xl font-bold text-cyan-300">
              {totals.previsionnel.toLocaleString('fr-FR')}€
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Engagé</p>
            <p className="text-2xl font-bold text-blue-300">
              {totals.engage.toLocaleString('fr-FR')}€
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {totals.previsionnel > 0 ? Math.round((totals.engage / totals.previsionnel) * 100) : 0}% du prévu
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Facturé</p>
            <p className="text-2xl font-bold text-emerald-300">
              {totals.facture.toLocaleString('fr-FR')}€
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {totals.previsionnel > 0 ? Math.round((totals.facture / totals.previsionnel) * 100) : 0}% consommé
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Reste disponible</p>
            <p className={`text-2xl font-bold ${disponible >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {disponible.toLocaleString('fr-FR')}€
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {disponible >= 0 ? 'Dans le budget' : 'Dépassement'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full ${
              status === 'danger' ? 'bg-red-500' :
              status === 'warning' ? 'bg-amber-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(totals.consommation, 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          {totals.consommation.toFixed(1)}% du budget consommé
        </p>
      </div>
    )
  }

  // Render detailed budget line
  const renderDetailLine = (line: BudgetLine) => {
    const yearlyBudget = (line as any).yearlyBudgets?.find((yb: any) => yb.year === selectedYear)
    const previsionnel = yearlyBudget?.budget || 0
    const engage = yearlyBudget?.engineered || 0
    const facture = yearlyBudget?.invoiced || 0
    const ecart = previsionnel - facture
    const status = getStatus(previsionnel, facture)
    const consommation = previsionnel > 0 ? (facture / previsionnel) * 100 : 0

    return (
      <div
        key={line.id}
        className={`bg-slate-800/50 rounded-lg p-4 border-2 transition-all ${
          status === 'danger' ? 'border-red-500/50' :
          status === 'warning' ? 'border-amber-500/50' :
          'border-slate-700'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-lg font-semibold text-slate-50">{line.label}</h4>
              {status === 'danger' && (
                <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/50">
                  ⚠️ Dépassement
                </span>
              )}
              {status === 'warning' && (
                <span className="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400 border border-amber-500/50">
                  ⚡ Attention
                </span>
              )}
              {status === 'ok' && ecart >= 0 && (
                <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/50">
                  ✅ Conforme
                </span>
              )}
            </div>
            {line.description && (
              <p className="text-sm text-slate-400 mb-2">{line.description}</p>
            )}
            <div className="flex gap-2">
              <span className="inline-block px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">
                {(line as any).type?.name || '-'}
              </span>
              <span className="inline-block px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">
                {(line as any).domain?.name || '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">Prévisionnel</p>
            <p className="text-lg font-bold text-cyan-400">{previsionnel.toLocaleString('fr-FR')}€</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Engagé</p>
            <p className="text-lg font-bold text-blue-400">{engage.toLocaleString('fr-FR')}€</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Facturé</p>
            <p className="text-lg font-bold text-emerald-400">{facture.toLocaleString('fr-FR')}€</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Écart</p>
            <p className={`text-lg font-bold ${ecart >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {ecart >= 0 ? '+' : ''}{ecart.toLocaleString('fr-FR')}€
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full ${
              status === 'danger' ? 'bg-red-500' :
              status === 'warning' ? 'bg-amber-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(consommation, 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {consommation.toFixed(1)}% consommé
        </p>
      </div>
    )
  }

  const fonctionnementLines = filteredBudgetLines.filter(line => line.nature === 'Fonctionnement')
  const investissementLines = filteredBudgetLines.filter(line => line.nature === 'Investissement')

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-50">Budget Réel</h2>
            <p className="text-slate-400 mt-2">Comparaison prévisionnel vs dépenses réelles</p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            {/* Type filter */}
            <Select
              value={selectedType}
              onValueChange={setSelectedType}
            >
              <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-slate-50">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-50">Tous les types</SelectItem>
                {types.map(type => (
                  <SelectItem key={type.id} value={type.id} className="text-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: type.color }} />
                      {type.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year selector */}
            <Calendar className="h-5 w-5 text-cyan-400" />
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-32 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border-cyan-700 text-cyan-400 font-bold hover:from-cyan-900/40 hover:to-blue-900/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {availableYears.sort((a, b) => b - a).map((year) => (
                  <SelectItem key={year} value={year.toString()} className="text-slate-50">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Global comparison */}
        <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl p-6 border border-purple-700/50">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="w-8 h-8 text-purple-400" />
            <h3 className="text-2xl font-bold text-slate-50">Vue Globale {selectedYear}</h3>
          </div>

          <div className="grid grid-cols-5 gap-6">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">Prévisionnel Total</p>
              <p className="text-3xl font-bold text-cyan-300">{grandTotal.previsionnel.toLocaleString('fr-FR')}€</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">Engagé Total</p>
              <p className="text-3xl font-bold text-blue-300">{grandTotal.engage.toLocaleString('fr-FR')}€</p>
              <p className="text-xs text-slate-500 mt-1">
                {grandTotal.previsionnel > 0 ? Math.round((grandTotal.engage / grandTotal.previsionnel) * 100) : 0}% du prévu
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">Facturé Total</p>
              <p className="text-3xl font-bold text-emerald-300">{grandTotal.facture.toLocaleString('fr-FR')}€</p>
              <p className="text-xs text-slate-500 mt-1">
                {grandTotal.consommation.toFixed(1)}% consommé
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">Reste Disponible</p>
              <p className={`text-3xl font-bold ${grandTotal.ecart >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {(grandTotal.previsionnel - grandTotal.facture).toLocaleString('fr-FR')}€
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">Statut Global</p>
              {getStatus(grandTotal.previsionnel, grandTotal.facture) === 'ok' && (
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              )}
              {getStatus(grandTotal.previsionnel, grandTotal.facture) === 'warning' && (
                <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
              )}
              {getStatus(grandTotal.previsionnel, grandTotal.facture) === 'danger' && (
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
              )}
            </div>
          </div>
        </div>

        {/* By nature */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderComparisonCard('Fonctionnement', fonctionnementTotals, 'from-blue-900/30 to-cyan-900/30', TrendingUp)}
          {renderComparisonCard('Investissement', investissementTotals, 'from-purple-900/30 to-pink-900/30', TrendingDown)}
        </div>

        {/* Detailed lines - Fonctionnement */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-6 w-6 text-blue-400" />
            <h3 className="text-2xl font-bold text-slate-50">Détail Fonctionnement</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {fonctionnementLines.length > 0 ? (
              fonctionnementLines.map(renderDetailLine)
            ) : (
              <div className="col-span-2 text-center py-12 text-slate-400">
                Aucune dépense de fonctionnement pour {selectedYear}
              </div>
            )}
          </div>
        </div>

        {/* Detailed lines - Investissement */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown className="h-6 w-6 text-purple-400" />
            <h3 className="text-2xl font-bold text-slate-50">Détail Investissement</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {investissementLines.length > 0 ? (
              investissementLines.map(renderDetailLine)
            ) : (
              <div className="col-span-2 text-center py-12 text-slate-400">
                Aucune dépense d'investissement pour {selectedYear}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
