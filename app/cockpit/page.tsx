'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, AlertTriangle, Clock, FileWarning, Settings2, BarChart3, PieChartIcon, TrendingUp, Calendar, TrendingDown, Wallet, Receipt, FileText, Users, Target, Activity, Filter, X, ShoppingBag } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, CartesianGrid, ComposedChart, ReferenceLine } from 'recharts'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useContracts, useInvoices } from '@/lib/hooks'
import { useGlobalData } from '@/lib/data-context'
import type { BudgetLine, YearlyBudget } from '@/lib/types'
import { BudgetLineDetailDrawer } from '@/components/drawers/budget-line-detail'
import { AlertsPanel } from '@/components/alerts-panel'
import { ExportButtons } from '@/components/export-buttons'

type ChartType = 'pie' | 'bar' | 'line' | 'area'
type MetricType = 'budget' | 'engineered' | 'invoiced' | 'remaining'
type GroupByType = 'domain' | 'type' | 'nature'

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

// Couleurs pour les années dans le graphique comparatif - sera initialisé côté client
function getYearColors(currentYear: number): Record<number, string> {
  return {
    [currentYear - 2]: '#8b5cf6',
    [currentYear - 1]: '#f59e0b',
    [currentYear]: '#06b6d4',
    [currentYear + 1]: '#10b981',
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(value)
}

function getProgressColor(percentage: number): string {
  if (percentage <= 50) return 'bg-emerald-500'
  if (percentage <= 80) return 'bg-amber-500'
  if (percentage <= 100) return 'bg-orange-500'
  return 'bg-red-500'
}

export default function CockpitPage() {
  const { contracts } = useContracts()
  const { invoices } = useInvoices()
  const { allBudgetLines, domains, types } = useGlobalData()

  // Initialize date values on client side only to avoid hydration errors
  const [currentYear, setCurrentYear] = useState<number>(2024)
  const [availableYears, setAvailableYears] = useState<number[]>([2022, 2023, 2024, 2025])
  const [YEAR_COLORS, setYearColors] = useState<Record<number, string>>({})
  const [isClient, setIsClient] = useState(false)
  const [selectedLine, setSelectedLine] = useState<BudgetLine | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number>(2024)
  const [selectedNature, setSelectedNature] = useState<string>('all') // all, Fonctionnement, Investissement

  // Chart customization states
  const [chart1Type, setChart1Type] = useState<ChartType>('pie')
  const [chart1Metrics, setChart1Metrics] = useState<MetricType[]>(['engineered', 'remaining'])
  const [chart2Type, setChart2Type] = useState<ChartType>('bar')
  const [chart2GroupBy, setChart2GroupBy] = useState<GroupByType>('domain')
  const [chart2Metrics, setChart2Metrics] = useState<MetricType[]>(['engineered', 'invoiced'])
  const [showChart1Settings, setShowChart1Settings] = useState(false)
  const [showChart2Settings, setShowChart2Settings] = useState(false)

  // États pour le graphique de suivi avancé
  const [compareYears, setCompareYears] = useState<number[]>([2024])
  const [compareFilter, setCompareFilter] = useState<{
    type: 'all' | 'domain' | 'type' | 'vendor' | 'label'
    value: string
  }>({ type: 'all', value: '' })
  const [showCompareSettings, setShowCompareSettings] = useState(false)

  useEffect(() => {
    const year = new Date().getFullYear()
    setCurrentYear(year)
    setAvailableYears([year - 2, year - 1, year, year + 1])
    setYearColors(getYearColors(year))
    setSelectedYear(year)
    setCompareYears([year])
    setIsClient(true)
  }, [])

  // Calculer les données pour l'année sélectionnée
  const yearlyData = useMemo(() => {
    let filtered = allBudgetLines

    // Filtrer par nature si sélectionné
    if (selectedNature !== 'all') {
      filtered = filtered.filter(line => line.nature === selectedNature)
    }

    return filtered.map(line => {
      const yearData = line.yearlyBudgets?.find((yb: { year: number }) => yb.year === selectedYear)
      if (yearData) {
        return {
          ...line,
          budget: yearData.budget,
          engineered: yearData.engineered,
          invoiced: yearData.invoiced,
        }
      }
      return line
    })
  }, [allBudgetLines, selectedYear, selectedNature])

  // Données de l'année précédente pour comparaison
  const previousYearData = useMemo(() => {
    return allBudgetLines.map(line => {
      const yearData = line.yearlyBudgets?.find((yb: { year: number }) => yb.year === selectedYear - 1)
      if (yearData) {
        return {
          ...line,
          budget: yearData.budget,
          engineered: yearData.engineered,
          invoiced: yearData.invoiced,
        }
      }
      return line
    })
  }, [allBudgetLines, selectedYear])

  const totalBudget = yearlyData.reduce((sum, line) => sum + line.budget, 0)
  const totalEngineered = yearlyData.reduce((sum, line) => sum + line.engineered, 0)
  const totalInvoiced = yearlyData.reduce((sum, line) => sum + line.invoiced, 0)
  const remaining = totalBudget - totalEngineered
  const percentageUsed = totalBudget > 0 ? Math.round((totalEngineered / totalBudget) * 100) : 0

  // Calculer les achats hors contrat (factures sans contract ID) pour l'année sélectionnée
  const adHocPurchases = useMemo(() => {
    const currentYear = invoices.filter(i => i.invoiceYear === selectedYear && !i.contractId)
    const previousYear = invoices.filter(i => i.invoiceYear === (selectedYear - 1) && !i.contractId)

    const currentTotal = currentYear.reduce((sum, inv) => sum + (inv.isCredit ? -inv.amount : inv.amount), 0)
    const previousTotal = previousYear.reduce((sum, inv) => sum + (inv.isCredit ? -inv.amount : inv.amount), 0)

    const variation = previousTotal > 0 ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100) : 0

    return {
      count: currentYear.length,
      total: currentTotal,
      variation,
      previousTotal,
    }
  }, [invoices, selectedYear])

  // Comparaison avec année précédente
  const prevTotalBudget = previousYearData.reduce((sum, line) => sum + line.budget, 0)
  const prevTotalEngineered = previousYearData.reduce((sum, line) => sum + line.engineered, 0)
  const budgetVariation = prevTotalBudget > 0 ? Math.round(((totalBudget - prevTotalBudget) / prevTotalBudget) * 100) : 0
  const engagedVariation = prevTotalEngineered > 0 ? Math.round(((totalEngineered - prevTotalEngineered) / prevTotalEngineered) * 100) : 0

  // Couleurs pour les métriques
  const metricColors: Record<MetricType, string> = {
    budget: '#f59e0b',
    engineered: '#06b6d4',
    invoiced: '#3b82f6',
    remaining: '#10b981',
  }

  // Données additionnelles pour les nouveaux graphiques
  const budgetByDomain = useMemo(() => {
    const groups: { [key: string]: { budget: number; engineered: number; invoiced: number } } = {}
    yearlyData.forEach(line => {
      const name = line.domain?.name || 'Autre'
      if (!groups[name]) groups[name] = { budget: 0, engineered: 0, invoiced: 0 }
      groups[name].budget += line.budget
      groups[name].engineered += line.engineered
      groups[name].invoiced += line.invoiced
    })
    return Object.entries(groups)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.budget - a.budget)
  }, [yearlyData])

  const budgetByNature = useMemo(() => {
    const groups: { [key: string]: number } = {}
    yearlyData.forEach(line => {
      const name = line.nature || 'Autre'
      groups[name] = (groups[name] || 0) + line.budget
    })
    return Object.entries(groups).map(([name, value]) => ({ name, value }))
  }, [yearlyData])

  const invoicesByStatus = useMemo(() => {
    const groups: { [key: string]: { count: number; amount: number } } = {}
    invoices.forEach(inv => {
      const status = inv.status || 'Autre'
      if (!groups[status]) groups[status] = { count: 0, amount: 0 }
      groups[status].count += 1
      groups[status].amount += (inv.isCredit ? -inv.amount : inv.amount)
    })
    return Object.entries(groups).map(([name, data]) => ({ name, ...data }))
  }, [invoices])

  const contractsByStatus = useMemo(() => {
    const groups: { [key: string]: number } = {}
    contracts.forEach(c => {
      const status = c.status || 'Autre'
      groups[status] = (groups[status] || 0) + 1
    })
    return Object.entries(groups).map(([name, value]) => ({ name, value }))
  }, [contracts])

  const topVendors = useMemo(() => {
    const groups: { [key: string]: number } = {}
    invoices.forEach(inv => {
      const vendor = inv.vendor || 'Autre'
      groups[vendor] = (groups[vendor] || 0) + (inv.isCredit ? -inv.amount : inv.amount)
    })
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [invoices])

  const engagementByType = useMemo(() => {
    const groups: { [key: string]: { budget: number; engineered: number } } = {}
    yearlyData.forEach(line => {
      const name = line.type?.name || 'Autre'
      if (!groups[name]) groups[name] = { budget: 0, engineered: 0 }
      groups[name].budget += line.budget
      groups[name].engineered += line.engineered
    })
    return Object.entries(groups)
      .map(([name, data]) => ({
        name,
        taux: data.budget > 0 ? Math.round((data.engineered / data.budget) * 100) : 0,
        budget: data.budget,
        engineered: data.engineered
      }))
      .sort((a, b) => b.taux - a.taux)
  }, [yearlyData])

  // Listes pour les filtres de comparaison
  const filterOptions = useMemo(() => {
    const domainsList = [...new Set(allBudgetLines.map(l => l.domain?.name).filter(Boolean))]
    const typesList = [...new Set(allBudgetLines.map(l => l.type?.name).filter(Boolean))]
    const vendorsList = [...new Set(invoices.map(i => i.vendor).filter(Boolean))]
    const labelsList = allBudgetLines.map(l => l.label)

    return {
      domain: domainsList,
      type: typesList,
      vendor: vendorsList,
      label: labelsList,
    }
  }, [allBudgetLines, invoices])

  // Données comparatives multi-années
  const compareData = useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

    // Pour chaque année sélectionnée, calculer les données
    const yearDataSets: Record<number, { budget: number; monthlyEngaged: number[] }> = {}

    compareYears.forEach(year => {
      // Filtrer les lignes budgétaires selon le filtre
      let filteredLines = allBudgetLines

      if (compareFilter.type !== 'all' && compareFilter.value) {
        filteredLines = allBudgetLines.filter(line => {
          switch (compareFilter.type) {
            case 'domain':
              return line.domain?.name === compareFilter.value
            case 'type':
              return line.type?.name === compareFilter.value
            case 'label':
              return line.label === compareFilter.value
            default:
              return true
          }
        })
      }

      // Calculer le budget total pour cette année et ce filtre
      let yearBudget = 0
      let yearEngineered = 0

      filteredLines.forEach(line => {
        const yearData = line.yearlyBudgets?.find((yb: { year: number }) => yb.year === year)
        if (yearData) {
          yearBudget += yearData.budget
          yearEngineered += yearData.engineered
        }
      })

      // Filtrer les contrats selon le filtre
      let filteredContracts = contracts.filter(c => {
        const startDate = new Date(c.startDate)
        if (startDate.getFullYear() > year) return false

        // Vérifier si le contrat est actif pendant cette année
        const endDate = new Date(c.endDate)
        if (endDate.getFullYear() < year) return false

        if (compareFilter.type === 'vendor' && compareFilter.value) {
          return c.vendor === compareFilter.value
        }

        // Pour les autres filtres, on utilise la ligne budgétaire associée
        if (compareFilter.type !== 'all' && compareFilter.value && compareFilter.type !== 'vendor') {
          const budgetLine = filteredLines.find(l => l.id === c.budgetLineId)
          return budgetLine !== undefined
        }

        return true
      })

      // Filtrer les factures selon le filtre
      let filteredInvoices = invoices.filter(inv => {
        const date = new Date(inv.invoiceDate)
        if (date.getFullYear() !== year) return false

        if (compareFilter.type === 'vendor' && compareFilter.value) {
          return inv.vendor === compareFilter.value
        }

        // Pour les autres filtres, on utilise la ligne budgétaire associée
        if (compareFilter.type !== 'all' && compareFilter.value && compareFilter.type !== 'vendor') {
          const budgetLine = filteredLines.find(l => l.id === inv.budgetLineId)
          return budgetLine !== undefined
        }

        return true
      })

      // Calculer l'engagement par mois (contrats + factures)
      const engagementByMonth: number[] = new Array(12).fill(0)

      // Ajouter les contrats (répartis sur l'année)
      if (filteredContracts.length > 0) {
        filteredContracts.forEach(contract => {
          const startDate = new Date(contract.startDate)
          const endDate = new Date(contract.endDate)
          const startMonth = startDate.getFullYear() === year ? startDate.getMonth() : 0
          const endMonth = endDate.getFullYear() === year ? endDate.getMonth() : 11

          // Répartir le montant du contrat sur les mois concernés
          const monthsActive = endMonth - startMonth + 1
          const monthlyAmount = contract.amount / monthsActive

          for (let m = startMonth; m <= endMonth; m++) {
            engagementByMonth[m] += monthlyAmount
          }
        })
      }

      // Ajouter les factures (en tenant compte des avoirs)
      filteredInvoices.forEach(inv => {
        const date = new Date(inv.invoiceDate)
        const month = date.getMonth()
        engagementByMonth[month] += (inv.isCredit ? -inv.amount : inv.amount)
      })

      yearDataSets[year] = {
        budget: yearBudget,
        monthlyEngaged: engagementByMonth,
      }
    })

    // Construire les données pour le graphique
    return months.map((name, index) => {
      const dataPoint: Record<string, string | number> = { name }

      compareYears.forEach(year => {
        const yearData = yearDataSets[year]
        // Calculer le cumul jusqu'à ce mois
        let cumul = 0
        for (let i = 0; i <= index; i++) {
          cumul += yearData.monthlyEngaged[i]
        }
        dataPoint[`Engagé ${year}`] = Math.round(cumul)
        dataPoint[`Budget ${year}`] = yearData.budget
      })

      return dataPoint
    })
  }, [compareYears, compareFilter, allBudgetLines, invoices, currentYear])

  // Toggle année pour comparaison
  const toggleCompareYear = (year: number) => {
    setCompareYears(prev => {
      if (prev.includes(year)) {
        // Ne pas permettre de tout désélectionner
        if (prev.length === 1) return prev
        return prev.filter(y => y !== year)
      }
      return [...prev, year].sort()
    })
  }

  // Données pour le graphique Budget prévu vs Engagé par mois
  const budgetVsEngagedByMonth = useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    const currentMonthNow = new Date().getMonth()
    const isCurrentYear = selectedYear === currentYear

    // Si on a des factures pour l'année sélectionnée, utiliser les données réelles
    const yearInvoices = invoices.filter(inv => {
      const date = new Date(inv.invoiceDate)
      return date.getFullYear() === selectedYear
    })

    // Calculer l'engagement par mois basé sur les factures
    const engagementByMonth: number[] = new Array(12).fill(0)

    if (yearInvoices.length > 0) {
      // Utiliser les factures réelles (en tenant compte des avoirs)
      yearInvoices.forEach(inv => {
        const date = new Date(inv.invoiceDate)
        const month = date.getMonth()
        engagementByMonth[month] += (inv.isCredit ? -inv.amount : inv.amount)
      })
    } else {
      // Simuler une progression mensuelle basée sur totalEngineered
      // Distribuer l'engagé total sur les mois passés de manière progressive
      const monthsToDistribute = isCurrentYear ? currentMonthNow + 1 : 12

      if (monthsToDistribute > 0 && totalEngineered > 0) {
        // Distribution progressive (plus d'engagement en fin d'année)
        let remaining = totalEngineered
        for (let i = 0; i < monthsToDistribute; i++) {
          // Distribution plus lourde vers la fin
          const weight = (i + 1) / ((monthsToDistribute * (monthsToDistribute + 1)) / 2)
          engagementByMonth[i] = Math.round(totalEngineered * weight)
          remaining -= engagementByMonth[i]
        }
        // Ajuster le dernier mois pour le reste
        if (remaining !== 0 && monthsToDistribute > 0) {
          engagementByMonth[monthsToDistribute - 1] += remaining
        }
      }
    }

    // Calculer le cumul de l'engagé
    let cumulEngaged = 0

    return months.map((name, index) => {
      cumulEngaged += engagementByMonth[index]

      return {
        name,
        'Budget prévu': totalBudget,
        'Engagé cumulé': Math.round(cumulEngaged),
      }
    })
  }, [totalBudget, totalEngineered, invoices, selectedYear, currentYear])

  const metricLabels: Record<MetricType, string> = {
    budget: 'Budget',
    engineered: 'Engagé',
    invoiced: 'Facturé',
    remaining: 'Disponible',
  }

  // Données pour le graphique 1 (vue globale)
  const chart1Data = useMemo(() => {
    const data: { name: string; value: number; color: string }[] = []

    if (chart1Metrics.includes('budget')) {
      data.push({ name: 'Budget', value: totalBudget, color: metricColors.budget })
    }
    if (chart1Metrics.includes('engineered')) {
      data.push({ name: 'Engagé', value: totalEngineered, color: metricColors.engineered })
    }
    if (chart1Metrics.includes('invoiced')) {
      data.push({ name: 'Facturé', value: totalInvoiced, color: metricColors.invoiced })
    }
    if (chart1Metrics.includes('remaining')) {
      data.push({ name: 'Disponible', value: Math.max(0, remaining), color: metricColors.remaining })
    }

    return data
  }, [totalBudget, totalEngineered, totalInvoiced, remaining, chart1Metrics])

  // Données pour le graphique 2 (par groupe)
  const chart2Data = useMemo(() => {
    const groups: { [key: string]: { budget: number; engineered: number; invoiced: number; remaining: number } } = {}

    yearlyData.forEach(line => {
      let groupName: string
      switch (chart2GroupBy) {
        case 'domain':
          groupName = line.domain?.name || 'Autre'
          break
        case 'type':
          groupName = line.type?.name || 'Autre'
          break
        case 'nature':
          groupName = line.nature || 'Autre'
          break
        default:
          groupName = 'Autre'
      }

      if (!groups[groupName]) {
        groups[groupName] = { budget: 0, engineered: 0, invoiced: 0, remaining: 0 }
      }
      groups[groupName].budget += line.budget
      groups[groupName].engineered += line.engineered
      groups[groupName].invoiced += line.invoiced
      groups[groupName].remaining += (line.budget - line.engineered)
    })

    return Object.entries(groups).map(([name, data]) => ({
      name,
      Budget: data.budget,
      Engagé: data.engineered,
      Facturé: data.invoiced,
      Disponible: data.remaining,
    }))
  }, [yearlyData, chart2GroupBy])

  // Fonction pour rendre le graphique 1
  const renderChart1 = () => {
    switch (chart1Type) {
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chart1Data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chart1Data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f8fafc' }}
              labelStyle={{ color: '#f8fafc' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Legend
              wrapperStyle={{ color: '#94a3b8' }}
              formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
            />
          </PieChart>
        )
      case 'bar':
        return (
          <BarChart data={chart1Data}>
            <XAxis dataKey="name" stroke="#64748b" />
            <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`} stroke="#64748b" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f8fafc' }}
              labelStyle={{ color: '#f8fafc' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chart1Data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        )
      case 'line':
        return (
          <LineChart data={chart1Data}>
            <XAxis dataKey="name" stroke="#64748b" />
            <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`} stroke="#64748b" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f8fafc' }}
              labelStyle={{ color: '#f8fafc' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4' }} />
          </LineChart>
        )
      case 'area':
        return (
          <AreaChart data={chart1Data}>
            <XAxis dataKey="name" stroke="#64748b" />
            <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`} stroke="#64748b" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f8fafc' }}
              labelStyle={{ color: '#f8fafc' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Area type="monotone" dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
          </AreaChart>
        )
    }
  }

  // Fonction pour rendre le graphique 2
  const renderChart2 = () => {
    const getDataKey = (metric: MetricType) => {
      return metricLabels[metric]
    }

    switch (chart2Type) {
      case 'bar':
        return (
          <BarChart data={chart2Data} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`} stroke="#64748b" />
            <YAxis type="category" dataKey="name" width={100} stroke="#64748b" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f8fafc' }}
              labelStyle={{ color: '#f8fafc' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            {chart2Metrics.map((metric) => (
              <Bar key={metric} dataKey={getDataKey(metric)} fill={metricColors[metric]} radius={[0, 4, 4, 0]} />
            ))}
          </BarChart>
        )
      case 'pie':
        // Pour le pie, on affiche la première métrique sélectionnée
        const pieMetric = chart2Metrics[0] || 'engineered'
        const pieChartData = chart2Data.map((item, index) => ({
          name: item.name,
          value: item[getDataKey(pieMetric) as keyof typeof item] as number,
          color: COLORS[index % COLORS.length],
        }))
        return (
          <PieChart>
            <Pie
              data={pieChartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {pieChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f8fafc' }}
              labelStyle={{ color: '#f8fafc' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Legend
              wrapperStyle={{ color: '#94a3b8' }}
              formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
            />
          </PieChart>
        )
      case 'line':
        return (
          <LineChart data={chart2Data}>
            <XAxis dataKey="name" stroke="#64748b" />
            <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`} stroke="#64748b" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f8fafc' }}
              labelStyle={{ color: '#f8fafc' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            {chart2Metrics.map((metric) => (
              <Line key={metric} type="monotone" dataKey={getDataKey(metric)} stroke={metricColors[metric]} strokeWidth={2} dot={{ fill: metricColors[metric] }} />
            ))}
            <Legend
              wrapperStyle={{ color: '#94a3b8' }}
              formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
            />
          </LineChart>
        )
      case 'area':
        return (
          <AreaChart data={chart2Data}>
            <XAxis dataKey="name" stroke="#64748b" />
            <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`} stroke="#64748b" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f8fafc' }}
              labelStyle={{ color: '#f8fafc' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            {chart2Metrics.map((metric) => (
              <Area key={metric} type="monotone" dataKey={getDataKey(metric)} stroke={metricColors[metric]} fill={metricColors[metric]} fillOpacity={0.3} />
            ))}
            <Legend
              wrapperStyle={{ color: '#94a3b8' }}
              formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
            />
          </AreaChart>
        )
    }
  }

  // Toggle metric for chart
  const toggleMetric = (chart: 1 | 2, metric: MetricType) => {
    if (chart === 1) {
      setChart1Metrics(prev =>
        prev.includes(metric)
          ? prev.filter(m => m !== metric)
          : [...prev, metric]
      )
    } else {
      setChart2Metrics(prev =>
        prev.includes(metric)
          ? prev.filter(m => m !== metric)
          : [...prev, metric]
      )
    }
  }

  // Alertes
  const alerts = useMemo(() => {
    const items: { type: 'warning' | 'danger' | 'info'; message: string; icon: any }[] = []

    // Contrats expirant dans les 30 jours
    const today = new Date()
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    const expiringContracts = contracts.filter(c => {
      const endDate = new Date(c.endDate)
      return c.status === 'Actif' && endDate <= in30Days && endDate >= today
    })
    if (expiringContracts.length > 0) {
      items.push({
        type: 'warning',
        message: `${expiringContracts.length} contrat(s) expire(nt) dans les 30 jours`,
        icon: Clock
      })
    }

    // Factures en retard
    const overdueInvoices = invoices.filter(i => i.status === 'Retard')
    if (overdueInvoices.length > 0) {
      items.push({
        type: 'danger',
        message: `${overdueInvoices.length} facture(s) en retard de paiement`,
        icon: FileWarning
      })
    }

    // Lignes budgétaires dépassées
    const overbudgetLines = allBudgetLines.filter(l => l.engineered > l.budget)
    if (overbudgetLines.length > 0) {
      items.push({
        type: 'danger',
        message: `${overbudgetLines.length} ligne(s) budgétaire(s) dépassée(s)`,
        icon: AlertTriangle
      })
    }

    // Factures en attente importantes (en tenant compte des avoirs)
    const pendingInvoices = invoices.filter(i => i.status === 'En attente')
    const totalPending = pendingInvoices.reduce((sum, i) => sum + (i.isCredit ? -i.amount : i.amount), 0)
    if (totalPending > 10000) {
      items.push({
        type: 'info',
        message: `${formatCurrency(totalPending)} en factures à traiter`,
        icon: Clock
      })
    }

    return items
  }, [contracts, invoices, allBudgetLines])

  const handleLineClick = (line: BudgetLine) => {
    setSelectedLine(line)
    setDetailOpen(true)
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-50">Vue Synthétique du Budget</h2>
            <p className="text-slate-400 mt-2">Suivi global des engagements et facturations par ligne budgétaire</p>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-cyan-400" />
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedNature} onValueChange={setSelectedNature}>
              <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-50">Tous</SelectItem>
                <SelectItem value="Fonctionnement" className="text-slate-50 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2"></span>
                  Fonctionnement
                </SelectItem>
                <SelectItem value="Investissement" className="text-slate-50">
                  <span className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-2"></span>
                  Investissement
                </SelectItem>
              </SelectContent>
            </Select>
            <ExportButtons year={selectedYear} />
          </div>
        </div>

        {/* Alerts Panel */}
        <AlertsPanel />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Budget */}
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6">
            <p className="text-sm font-medium uppercase tracking-wider text-slate-400">Budget Total {selectedYear}</p>
            <p className="text-3xl font-bold text-slate-50 mt-2">{formatCurrency(totalBudget)}</p>
            <div className="flex items-center gap-1 mt-2">
              {budgetVariation !== 0 && (
                <>
                  {budgetVariation > 0 ? (
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-400" />
                  )}
                  <span className={`text-xs font-medium ${budgetVariation > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {budgetVariation > 0 ? '+' : ''}{budgetVariation}%
                  </span>
                  <span className="text-xs text-slate-500">vs {selectedYear - 1}</span>
                </>
              )}
              {budgetVariation === 0 && <span className="text-xs text-slate-500">Année complète</span>}
            </div>
          </div>

          {/* Engagé */}
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6">
            <p className="text-sm font-medium uppercase tracking-wider text-slate-400">Engagé</p>
            <p className="text-3xl font-bold text-cyan-400 mt-2">{formatCurrency(totalEngineered)}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-cyan-400 font-semibold">{percentageUsed}%</span>
              <span className="text-xs text-slate-500">du budget</span>
              {engagedVariation !== 0 && (
                <span className={`text-xs ${engagedVariation > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ({engagedVariation > 0 ? '+' : ''}{engagedVariation}%)
                </span>
              )}
            </div>
          </div>

          {/* Facturé */}
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6">
            <p className="text-sm font-medium uppercase tracking-wider text-slate-400">Facturé</p>
            <p className="text-3xl font-bold text-blue-400 mt-2">{formatCurrency(totalInvoiced)}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-sm text-blue-400 font-semibold">{totalBudget > 0 ? Math.round((totalInvoiced / totalBudget) * 100) : 0}%</span>
              <span className="text-xs text-slate-500">du budget</span>
            </div>
          </div>

          {/* Reste */}
          <div className={`rounded-lg border bg-slate-900/50 p-6 ${remaining > 0 ? 'border-emerald-700' : 'border-red-700'}`}>
            <p className="text-sm font-medium uppercase tracking-wider text-slate-400">Disponible</p>
            <p className={`text-3xl font-bold mt-2 ${remaining > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(remaining)}</p>
            <p className="text-xs text-slate-500 mt-2">
              {remaining > 0 ? `${Math.round((remaining / totalBudget) * 100)}% en réserve` : 'Dépassement'}
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Nombre de contrats actifs</p>
            <p className="text-2xl font-bold text-slate-50 mt-1">{contracts.filter((c) => c.status === 'Actif').length}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Factures en attente</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{invoices.filter((i) => i.status === 'En attente').length}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Factures en retard</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{invoices.filter((i) => i.status === 'Retard').length}</p>
          </div>

          {/* Achats hors contrat */}
          <Link
            href="/factures?withoutContract=true"
            className="rounded-lg border border-amber-700/50 bg-amber-900/10 p-4 hover:bg-amber-900/20 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingBag className="h-4 w-4 text-amber-400" />
                  <p className="text-sm text-slate-400">Achats hors contrat</p>
                </div>
                <p className="text-2xl font-bold text-amber-400">{formatCurrency(adHocPurchases.total)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">{adHocPurchases.count} facture{adHocPurchases.count > 1 ? 's' : ''}</span>
                  {adHocPurchases.variation !== 0 && (
                    <>
                      {adHocPurchases.variation > 0 ? (
                        <TrendingUp className="h-3 w-3 text-amber-400" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-emerald-400" />
                      )}
                      <span className={`text-xs font-medium ${adHocPurchases.variation > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {adHocPurchases.variation > 0 ? '+' : ''}{adHocPurchases.variation}%
                      </span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-amber-400 transition-colors" />
            </div>
          </Link>
        </div>

        {/* Alertes */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-50">Alertes</h3>
            <div className="space-y-2">
              {alerts.map((alert, index) => {
                const Icon = alert.icon
                const bgColor = alert.type === 'danger' ? 'bg-red-900/30 border-red-700' :
                               alert.type === 'warning' ? 'bg-amber-900/30 border-amber-700' :
                               'bg-blue-900/30 border-blue-700'
                const textColor = alert.type === 'danger' ? 'text-red-400' :
                                 alert.type === 'warning' ? 'text-amber-400' :
                                 'text-blue-400'
                return (
                  <div key={index} className={`flex items-center gap-3 p-3 rounded-lg border ${bgColor}`}>
                    <Icon className={`h-5 w-5 ${textColor}`} />
                    <span className={`text-sm ${textColor}`}>{alert.message}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Graphique Comparatif Multi-Années */}
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-50">
                Analyse Comparative des Dépenses
                {compareFilter.type !== 'all' && compareFilter.value && (
                  <span className="text-sm font-normal text-cyan-400 ml-2">
                    - {compareFilter.value}
                  </span>
                )}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCompareSettings(!showCompareSettings)}
                className={showCompareSettings ? 'bg-slate-800' : ''}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filtres
              </Button>
            </div>

            {showCompareSettings && (
              <div className="p-4 bg-slate-800/50 rounded-lg space-y-4">
                {/* Sélection des années */}
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Années à comparer</label>
                  <div className="flex flex-wrap gap-2">
                    {availableYears.map(year => (
                      <Button
                        key={year}
                        size="sm"
                        variant={compareYears.includes(year) ? 'default' : 'outline'}
                        onClick={() => toggleCompareYear(year)}
                        style={compareYears.includes(year) ? { backgroundColor: YEAR_COLORS[year] } : {}}
                        className="min-w-[60px]"
                      >
                        {year}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Filtrer par */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Filtrer par</label>
                    <Select
                      value={compareFilter.type}
                      onValueChange={(v) => setCompareFilter({ type: v as typeof compareFilter.type, value: '' })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tout le budget</SelectItem>
                        <SelectItem value="domain">Par Domaine</SelectItem>
                        <SelectItem value="type">Par Type</SelectItem>
                        <SelectItem value="vendor">Par Fournisseur</SelectItem>
                        <SelectItem value="label">Par Ligne budgétaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {compareFilter.type !== 'all' && (
                    <div>
                      <label className="text-xs text-slate-400 mb-2 block">
                        {compareFilter.type === 'domain' && 'Domaine'}
                        {compareFilter.type === 'type' && 'Type'}
                        {compareFilter.type === 'vendor' && 'Fournisseur'}
                        {compareFilter.type === 'label' && 'Ligne budgétaire'}
                      </label>
                      <Select
                        value={compareFilter.value}
                        onValueChange={(v) => setCompareFilter(prev => ({ ...prev, value: v }))}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filterOptions[compareFilter.type]?.map((option) => (
                            <SelectItem key={option} value={option as string}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Reset filters */}
                {(compareFilter.type !== 'all' || compareYears.length > 1) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCompareFilter({ type: 'all', value: '' })
                      setCompareYears([currentYear])
                    }}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Réinitialiser les filtres
                  </Button>
                )}
              </div>
            )}

            {/* Légende des années */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {compareYears.map(year => {
                const yearData = compareData[11] // Décembre pour avoir le total
                const budget = yearData?.[`Budget ${year}`] as number || 0
                const engaged = yearData?.[`Engagé ${year}`] as number || 0
                return (
                  <div key={year} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: YEAR_COLORS[year] }}
                    />
                    <span className="text-slate-300 font-medium">{year}</span>
                    <span className="text-slate-500">
                      Budget: {formatCurrency(budget)} | Engagé: {formatCurrency(engaged)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={compareData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis
                  tickFormatter={(v) => {
                    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M€`
                    return `${(v / 1000).toFixed(0)}k€`
                  }}
                  stroke="#64748b"
                  fontSize={11}
                  domain={[0, (dataMax: number) => {
                    // Trouver le budget max parmi les années sélectionnées
                    const maxBudget = Math.max(...compareYears.map(year =>
                      (compareData[0]?.[`Budget ${year}`] as number) || 0
                    ))
                    const maxValue = Math.max(dataMax, maxBudget)
                    // Arrondir à un palier propre (250k, 500k, 750k, 1M, 1.25M, etc.)
                    const step = maxValue > 1000000 ? 250000 : maxValue > 500000 ? 100000 : 50000
                    return Math.ceil(maxValue * 1.1 / step) * step
                  }]}
                  ticks={(() => {
                    // Générer des ticks propres
                    const maxBudget = Math.max(...compareYears.map(year =>
                      (compareData[0]?.[`Budget ${year}`] as number) || 0
                    ))
                    if (maxBudget > 750000) return [0, 250000, 500000, 750000, 1000000]
                    if (maxBudget > 500000) return [0, 200000, 400000, 600000, 800000]
                    return [0, 100000, 200000, 300000, 400000, 500000]
                  })()}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                {/* Lignes de budget (horizontales en pointillés) */}
                {compareYears.map(year => (
                  <ReferenceLine
                    key={`budget-${year}`}
                    y={compareData[0]?.[`Budget ${year}`] as number || 0}
                    stroke={YEAR_COLORS[year]}
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    strokeOpacity={1}
                    label={{
                      value: `Budget Prévu ${year}: ${formatCurrency(compareData[0]?.[`Budget ${year}`] as number || 0)}`,
                      position: 'insideTopRight',
                      fill: YEAR_COLORS[year],
                      fontSize: 11,
                      fontWeight: 'bold',
                    }}
                  />
                ))}
                {/* Aires pour l'engagé cumulé */}
                {compareYears.map((year, index) => (
                  <Area
                    key={`engaged-${year}`}
                    type="monotone"
                    dataKey={`Engagé ${year}`}
                    stroke={YEAR_COLORS[year]}
                    fill={YEAR_COLORS[year]}
                    fillOpacity={0.2 + (index * 0.05)}
                    strokeWidth={2.5}
                  />
                ))}
                <Legend
                  wrapperStyle={{ color: '#94a3b8', fontSize: '11px' }}
                  formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphiques personnalisables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graphique 1 - Vue globale */}
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-50">Vue Globale du Budget</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChart1Settings(!showChart1Settings)}
                className={showChart1Settings ? 'bg-slate-800' : ''}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>

            {showChart1Settings && (
              <div className="mb-4 p-3 bg-slate-800/50 rounded-lg space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Type de graphique</label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={chart1Type === 'pie' ? 'default' : 'outline'}
                      onClick={() => setChart1Type('pie')}
                      className="flex-1"
                    >
                      <PieChartIcon className="h-3 w-3 mr-1" />
                      Donut
                    </Button>
                    <Button
                      size="sm"
                      variant={chart1Type === 'bar' ? 'default' : 'outline'}
                      onClick={() => setChart1Type('bar')}
                      className="flex-1"
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Barres
                    </Button>
                    <Button
                      size="sm"
                      variant={chart1Type === 'line' ? 'default' : 'outline'}
                      onClick={() => setChart1Type('line')}
                      className="flex-1"
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Ligne
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Métriques à afficher</label>
                  <div className="flex flex-wrap gap-1">
                    {(['budget', 'engineered', 'invoiced', 'remaining'] as MetricType[]).map((metric) => (
                      <Button
                        key={metric}
                        size="sm"
                        variant={chart1Metrics.includes(metric) ? 'default' : 'outline'}
                        onClick={() => toggleMetric(1, metric)}
                        className="text-xs"
                        style={chart1Metrics.includes(metric) ? { backgroundColor: metricColors[metric] } : {}}
                      >
                        {metricLabels[metric]}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart1()}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graphique 2 - Par groupe */}
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-50">Analyse par Catégorie</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChart2Settings(!showChart2Settings)}
                className={showChart2Settings ? 'bg-slate-800' : ''}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>

            {showChart2Settings && (
              <div className="mb-4 p-3 bg-slate-800/50 rounded-lg space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Type de graphique</label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={chart2Type === 'bar' ? 'default' : 'outline'}
                      onClick={() => setChart2Type('bar')}
                      className="flex-1"
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Barres
                    </Button>
                    <Button
                      size="sm"
                      variant={chart2Type === 'pie' ? 'default' : 'outline'}
                      onClick={() => setChart2Type('pie')}
                      className="flex-1"
                    >
                      <PieChartIcon className="h-3 w-3 mr-1" />
                      Donut
                    </Button>
                    <Button
                      size="sm"
                      variant={chart2Type === 'line' ? 'default' : 'outline'}
                      onClick={() => setChart2Type('line')}
                      className="flex-1"
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Ligne
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Grouper par</label>
                  <Select value={chart2GroupBy} onValueChange={(v) => setChart2GroupBy(v as GroupByType)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="domain">Domaine</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                      <SelectItem value="nature">Nature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Métriques à afficher</label>
                  <div className="flex flex-wrap gap-1">
                    {(['budget', 'engineered', 'invoiced', 'remaining'] as MetricType[]).map((metric) => (
                      <Button
                        key={metric}
                        size="sm"
                        variant={chart2Metrics.includes(metric) ? 'default' : 'outline'}
                        onClick={() => toggleMetric(2, metric)}
                        className="text-xs"
                        style={chart2Metrics.includes(metric) ? { backgroundColor: metricColors[metric] } : {}}
                      >
                        {metricLabels[metric]}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart2()}
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detail by Budget Line */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-50">Détail par Ligne Budgétaire - {selectedYear}</h3>
          <div className="space-y-3">
            {yearlyData.map((line) => {
              const budgetPct = line.budget > 0 ? (line.engineered / line.budget) * 100 : 0
              const remainingBudget = line.budget - line.engineered
              const isOverbudget = line.engineered > line.budget

              return (
                <button
                  key={line.id}
                  onClick={() => handleLineClick(line)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/50 p-4 hover:border-cyan-600/50 hover:bg-slate-900 transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-50">{line.label}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {line.type.name} • {line.domain.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-50">{formatCurrency(line.budget)}</p>
                      <p className="text-xs text-slate-400 mt-1">{line.type.name}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-500 ml-4 flex-shrink-0" />
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-400">Engagé</span>
                          <span className={`text-xs font-semibold ${isOverbudget ? 'text-red-400' : 'text-cyan-400'}`}>
                            {formatCurrency(line.engineered)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getProgressColor(budgetPct)}`}
                            style={{ width: `${Math.min(budgetPct, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {budgetPct.toFixed(1)}% • {formatCurrency(remainingBudget)} restant
                        </p>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs text-slate-400">Facturé</div>
                        <div className="text-sm font-semibold text-blue-400">{formatCurrency(line.invoiced)}</div>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      <BudgetLineDetailDrawer line={selectedLine} open={detailOpen} onOpenChange={setDetailOpen} />
    </MainLayout>
  )
}
