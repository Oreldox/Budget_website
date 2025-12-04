'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Settings2, GripVertical, BarChart3, PieChartIcon, TrendingUp, AreaChartIcon, Calendar, RotateCcw, Palette, SlidersHorizontal, Eye, Square, RectangleVertical, RectangleHorizontal, Maximize, LayoutGrid, Filter, Gauge, Download, Image, FileSpreadsheet, FileText, LayoutTemplate, X, Maximize2, Save, FolderOpen, ArrowUp, ArrowDown } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, CartesianGrid, Treemap, FunnelChart, Funnel, LabelList, ReferenceLine, Brush } from 'recharts'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useContracts, useInvoices } from '@/lib/hooks'
import { useGlobalData } from '@/lib/data-context'
import { useToast } from '@/components/ui/toast'

type ChartType = 'pie' | 'bar' | 'line' | 'area' | 'horizontal-bar' | 'stacked-bar' | 'radar' | 'treemap' | 'funnel' | 'gauge' | 'kpi'
type DataSource = 'budget' | 'invoices' | 'contracts'
type MetricType = 'budget' | 'engineered' | 'invoiced' | 'remaining' | 'count' | 'amount'
type GroupByType = 'domain' | 'type' | 'nature' | 'status' | 'vendor' | 'month' | 'quarter' | 'year'
type SortType = 'name-asc' | 'name-desc' | 'value-asc' | 'value-desc' | 'none'
type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max'
type WidgetSize = 'small' | 'medium' | 'large' | 'full'

const sizeConfig: Record<WidgetSize, { cols: number; height: string; label: string }> = {
  small: { cols: 1, height: 'h-48', label: 'Petit' },
  medium: { cols: 1, height: 'h-72', label: 'Moyen' },
  large: { cols: 2, height: 'h-48', label: 'Large' },
  full: { cols: 2, height: 'h-72', label: 'Plein' },
}

const sizeOrder: WidgetSize[] = ['small', 'medium', 'large', 'full']

interface WidgetConfig {
  id: string
  title: string
  chartType: ChartType
  dataSource: DataSource
  groupBy: GroupByType
  metrics: MetricType[]
  size: WidgetSize
  // Legacy support - will be converted to size
  width?: 1 | 2
  height?: 1 | 2
  // Advanced options
  showLegend: boolean
  showGrid: boolean
  showValues: boolean
  sortBy: SortType
  limit: number
  aggregation: AggregationType
  colorScheme: string
  // New options
  showTarget?: boolean
  targetValue?: number
  showComparison?: boolean
  comparisonPeriod?: 'N-1' | 'N-2'
  showTrend?: boolean
  enableZoom?: boolean
  annotations?: { value: number; label: string; color: string }[]
  // Filters
  filterStatus?: string
  filterVendor?: string
  filterDomain?: string
  filterType?: string
  filterNature?: string
}

interface GlobalFilters {
  year: string
  dateFrom: string
  dateTo: string
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
}

const COLOR_SCHEMES: Record<string, string[]> = {
  default: ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
  ocean: ['#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#a3e635', '#d9f99d'],
  sunset: ['#f97316', '#fb923c', '#fbbf24', '#facc15', '#fde047', '#fef08a', '#fef9c3', '#fefce8'],
  purple: ['#a855f7', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#3b0764', '#581c87'],
  monochrome: ['#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b'],
  contrast: ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'],
}

const metricLabels: Record<MetricType, string> = {
  budget: 'Budget',
  engineered: 'Engagé',
  invoiced: 'Facturé',
  remaining: 'Disponible',
  count: 'Nombre',
  amount: 'Montant',
}

const metricColors: Record<MetricType, string> = {
  budget: '#f59e0b',
  engineered: '#06b6d4',
  invoiced: '#3b82f6',
  remaining: '#10b981',
  count: '#8b5cf6',
  amount: '#ec4899',
}

const groupByLabels: Record<GroupByType, string> = {
  domain: 'Domaine',
  type: 'Type',
  nature: 'Nature',
  status: 'Statut',
  vendor: 'Fournisseur',
  month: 'Mois',
  quarter: 'Trimestre',
  year: 'Année',
}

const sortLabels: Record<SortType, string> = {
  'none': 'Aucun',
  'name-asc': 'Nom (A-Z)',
  'name-desc': 'Nom (Z-A)',
  'value-asc': 'Valeur (croissant)',
  'value-desc': 'Valeur (décroissant)',
}

const aggregationLabels: Record<AggregationType, string> = {
  sum: 'Somme',
  avg: 'Moyenne',
  count: 'Nombre',
  min: 'Minimum',
  max: 'Maximum',
}

const STORAGE_KEY = 'dsi-budget-rapports-widgets'
const FILTERS_STORAGE_KEY = 'dsi-budget-rapports-filters'
const CUSTOM_VIEWS_KEY = 'dsi-budget-rapports-custom-views'

interface CustomView {
  id: string
  name: string
  description: string
  widgets: WidgetConfig[]
  createdAt: string
}

const defaultWidgets: WidgetConfig[] = [
  // Vue d'ensemble Budget - Large
  {
    id: '1',
    title: 'Consommation Budget par Domaine',
    chartType: 'horizontal-bar',
    dataSource: 'budget',
    groupBy: 'domain',
    metrics: ['budget', 'engineered', 'invoiced'],
    size: 'large',
    showLegend: true,
    showGrid: true,
    showValues: false,
    sortBy: 'value-desc',
    limit: 8,
    aggregation: 'sum',
    colorScheme: 'default',
  },
  // Répartition Investissement vs Fonctionnement
  {
    id: '2',
    title: 'Répartition par Nature',
    chartType: 'pie',
    dataSource: 'budget',
    groupBy: 'nature',
    metrics: ['budget'],
    size: 'small',
    showLegend: true,
    showGrid: false,
    showValues: true,
    sortBy: 'value-desc',
    limit: 10,
    aggregation: 'sum',
    colorScheme: 'contrast',
  },
  // Taux d'engagement par Type
  {
    id: '3',
    title: 'Engagement par Type',
    chartType: 'bar',
    dataSource: 'budget',
    groupBy: 'type',
    metrics: ['engineered', 'remaining'],
    size: 'small',
    showLegend: true,
    showGrid: true,
    showValues: false,
    sortBy: 'value-desc',
    limit: 6,
    aggregation: 'sum',
    colorScheme: 'ocean',
  },
  // Top Fournisseurs Factures
  {
    id: '4',
    title: 'Top 10 Fournisseurs (Factures)',
    chartType: 'horizontal-bar',
    dataSource: 'invoices',
    groupBy: 'vendor',
    metrics: ['amount'],
    size: 'medium',
    showLegend: false,
    showGrid: true,
    showValues: false,
    sortBy: 'value-desc',
    limit: 10,
    aggregation: 'sum',
    colorScheme: 'sunset',
  },
  // Statut des Factures
  {
    id: '5',
    title: 'Statut des Factures',
    chartType: 'pie',
    dataSource: 'invoices',
    groupBy: 'status',
    metrics: ['amount'],
    size: 'small',
    showLegend: true,
    showGrid: false,
    showValues: true,
    sortBy: 'value-desc',
    limit: 10,
    aggregation: 'sum',
    colorScheme: 'contrast',
  },
  // Evolution mensuelle Factures
  {
    id: '6',
    title: 'Evolution Mensuelle Factures',
    chartType: 'area',
    dataSource: 'invoices',
    groupBy: 'month',
    metrics: ['amount'],
    size: 'large',
    showLegend: false,
    showGrid: true,
    showValues: false,
    sortBy: 'none',
    limit: 12,
    aggregation: 'sum',
    colorScheme: 'ocean',
  },
  // Contrats par Statut
  {
    id: '7',
    title: 'Contrats par Statut',
    chartType: 'pie',
    dataSource: 'contracts',
    groupBy: 'status',
    metrics: ['count'],
    size: 'small',
    showLegend: true,
    showGrid: false,
    showValues: true,
    sortBy: 'value-desc',
    limit: 10,
    aggregation: 'count',
    colorScheme: 'purple',
  },
  // Top Fournisseurs Contrats
  {
    id: '8',
    title: 'Top 5 Fournisseurs (Contrats)',
    chartType: 'bar',
    dataSource: 'contracts',
    groupBy: 'vendor',
    metrics: ['amount'],
    size: 'small',
    showLegend: false,
    showGrid: true,
    showValues: false,
    sortBy: 'value-desc',
    limit: 5,
    aggregation: 'sum',
    colorScheme: 'default',
  },
  // Comparaison Budget/Engagé/Facturé par Domaine - Radar
  {
    id: '9',
    title: 'Performance par Domaine',
    chartType: 'radar',
    dataSource: 'budget',
    groupBy: 'domain',
    metrics: ['budget', 'engineered', 'invoiced'],
    size: 'medium',
    showLegend: true,
    showGrid: true,
    showValues: false,
    sortBy: 'value-desc',
    limit: 6,
    aggregation: 'sum',
    colorScheme: 'default',
  },
  // Nombre de factures par mois
  {
    id: '10',
    title: 'Volume Factures par Mois',
    chartType: 'line',
    dataSource: 'invoices',
    groupBy: 'month',
    metrics: ['count'],
    size: 'medium',
    showLegend: false,
    showGrid: true,
    showValues: false,
    sortBy: 'none',
    limit: 12,
    aggregation: 'count',
    colorScheme: 'ocean',
  },
]

// Templates prédéfinis
const widgetTemplates: Record<string, { name: string; description: string; widgets: WidgetConfig[] }> = {
  financial: {
    name: 'Vue Financière',
    description: 'Focus sur les budgets, engagements et facturations',
    widgets: [
      { id: 't1', title: 'Budget vs Engagé par Domaine', chartType: 'horizontal-bar', dataSource: 'budget', groupBy: 'domain', metrics: ['budget', 'engineered'], size: 'large', showLegend: true, showGrid: true, showValues: false, sortBy: 'value-desc', limit: 8, aggregation: 'sum', colorScheme: 'default' },
      { id: 't2', title: 'Répartition Budget par Nature', chartType: 'pie', dataSource: 'budget', groupBy: 'nature', metrics: ['budget'], size: 'small', showLegend: true, showGrid: false, showValues: true, sortBy: 'value-desc', limit: 10, aggregation: 'sum', colorScheme: 'contrast' },
      { id: 't3', title: 'Taux Consommation par Type', chartType: 'gauge', dataSource: 'budget', groupBy: 'type', metrics: ['invoiced'], size: 'small', showLegend: false, showGrid: false, showValues: true, sortBy: 'value-desc', limit: 6, aggregation: 'sum', colorScheme: 'ocean' },
      { id: 't4', title: 'Evolution Facturation Mensuelle', chartType: 'area', dataSource: 'invoices', groupBy: 'month', metrics: ['amount'], size: 'full', showLegend: false, showGrid: true, showValues: false, sortBy: 'none', limit: 12, aggregation: 'sum', colorScheme: 'ocean' },
    ]
  },
  operational: {
    name: 'Vue Opérationnelle',
    description: 'Focus sur les contrats et fournisseurs',
    widgets: [
      { id: 't5', title: 'Top 10 Fournisseurs', chartType: 'horizontal-bar', dataSource: 'invoices', groupBy: 'vendor', metrics: ['amount'], size: 'large', showLegend: false, showGrid: true, showValues: false, sortBy: 'value-desc', limit: 10, aggregation: 'sum', colorScheme: 'sunset' },
      { id: 't6', title: 'Contrats par Statut', chartType: 'pie', dataSource: 'contracts', groupBy: 'status', metrics: ['count'], size: 'small', showLegend: true, showGrid: false, showValues: true, sortBy: 'value-desc', limit: 10, aggregation: 'count', colorScheme: 'purple' },
      { id: 't7', title: 'Factures par Statut', chartType: 'pie', dataSource: 'invoices', groupBy: 'status', metrics: ['amount'], size: 'small', showLegend: true, showGrid: false, showValues: true, sortBy: 'value-desc', limit: 10, aggregation: 'sum', colorScheme: 'contrast' },
      { id: 't8', title: 'Volume Contrats par Type', chartType: 'bar', dataSource: 'contracts', groupBy: 'type', metrics: ['amount'], size: 'large', showLegend: false, showGrid: true, showValues: false, sortBy: 'value-desc', limit: 8, aggregation: 'sum', colorScheme: 'default' },
    ]
  },
  executive: {
    name: 'Vue Direction',
    description: 'Synthèse pour reporting direction',
    widgets: [
      { id: 't9', title: 'Performance Globale par Domaine', chartType: 'radar', dataSource: 'budget', groupBy: 'domain', metrics: ['budget', 'engineered', 'invoiced'], size: 'large', showLegend: true, showGrid: true, showValues: false, sortBy: 'value-desc', limit: 6, aggregation: 'sum', colorScheme: 'default' },
      { id: 't10', title: 'Répartition Invest/Fonct', chartType: 'pie', dataSource: 'budget', groupBy: 'nature', metrics: ['budget'], size: 'small', showLegend: true, showGrid: false, showValues: true, sortBy: 'value-desc', limit: 2, aggregation: 'sum', colorScheme: 'contrast' },
      { id: 't11', title: 'Treemap Budget par Domaine', chartType: 'treemap', dataSource: 'budget', groupBy: 'domain', metrics: ['budget'], size: 'large', showLegend: false, showGrid: false, showValues: false, sortBy: 'value-desc', limit: 10, aggregation: 'sum', colorScheme: 'ocean' },
    ]
  },
}

// Helper to convert legacy width/height to size
function getWidgetSize(widget: WidgetConfig): WidgetSize {
  if (widget.size) return widget.size
  // Legacy conversion
  if (widget.width === 2 && widget.height === 2) return 'full'
  if (widget.width === 2) return 'large'
  if (widget.height === 2) return 'medium'
  return 'small'
}

export default function RapportsPage() {
  const { contracts } = useContracts()
  const { invoices } = useInvoices()
  const { allBudgetLines, domains, types } = useGlobalData()
  const toast = useToast()

  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  const currentYear = new Date().getFullYear()
  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>({
    year: 'all',
    dateFrom: '',
    dateTo: '',
  })

  // Get unique values for filters
  const uniqueVendors = useMemo(() => {
    const vendors = new Set<string>()
    invoices.forEach(inv => vendors.add(inv.vendor))
    contracts.forEach(c => vendors.add(c.vendor))
    return Array.from(vendors).sort()
  }, [invoices, contracts])

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>()
    invoices.forEach(inv => statuses.add(inv.status))
    contracts.forEach(c => statuses.add(c.status))
    return Array.from(statuses).sort()
  }, [invoices, contracts])

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    invoices.forEach(inv => {
      const date = new Date(inv.invoiceDate)
      if (!isNaN(date.getTime())) years.add(date.getFullYear())
    })
    contracts.forEach(c => {
      const startDate = new Date(c.startDate)
      if (!isNaN(startDate.getTime())) years.add(startDate.getFullYear())
    })
    years.add(currentYear)
    years.add(currentYear - 1)
    years.add(currentYear + 1)
    return Array.from(years).sort((a, b) => b - a)
  }, [invoices, contracts, currentYear])

  useEffect(() => {
    try {
      const savedWidgets = localStorage.getItem(STORAGE_KEY)
      const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY)
      if (savedWidgets) {
        const parsed = JSON.parse(savedWidgets)
        // Ensure all widgets have new properties and fix single-metric chart types
        const singleMetricTypes = ['pie', 'treemap', 'funnel', 'gauge', 'kpi']
        const updated = parsed.map((w: any) => {
          const widget = {
            ...w,
            showLegend: w.showLegend ?? true,
            showGrid: w.showGrid ?? true,
            showValues: w.showValues ?? false,
            sortBy: w.sortBy ?? 'none',
            limit: w.limit ?? 10,
            aggregation: w.aggregation ?? 'sum',
            colorScheme: w.colorScheme ?? 'default',
          }
          // Force single metric for chart types that only support one
          if (singleMetricTypes.includes(widget.chartType) && widget.metrics?.length > 1) {
            widget.metrics = [widget.metrics[0]]
          }
          return widget
        })
        setWidgets(updated)
      } else {
        setWidgets(defaultWidgets)
      }
      if (savedFilters) {
        setGlobalFilters(JSON.parse(savedFilters))
      }
      // Load custom views
      const savedViews = localStorage.getItem(CUSTOM_VIEWS_KEY)
      if (savedViews) {
        setCustomViews(JSON.parse(savedViews))
      }
    } catch (error) {
      console.error('Error loading saved config:', error)
      setWidgets(defaultWidgets)
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets))
      } catch (error) {
        console.error('Error saving widgets:', error)
      }
    }
  }, [widgets, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(globalFilters))
      } catch (error) {
        console.error('Error saving filters:', error)
      }
    }
  }, [globalFilters, isLoaded])

  const [editingWidget, setEditingWidget] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'data' | 'style' | 'filter'>('data')
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null)
  const [exportMenuWidget, setExportMenuWidget] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [fullscreenWidget, setFullscreenWidget] = useState<string | null>(null)
  const [customViews, setCustomViews] = useState<CustomView[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const [newViewDescription, setNewViewDescription] = useState('')

  // Load template
  const loadTemplate = (templateKey: string) => {
    const template = widgetTemplates[templateKey]
    if (template) {
      // Generate unique IDs for template widgets
      const newWidgets = template.widgets.map(w => ({
        ...w,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      }))
      setWidgets(newWidgets)
      setShowTemplates(false)
      toast.success(`Template "${template.name}" chargé`)
    }
  }

  // Custom views management
  const saveCustomView = () => {
    if (!newViewName.trim()) {
      toast.error('Veuillez entrer un nom pour la vue')
      return
    }

    const newView: CustomView = {
      id: Date.now().toString(),
      name: newViewName.trim(),
      description: newViewDescription.trim(),
      widgets: widgets.map(w => ({ ...w })),
      createdAt: new Date().toISOString(),
    }

    const updatedViews = [...customViews, newView]
    setCustomViews(updatedViews)
    localStorage.setItem(CUSTOM_VIEWS_KEY, JSON.stringify(updatedViews))

    setShowSaveModal(false)
    setNewViewName('')
    setNewViewDescription('')
    toast.success(`Vue "${newView.name}" sauvegardée`)
  }

  const loadCustomView = (view: CustomView) => {
    const newWidgets = view.widgets.map(w => ({
      ...w,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    }))
    setWidgets(newWidgets)
    setShowTemplates(false)
    toast.success(`Vue "${view.name}" chargée`)
  }

  const deleteCustomView = (viewId: string) => {
    const view = customViews.find(v => v.id === viewId)
    const updatedViews = customViews.filter(v => v.id !== viewId)
    setCustomViews(updatedViews)
    localStorage.setItem(CUSTOM_VIEWS_KEY, JSON.stringify(updatedViews))
    toast.success(`Vue "${view?.name}" supprimée`)
  }

  // Export functions
  const exportWidgetToPNG = async (widgetId: string, title: string) => {
    const element = document.getElementById(`widget-${widgetId}`)
    if (!element) return

    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(element, {
        backgroundColor: '#0f172a',
        scale: 2,
      })
      const link = document.createElement('a')
      link.download = `${title.replace(/\s+/g, '_')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('Image exportée')
    } catch (error) {
      console.error('Export PNG error:', error)
      toast.error('Erreur lors de l\'export PNG')
    }
    setExportMenuWidget(null)
  }

  const exportWidgetToExcel = (widget: WidgetConfig) => {
    const data = getWidgetData(widget)
    if (data.length === 0) {
      toast.error('Aucune donnée à exporter')
      return
    }

    // Préparer les données
    const exportData = data.map(item => {
      const row: any = { Nom: item.name }
      widget.metrics.forEach(metric => {
        row[metricLabels[metric]] = item[metric]
      })
      return row
    })

    // Créer CSV
    const headers = Object.keys(exportData[0])
    const csvContent = [
      headers.join(';'),
      ...exportData.map(row => headers.map(h => row[h]).join(';'))
    ].join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${widget.title.replace(/\s+/g, '_')}.csv`
    link.click()
    toast.success('Données exportées en CSV')
    setExportMenuWidget(null)
  }

  const exportWidgetToPDF = async (widgetId: string, title: string) => {
    const element = document.getElementById(`widget-${widgetId}`)
    if (!element) return

    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(element, {
        backgroundColor: '#0f172a',
        scale: 2,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save(`${title.replace(/\s+/g, '_')}.pdf`)
      toast.success('PDF exporté')
    } catch (error) {
      console.error('Export PDF error:', error)
      toast.error('Erreur lors de l\'export PDF')
    }
    setExportMenuWidget(null)
  }

  const filterByDate = (data: any[], dateField: string) => {
    return data.filter(item => {
      const date = new Date(item[dateField])
      if (isNaN(date.getTime())) return true
      if (globalFilters.year && globalFilters.year !== 'all') {
        if (date.getFullYear() !== parseInt(globalFilters.year)) return false
      }
      if (globalFilters.dateFrom) {
        const fromDate = new Date(globalFilters.dateFrom)
        if (date < fromDate) return false
      }
      if (globalFilters.dateTo) {
        const toDate = new Date(globalFilters.dateTo)
        if (date > toDate) return false
      }
      return true
    })
  }

  const getWidgetData = (widget: WidgetConfig) => {
    let sourceData: any[] = []

    switch (widget.dataSource) {
      case 'budget':
        sourceData = [...allBudgetLines]
        break
      case 'invoices':
        sourceData = filterByDate(invoices, 'invoiceDate')
        break
      case 'contracts':
        sourceData = filterByDate(contracts, 'startDate')
        break
    }

    // Apply widget-specific filters
    if (widget.filterStatus) {
      sourceData = sourceData.filter(item => item.status === widget.filterStatus)
    }
    if (widget.filterVendor) {
      sourceData = sourceData.filter(item => item.vendor === widget.filterVendor)
    }
    if (widget.filterDomain && widget.dataSource === 'budget') {
      sourceData = sourceData.filter(item => item.domain?.id === widget.filterDomain)
    }
    if (widget.filterType) {
      sourceData = sourceData.filter(item => item.type?.id === widget.filterType)
    }
    if (widget.filterNature) {
      sourceData = sourceData.filter(item => item.nature === widget.filterNature)
    }

    // Group data
    const groups: { [key: string]: any } = {}

    sourceData.forEach(item => {
      let groupKey: string

      switch (widget.groupBy) {
        case 'domain':
          groupKey = item.domain?.name || 'Autre'
          break
        case 'type':
          groupKey = item.type?.name || 'Autre'
          break
        case 'nature':
          groupKey = item.nature || 'Autre'
          break
        case 'status':
          groupKey = item.status || 'Autre'
          break
        case 'vendor':
          groupKey = item.vendor || 'Autre'
          break
        case 'month':
          const dateM = new Date(item.invoiceDate || item.startDate || item.createdAt)
          groupKey = dateM.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
          break
        case 'quarter':
          const dateQ = new Date(item.invoiceDate || item.startDate || item.createdAt)
          const quarter = Math.floor(dateQ.getMonth() / 3) + 1
          groupKey = `T${quarter} ${dateQ.getFullYear()}`
          break
        case 'year':
          const dateY = new Date(item.invoiceDate || item.startDate || item.createdAt)
          groupKey = dateY.getFullYear().toString()
          break
        default:
          groupKey = 'Autre'
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: groupKey,
          budget: [],
          engineered: [],
          invoiced: [],
          remaining: [],
          count: 0,
          amount: [],
        }
      }

      groups[groupKey].count += 1

      if (widget.dataSource === 'budget') {
        groups[groupKey].budget.push(item.budget || 0)
        groups[groupKey].engineered.push(item.engineered || 0)
        groups[groupKey].invoiced.push(item.invoiced || 0)
        groups[groupKey].remaining.push((item.budget || 0) - (item.engineered || 0))
        groups[groupKey].amount.push(item.budget || 0)
      } else if (widget.dataSource === 'invoices') {
        groups[groupKey].amount.push(item.amount || 0)
        groups[groupKey].invoiced.push(item.amount || 0)
      } else if (widget.dataSource === 'contracts') {
        groups[groupKey].amount.push(item.amount || 0)
      }
    })

    // Apply aggregation
    const aggregate = (values: number[]) => {
      if (values.length === 0) return 0
      switch (widget.aggregation) {
        case 'sum':
          return values.reduce((a, b) => a + b, 0)
        case 'avg':
          return values.reduce((a, b) => a + b, 0) / values.length
        case 'count':
          return values.length
        case 'min':
          return Math.min(...values)
        case 'max':
          return Math.max(...values)
        default:
          return values.reduce((a, b) => a + b, 0)
      }
    }

    let result = Object.values(groups).map((g: any) => ({
      name: g.name,
      budget: aggregate(g.budget),
      engineered: aggregate(g.engineered),
      invoiced: aggregate(g.invoiced),
      remaining: aggregate(g.remaining),
      count: g.count,
      amount: aggregate(g.amount),
    }))

    // Apply sorting
    if (widget.sortBy !== 'none') {
      const metric = widget.metrics[0] || 'amount'
      result.sort((a, b) => {
        switch (widget.sortBy) {
          case 'name-asc':
            return a.name.localeCompare(b.name)
          case 'name-desc':
            return b.name.localeCompare(a.name)
          case 'value-asc':
            return a[metric] - b[metric]
          case 'value-desc':
            return b[metric] - a[metric]
          default:
            return 0
        }
      })
    }

    // Apply limit
    if (widget.limit > 0 && result.length > widget.limit) {
      result = result.slice(0, widget.limit)
    }

    return result
  }

  const renderChart = (widget: WidgetConfig, data: any[]) => {
    const colors = COLOR_SCHEMES[widget.colorScheme] || COLOR_SCHEMES.default
    const getDataKey = (metric: MetricType) => metric

    const commonTooltipProps = {
      formatter: (value: number, name: string) => {
        // Si la métrique est "count" ou si le nom est "count", afficher comme nombre
        const isCountMetric = name === 'count' || widget.metrics.every(m => m === 'count')
        return [
          isCountMetric ? formatNumber(value) : formatCurrency(value),
          metricLabels[name as MetricType] || name
        ]
      },
      contentStyle: { backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f8fafc' },
      labelStyle: { color: '#f8fafc' },
      itemStyle: { color: '#f8fafc' },
    }

    const renderCustomLabel = (props: any) => {
      const { x, y, width, height, value } = props
      const isCountMetric = widget.metrics.every(m => m === 'count')
      return (
        <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize={10}>
          {isCountMetric ? value : `${(value / 1000).toFixed(0)}k`}
        </text>
      )
    }

    // Format pour les axes Y
    const formatYAxis = (value: number) => {
      const isCountMetric = widget.metrics.every(m => m === 'count')
      return isCountMetric ? formatNumber(value) : `${(value / 1000).toFixed(0)}k`
    }

    switch (widget.chartType) {
      case 'pie':
        const pieMetric = widget.metrics[0] || 'amount'
        const pieData = data
          .map((item, index) => ({
            ...item,
            value: item[pieMetric],
            color: colors[index % colors.length],
          }))
          .filter(item => item.value > 0) // Filtrer les valeurs nulles/négatives

        if (pieData.length === 0) {
          return (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Aucune donnée pour "{metricLabels[pieMetric]}"
            </div>
          )
        }

        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={true}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip {...commonTooltipProps} />
            {widget.showLegend && (
              <Legend
                wrapperStyle={{ color: '#94a3b8', fontSize: '10px' }}
                formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '10px' }}>{value}</span>}
              />
            )}
          </PieChart>
        )

      case 'bar':
        return (
          <BarChart data={data}>
            {widget.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#334155" />}
            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
            <YAxis tickFormatter={formatYAxis} stroke="#64748b" fontSize={10} />
            <Tooltip {...commonTooltipProps} />
            {widget.showLegend && (
              <Legend
                wrapperStyle={{ color: '#94a3b8', fontSize: '10px' }}
                formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '10px' }}>{metricLabels[value as MetricType] || value}</span>}
              />
            )}
            {widget.metrics.map((metric, i) => (
              <Bar
                key={metric}
                dataKey={getDataKey(metric)}
                fill={colors[i % colors.length]}
                radius={[4, 4, 0, 0]}
                label={widget.showValues ? renderCustomLabel : false}
                animationDuration={800}
                animationEasing="ease-in-out"
              />
            ))}
          </BarChart>
        )

      case 'stacked-bar':
        return (
          <BarChart data={data}>
            {widget.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#334155" />}
            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
            <YAxis tickFormatter={formatYAxis} stroke="#64748b" fontSize={10} />
            <Tooltip {...commonTooltipProps} />
            {widget.showLegend && (
              <Legend
                wrapperStyle={{ color: '#94a3b8', fontSize: '10px' }}
                formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '10px' }}>{metricLabels[value as MetricType] || value}</span>}
              />
            )}
            {widget.metrics.map((metric, i) => (
              <Bar
                key={metric}
                dataKey={getDataKey(metric)}
                fill={colors[i % colors.length]}
                stackId="stack"
                animationDuration={800}
                animationEasing="ease-in-out"
              />
            ))}
          </BarChart>
        )

      case 'horizontal-bar':
        return (
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            {widget.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#334155" />}
            <XAxis type="number" tickFormatter={formatYAxis} stroke="#64748b" fontSize={10} />
            <YAxis type="category" dataKey="name" width={80} stroke="#64748b" fontSize={10} />
            <Tooltip {...commonTooltipProps} />
            {widget.showLegend && (
              <Legend
                wrapperStyle={{ color: '#94a3b8', fontSize: '10px' }}
                formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '10px' }}>{metricLabels[value as MetricType] || value}</span>}
              />
            )}
            {widget.metrics.map((metric, i) => (
              <Bar
                key={metric}
                dataKey={getDataKey(metric)}
                fill={colors[i % colors.length]}
                radius={[0, 4, 4, 0]}
                animationDuration={800}
                animationEasing="ease-in-out"
              />
            ))}
          </BarChart>
        )

      case 'line':
        return (
          <LineChart data={data}>
            {widget.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#334155" />}
            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
            <YAxis tickFormatter={formatYAxis} stroke="#64748b" fontSize={10} />
            <Tooltip {...commonTooltipProps} />
            {widget.showTarget && widget.targetValue && (
              <ReferenceLine y={widget.targetValue} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Objectif', fill: '#f59e0b', fontSize: 10 }} />
            )}
            {widget.metrics.map((metric, i) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={getDataKey(metric)}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[i % colors.length], r: 3 }}
                label={widget.showValues ? { position: 'top', fontSize: 10 } : false}
                animationDuration={800}
                animationEasing="ease-in-out"
              />
            ))}
            {widget.showLegend && (
              <Legend
                wrapperStyle={{ color: '#94a3b8', fontSize: '10px' }}
                formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '10px' }}>{metricLabels[value as MetricType] || value}</span>}
              />
            )}
            {widget.enableZoom && data.length > 5 && (
              <Brush dataKey="name" height={20} stroke="#475569" fill="#1e293b" />
            )}
          </LineChart>
        )

      case 'area':
        return (
          <AreaChart data={data}>
            {widget.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#334155" />}
            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
            <YAxis tickFormatter={formatYAxis} stroke="#64748b" fontSize={10} />
            <Tooltip {...commonTooltipProps} />
            {widget.showTarget && widget.targetValue && (
              <ReferenceLine y={widget.targetValue} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Objectif', fill: '#f59e0b', fontSize: 10 }} />
            )}
            {widget.metrics.map((metric, i) => (
              <Area
                key={metric}
                type="monotone"
                dataKey={getDataKey(metric)}
                stroke={colors[i % colors.length]}
                fill={colors[i % colors.length]}
                fillOpacity={0.3}
                animationDuration={800}
                animationEasing="ease-in-out"
              />
            ))}
            {widget.showLegend && (
              <Legend
                wrapperStyle={{ color: '#94a3b8', fontSize: '10px' }}
                formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '10px' }}>{metricLabels[value as MetricType] || value}</span>}
              />
            )}
            {widget.enableZoom && data.length > 5 && (
              <Brush dataKey="name" height={20} stroke="#475569" fill="#1e293b" />
            )}
          </AreaChart>
        )

      case 'radar':
        return (
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#475569" />
            <PolarAngleAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
            <PolarRadiusAxis stroke="#64748b" fontSize={8} />
            {widget.metrics.map((metric, i) => (
              <Radar
                key={metric}
                name={metricLabels[metric]}
                dataKey={getDataKey(metric)}
                stroke={colors[i % colors.length]}
                fill={colors[i % colors.length]}
                fillOpacity={0.3}
              />
            ))}
            <Tooltip {...commonTooltipProps} />
            {widget.showLegend && (
              <Legend
                wrapperStyle={{ color: '#94a3b8', fontSize: '10px' }}
                formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '10px' }}>{value}</span>}
              />
            )}
          </RadarChart>
        )

      case 'treemap':
        const treemapMetric = widget.metrics[0] || 'amount'
        const treemapData = data.map((item, index) => ({
          name: item.name,
          size: item[treemapMetric],
          fill: colors[index % colors.length],
        }))

        const CustomTreemapContent = (props: any) => {
          const { x, y, width, height, name, fill } = props
          return (
            <g>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{ fill, stroke: '#1e293b', strokeWidth: 2 }}
              />
              {width > 50 && height > 30 && (
                <text
                  x={x + width / 2}
                  y={y + height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize={10}
                >
                  {name}
                </text>
              )}
            </g>
          )
        }

        return (
          <Treemap
            data={treemapData}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="#1e293b"
            content={<CustomTreemapContent />}
          >
            <Tooltip {...commonTooltipProps} />
          </Treemap>
        )

      case 'funnel':
        const funnelMetric = widget.metrics[0] || 'amount'
        const funnelData = data.map((item, index) => ({
          name: item.name,
          value: item[funnelMetric],
          fill: colors[index % colors.length],
        }))
        return (
          <FunnelChart>
            <Tooltip {...commonTooltipProps} />
            <Funnel
              dataKey="value"
              data={funnelData}
              isAnimationActive
            >
              <LabelList position="right" fill="#94a3b8" fontSize={10} dataKey="name" />
            </Funnel>
          </FunnelChart>
        )

      case 'gauge':
        // Gauge chart - affiche un indicateur de progression
        const gaugeMetric = widget.metrics[0] || 'amount'
        const total = data.reduce((acc, item) => acc + item[gaugeMetric], 0)
        const maxItem = data.reduce((max, item) => item[gaugeMetric] > max[gaugeMetric] ? item : max, data[0])
        const percentage = total > 0 ? Math.round((maxItem[gaugeMetric] / total) * 100) : 0

        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={colors[0]}
                  strokeWidth="12"
                  strokeDasharray={`${(percentage / 100) * 352} 352`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-50">{percentage}%</span>
                <span className="text-xs text-slate-400">{maxItem?.name}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {gaugeMetric === 'count' ? formatNumber(maxItem[gaugeMetric]) : formatCurrency(maxItem[gaugeMetric])}
            </p>
          </div>
        )

      case 'kpi':
        // KPI card with trend indicator
        const kpiMetric = widget.metrics[0] || 'amount'
        const kpiTotal = data.reduce((acc, item) => acc + item[kpiMetric], 0)
        const kpiCount = data.length

        // Calculate trend (compare first half vs second half of data)
        const midPoint = Math.floor(data.length / 2)
        const firstHalf = data.slice(0, midPoint).reduce((acc, item) => acc + item[kpiMetric], 0)
        const secondHalf = data.slice(midPoint).reduce((acc, item) => acc + item[kpiMetric], 0)
        const trendPercent = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0
        const isPositive = trendPercent >= 0

        return (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">{metricLabels[kpiMetric]}</p>
              <p className="text-3xl font-bold text-slate-50 mb-2">
                {kpiMetric === 'count' ? formatNumber(kpiTotal) : formatCurrency(kpiTotal)}
              </p>
              {widget.showTrend !== false && (
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(trendPercent)}%
                </div>
              )}
              {widget.showTarget && widget.targetValue && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Objectif</span>
                    <span>{Math.round((kpiTotal / widget.targetValue) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((kpiTotal / widget.targetValue) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2">{kpiCount} élément{kpiCount > 1 ? 's' : ''}</p>
            </div>
          </div>
        )
    }
  }

  const addWidget = () => {
    const newWidget: WidgetConfig = {
      id: Date.now().toString(),
      title: 'Nouveau graphique',
      chartType: 'bar',
      dataSource: 'budget',
      groupBy: 'domain',
      metrics: ['engineered'],
      size: 'small',
      showLegend: true,
      showGrid: true,
      showValues: false,
      sortBy: 'value-desc',
      limit: 10,
      aggregation: 'sum',
      colorScheme: 'default',
    }
    setWidgets([...widgets, newWidget])
    setEditingWidget(newWidget.id)
    setActiveTab('data')
    toast.success('Graphique ajouté')
  }

  const updateWidget = (id: string, updates: Partial<WidgetConfig>) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, ...updates } : w))
  }

  const deleteWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id))
    setEditingWidget(null)
    toast.success('Graphique supprimé')
  }

  const duplicateWidget = (widget: WidgetConfig) => {
    const newWidget: WidgetConfig = {
      ...widget,
      id: Date.now().toString(),
      title: `${widget.title} (copie)`,
    }
    setWidgets([...widgets, newWidget])
    toast.success('Graphique dupliqué')
  }

  const resetToDefault = () => {
    setWidgets(defaultWidgets)
    setGlobalFilters({
      year: 'all',
      dateFrom: '',
      dateTo: '',
    })
    // Clear localStorage to force new defaults
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(FILTERS_STORAGE_KEY)
    toast.success('Configuration réinitialisée')
  }

  const toggleMetric = (widgetId: string, metric: MetricType) => {
    const widget = widgets.find(w => w.id === widgetId)
    if (!widget) return

    const newMetrics = widget.metrics.includes(metric)
      ? widget.metrics.filter(m => m !== metric)
      : [...widget.metrics, metric]

    if (newMetrics.length > 0) {
      updateWidget(widgetId, { metrics: newMetrics })
    }
  }

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedWidget || draggedWidget === targetId) {
      setDraggedWidget(null)
      return
    }

    const draggedIndex = widgets.findIndex(w => w.id === draggedWidget)
    const targetIndex = widgets.findIndex(w => w.id === targetId)

    const newWidgets = [...widgets]
    const [removed] = newWidgets.splice(draggedIndex, 1)
    newWidgets.splice(targetIndex, 0, removed)

    setWidgets(newWidgets)
    setDraggedWidget(null)
  }

  const handleDragEnd = () => {
    setDraggedWidget(null)
  }

  const getAvailableMetrics = (dataSource: DataSource): MetricType[] => {
    switch (dataSource) {
      case 'budget':
        return ['budget', 'engineered', 'invoiced', 'remaining']
      case 'invoices':
        return ['amount', 'count']
      case 'contracts':
        return ['amount', 'count']
      default:
        return ['amount']
    }
  }

  const clearDateFilters = () => {
    setGlobalFilters({
      ...globalFilters,
      dateFrom: '',
      dateTo: '',
    })
  }

  if (!isLoaded) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Chargement...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header amélioré */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-50">Tableau de Bord Analytique</h2>
            <p className="text-slate-400 mt-1">Visualisez et analysez vos données budgétaires</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                <span className="text-slate-400">{widgets.length} graphique{widgets.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-slate-400">{allBudgetLines.length} lignes</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                <span className="text-slate-400">{contracts.length} contrats</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowSaveModal(true)} variant="outline" size="sm" className="text-slate-400 hover:text-slate-200">
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
            <div className="relative">
              <Button onClick={() => setShowTemplates(!showTemplates)} variant="outline" size="sm" className="text-slate-400 hover:text-slate-200">
                <LayoutTemplate className="h-4 w-4 mr-2" />
                Templates
              </Button>
              {showTemplates && (
                <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 w-80 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-slate-700">
                    <h4 className="text-sm font-medium text-slate-200">Templates prédéfinis</h4>
                    <p className="text-xs text-slate-400 mt-1">Remplace tous les widgets actuels</p>
                  </div>
                  {Object.entries(widgetTemplates).map(([key, template]) => (
                    <button
                      key={key}
                      onClick={() => loadTemplate(key)}
                      className="w-full px-3 py-2.5 text-left hover:bg-slate-700/50 transition-colors"
                    >
                      <p className="text-sm font-medium text-slate-200">{template.name}</p>
                      <p className="text-xs text-slate-400">{template.description}</p>
                    </button>
                  ))}

                  {customViews.length > 0 && (
                    <>
                      <div className="p-3 border-t border-b border-slate-700 bg-slate-900/50">
                        <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                          <FolderOpen className="h-3.5 w-3.5" />
                          Mes vues personnalisées
                        </h4>
                      </div>
                      {customViews.map((view) => (
                        <div
                          key={view.id}
                          className="px-3 py-2.5 hover:bg-slate-700/50 transition-colors flex items-center justify-between group"
                        >
                          <button
                            onClick={() => loadCustomView(view)}
                            className="flex-1 text-left"
                          >
                            <p className="text-sm font-medium text-slate-200">{view.name}</p>
                            {view.description && (
                              <p className="text-xs text-slate-400">{view.description}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-0.5">
                              {view.widgets.length} widget{view.widgets.length > 1 ? 's' : ''} • {new Date(view.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteCustomView(view.id)
                            }}
                            className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
            <Button onClick={resetToDefault} variant="outline" size="sm" className="text-slate-400 hover:text-slate-200">
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
            <Button onClick={addWidget} size="sm" className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau graphique
            </Button>
          </div>
        </div>

        {/* Global Filters */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-medium text-slate-200">Filtres globaux</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Année</label>
              <Select
                value={globalFilters.year}
                onValueChange={(value) => setGlobalFilters({ ...globalFilters, year: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les années</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date début</label>
              <Input
                type="date"
                value={globalFilters.dateFrom}
                onChange={(e) => setGlobalFilters({ ...globalFilters, dateFrom: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date fin</label>
              <Input
                type="date"
                value={globalFilters.dateTo}
                onChange={(e) => setGlobalFilters({ ...globalFilters, dateTo: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="flex items-end">
              {(globalFilters.dateFrom || globalFilters.dateTo) && (
                <Button variant="ghost" size="sm" onClick={clearDateFilters} className="text-slate-400">
                  Effacer dates
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {widgets.map((widget) => {
            const data = getWidgetData(widget)
            const isEditing = editingWidget === widget.id

            return (
              <div
                key={widget.id}
                id={`widget-${widget.id}`}
                draggable
                onDragStart={(e) => handleDragStart(e, widget.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, widget.id)}
                onDragEnd={handleDragEnd}
                className={`rounded-lg border bg-slate-900/50 p-4 transition-all ${
                  draggedWidget === widget.id ? 'opacity-50 border-cyan-500' : 'border-slate-700'
                } ${sizeConfig[getWidgetSize(widget)].cols === 2 ? 'md:col-span-2' : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-slate-500 cursor-grab active:cursor-grabbing hover:text-slate-400 transition-colors" />
                    {isEditing ? (
                      <Input
                        value={widget.title}
                        onChange={(e) => updateWidget(widget.id, { title: e.target.value })}
                        className="h-7 text-sm bg-slate-800 border-slate-700 w-48 focus:border-cyan-500"
                        autoFocus
                      />
                    ) : (
                      <h3 className="font-semibold text-slate-50 text-sm">{widget.title}</h3>
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => {
                        const currentSize = getWidgetSize(widget)
                        const currentIndex = sizeOrder.indexOf(currentSize)
                        const nextSize = sizeOrder[(currentIndex + 1) % sizeOrder.length]
                        updateWidget(widget.id, { size: nextSize })
                      }}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all"
                      title={`Taille: ${sizeConfig[getWidgetSize(widget)].label} → ${sizeConfig[sizeOrder[(sizeOrder.indexOf(getWidgetSize(widget)) + 1) % sizeOrder.length]].label}`}
                    >
                      {getWidgetSize(widget) === 'small' && <Square className="h-3.5 w-3.5" />}
                      {getWidgetSize(widget) === 'medium' && <RectangleVertical className="h-3.5 w-3.5" />}
                      {getWidgetSize(widget) === 'large' && <RectangleHorizontal className="h-3.5 w-3.5" />}
                      {getWidgetSize(widget) === 'full' && <Maximize className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => duplicateWidget(widget)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                      title="Dupliquer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setExportMenuWidget(exportMenuWidget === widget.id ? null : widget.id)}
                        className={`p-1.5 rounded-md transition-all ${
                          exportMenuWidget === widget.id
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                        title="Exporter"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      {exportMenuWidget === widget.id && (
                        <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 min-w-32">
                          <button
                            onClick={() => exportWidgetToPNG(widget.id, widget.title)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 rounded-t-lg"
                          >
                            <Image className="h-3.5 w-3.5" />
                            PNG
                          </button>
                          <button
                            onClick={() => exportWidgetToPDF(widget.id, widget.title)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            PDF
                          </button>
                          <button
                            onClick={() => exportWidgetToExcel(widget)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 rounded-b-lg"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Excel/CSV
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setEditingWidget(isEditing ? null : widget.id)
                        setActiveTab('data')
                      }}
                      className={`p-1.5 rounded-md transition-all ${
                        isEditing
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                      }`}
                      title="Configurer"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setFullscreenWidget(widget.id)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                      title="Plein écran"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteWidget(widget.id)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="mb-3 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700/50 shadow-lg backdrop-blur-sm">
                    {/* Tabs améliorés */}
                    <div className="flex border-b border-slate-700/50 bg-slate-800/30 rounded-t-xl">
                      <button
                        onClick={() => setActiveTab('data')}
                        className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all duration-200 ${activeTab === 'data' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'}`}
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5 inline mr-1.5" />
                        Données
                      </button>
                      <button
                        onClick={() => setActiveTab('style')}
                        className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all duration-200 ${activeTab === 'style' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'}`}
                      >
                        <Palette className="h-3.5 w-3.5 inline mr-1.5" />
                        Apparence
                      </button>
                      <button
                        onClick={() => setActiveTab('filter')}
                        className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all duration-200 ${activeTab === 'filter' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'}`}
                      >
                        <Eye className="h-3.5 w-3.5 inline mr-1.5" />
                        Filtres
                      </button>
                    </div>

                    <div className="p-3 space-y-3 text-xs">
                      {activeTab === 'data' && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-slate-400 mb-1 block">Source</label>
                              <Select value={widget.dataSource} onValueChange={(v) => {
                                updateWidget(widget.id, {
                                  dataSource: v as DataSource,
                                  metrics: [getAvailableMetrics(v as DataSource)[0]],
                                  filterStatus: undefined,
                                  filterVendor: undefined,
                                  filterDomain: undefined,
                                  filterType: undefined,
                                  filterNature: undefined,
                                })
                              }}>
                                <SelectTrigger className="h-7 bg-slate-800 border-slate-700 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="budget">Lignes budgétaires</SelectItem>
                                  <SelectItem value="invoices">Factures</SelectItem>
                                  <SelectItem value="contracts">Contrats</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-slate-400 mb-1 block">Grouper par</label>
                              <Select value={widget.groupBy} onValueChange={(v) => updateWidget(widget.id, { groupBy: v as GroupByType })}>
                                <SelectTrigger className="h-7 bg-slate-800 border-slate-700 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(groupByLabels).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-slate-400 mb-1 block">Agrégation</label>
                              <Select value={widget.aggregation} onValueChange={(v) => updateWidget(widget.id, { aggregation: v as AggregationType })}>
                                <SelectTrigger className="h-7 bg-slate-800 border-slate-700 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(aggregationLabels).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-slate-400 mb-1 block">Tri</label>
                              <Select value={widget.sortBy} onValueChange={(v) => updateWidget(widget.id, { sortBy: v as SortType })}>
                                <SelectTrigger className="h-7 bg-slate-800 border-slate-700 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(sortLabels).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <label className="text-slate-400 mb-1 block">Limite ({widget.limit} éléments)</label>
                            <input
                              type="range"
                              min="3"
                              max="20"
                              value={widget.limit}
                              onChange={(e) => updateWidget(widget.id, { limit: parseInt(e.target.value) })}
                              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div>
                            <label className="text-slate-400 mb-1 block">
                              Métriques
                              {['pie', 'treemap', 'funnel', 'gauge', 'kpi'].includes(widget.chartType) && (
                                <span className="text-slate-500 ml-1">(1 seule pour ce type)</span>
                              )}
                            </label>
                            {['pie', 'treemap', 'funnel', 'gauge', 'kpi'].includes(widget.chartType) ? (
                              // Pour les graphiques à une seule métrique, utiliser un Select
                              <Select
                                value={widget.metrics[0]}
                                onValueChange={(v) => updateWidget(widget.id, { metrics: [v as MetricType] })}
                              >
                                <SelectTrigger className="h-7 bg-slate-800 border-slate-700 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableMetrics(widget.dataSource).map((metric) => (
                                    <SelectItem key={metric} value={metric}>{metricLabels[metric]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              // Pour les autres graphiques, permettre plusieurs métriques
                              <div className="flex flex-wrap gap-1">
                                {getAvailableMetrics(widget.dataSource).map((metric) => (
                                  <Button
                                    key={metric}
                                    size="sm"
                                    variant={widget.metrics.includes(metric) ? 'default' : 'outline'}
                                    onClick={() => toggleMetric(widget.id, metric)}
                                    className="h-6 text-xs"
                                    style={widget.metrics.includes(metric) ? { backgroundColor: metricColors[metric] } : {}}
                                  >
                                    {metricLabels[metric]}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {activeTab === 'style' && (
                        <>
                          <div>
                            <label className="text-slate-400 mb-2 block font-medium">Type de graphique</label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              {[
                                { type: 'bar', icon: BarChart3, label: 'Barres' },
                                { type: 'stacked-bar', icon: BarChart3, label: 'Empilé' },
                                { type: 'horizontal-bar', icon: BarChart3, label: 'H-Bar' },
                                { type: 'pie', icon: PieChartIcon, label: 'Donut' },
                                { type: 'line', icon: TrendingUp, label: 'Ligne' },
                                { type: 'area', icon: AreaChartIcon, label: 'Aire' },
                                { type: 'radar', icon: TrendingUp, label: 'Radar' },
                                { type: 'treemap', icon: LayoutGrid, label: 'Treemap' },
                                { type: 'funnel', icon: Filter, label: 'Funnel' },
                                { type: 'gauge', icon: Gauge, label: 'Jauge' },
                                { type: 'kpi', icon: TrendingUp, label: 'KPI' },
                              ].map(({ type, icon: Icon, label }) => (
                                <button
                                  key={type}
                                  onClick={() => {
                                    // Si on passe à un type qui ne supporte qu'une métrique, garder seulement la première
                                    const singleMetricTypes = ['pie', 'treemap', 'funnel', 'gauge', 'kpi']
                                    const updates: Partial<WidgetConfig> = { chartType: type as ChartType }
                                    if (singleMetricTypes.includes(type) && widget.metrics.length > 1) {
                                      updates.metrics = [widget.metrics[0]]
                                    }
                                    updateWidget(widget.id, updates)
                                  }}
                                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-200 ${
                                    widget.chartType === type
                                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                                  }`}
                                >
                                  <Icon className="h-4 w-4" />
                                  <span className="text-[10px] font-medium">{label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-slate-400 mb-2 block font-medium">Palette de couleurs</label>
                            <div className="grid grid-cols-3 gap-2">
                              {Object.entries(COLOR_SCHEMES).map(([key, colors]) => (
                                <button
                                  key={key}
                                  onClick={() => updateWidget(widget.id, { colorScheme: key })}
                                  className={`p-1.5 rounded-lg border transition-all duration-200 ${
                                    widget.colorScheme === key
                                      ? 'ring-2 ring-cyan-500 border-cyan-500/50 bg-slate-800/50'
                                      : 'border-slate-700 hover:border-slate-600'
                                  }`}
                                >
                                  <div className="flex items-center justify-center gap-0.5">
                                    {colors.slice(0, 5).map((color, i) => (
                                      <div key={i} className="w-3 h-5 rounded-sm first:rounded-l last:rounded-r" style={{ backgroundColor: color }} />
                                    ))}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-slate-400 mb-2 block font-medium">Options d'affichage</label>
                            <div className="flex flex-wrap gap-3">
                              <label className="flex items-center gap-2 text-slate-300 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={widget.showLegend}
                                  onChange={(e) => updateWidget(widget.id, { showLegend: e.target.checked })}
                                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                                />
                                <span className="text-xs group-hover:text-cyan-400 transition-colors">Légende</span>
                              </label>
                              <label className="flex items-center gap-2 text-slate-300 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={widget.showGrid}
                                  onChange={(e) => updateWidget(widget.id, { showGrid: e.target.checked })}
                                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                                />
                                <span className="text-xs group-hover:text-cyan-400 transition-colors">Grille</span>
                              </label>
                              <label className="flex items-center gap-2 text-slate-300 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={widget.showValues}
                                  onChange={(e) => updateWidget(widget.id, { showValues: e.target.checked })}
                                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                                />
                                <span className="text-xs group-hover:text-cyan-400 transition-colors">Valeurs</span>
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="text-slate-400 mb-1 block">Taille</label>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant={widget.height === 1 ? 'default' : 'outline'}
                                onClick={() => updateWidget(widget.id, { height: 1 })}
                                className="flex-1 h-6 text-xs"
                              >
                                Normal
                              </Button>
                              <Button
                                size="sm"
                                variant={widget.height === 2 ? 'default' : 'outline'}
                                onClick={() => updateWidget(widget.id, { height: 2 })}
                                className="flex-1 h-6 text-xs"
                              >
                                Grand
                              </Button>
                            </div>
                          </div>
                        </>
                      )}

                      {activeTab === 'filter' && (
                        <>
                          <p className="text-slate-500 text-xs mb-2">Filtrer les données de ce graphique uniquement</p>

                          {(widget.dataSource === 'invoices' || widget.dataSource === 'contracts') && (
                            <div>
                              <label className="text-slate-400 mb-1 block">Statut</label>
                              <Select
                                value={widget.filterStatus || 'all'}
                                onValueChange={(v) => updateWidget(widget.id, { filterStatus: v === 'all' ? undefined : v })}
                              >
                                <SelectTrigger className="h-7 bg-slate-800 border-slate-700 text-xs">
                                  <SelectValue placeholder="Tous" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Tous les statuts</SelectItem>
                                  {uniqueStatuses.map((status) => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {(widget.dataSource === 'invoices' || widget.dataSource === 'contracts') && (
                            <div>
                              <label className="text-slate-400 mb-1 block">Fournisseur</label>
                              <Select
                                value={widget.filterVendor || 'all'}
                                onValueChange={(v) => updateWidget(widget.id, { filterVendor: v === 'all' ? undefined : v })}
                              >
                                <SelectTrigger className="h-7 bg-slate-800 border-slate-700 text-xs">
                                  <SelectValue placeholder="Tous" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Tous les fournisseurs</SelectItem>
                                  {uniqueVendors.map((vendor) => (
                                    <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {widget.dataSource === 'budget' && (
                            <>
                              <div>
                                <label className="text-slate-400 mb-1 block">Domaine</label>
                                <Select
                                  value={widget.filterDomain || 'all'}
                                  onValueChange={(v) => updateWidget(widget.id, { filterDomain: v === 'all' ? undefined : v })}
                                >
                                  <SelectTrigger className="h-7 bg-slate-800 border-slate-700 text-xs">
                                    <SelectValue placeholder="Tous" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Tous les domaines</SelectItem>
                                    {domains.map((domain) => (
                                      <SelectItem key={domain.id} value={domain.id}>{domain.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-slate-400 mb-1 block">Type</label>
                                <Select
                                  value={widget.filterType || 'all'}
                                  onValueChange={(v) => updateWidget(widget.id, { filterType: v === 'all' ? undefined : v })}
                                >
                                  <SelectTrigger className="h-7 bg-slate-800 border-slate-700 text-xs">
                                    <SelectValue placeholder="Tous" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Tous les types</SelectItem>
                                    {types.map((type) => (
                                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}

                          <div>
                            <label className="text-slate-400 mb-1 block">Nature</label>
                            <Select
                              value={widget.filterNature || 'all'}
                              onValueChange={(v) => updateWidget(widget.id, { filterNature: v === 'all' ? undefined : v })}
                            >
                              <SelectTrigger className="h-7 bg-slate-800 border-slate-700 text-xs">
                                <SelectValue placeholder="Toutes" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Toutes les natures</SelectItem>
                                <SelectItem value="Investissement">Investissement</SelectItem>
                                <SelectItem value="Fonctionnement">Fonctionnement</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {(widget.filterStatus || widget.filterVendor || widget.filterDomain || widget.filterType || widget.filterNature) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateWidget(widget.id, {
                                filterStatus: undefined,
                                filterVendor: undefined,
                                filterDomain: undefined,
                                filterType: undefined,
                                filterNature: undefined,
                              })}
                              className="text-slate-400 text-xs"
                            >
                              Effacer les filtres
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className={sizeConfig[getWidgetSize(widget)].height}>
                  {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      {renderChart(widget, data)}
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                      Aucune donnée
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {widgets.length === 0 && (
          <div className="text-center py-16 bg-gradient-to-br from-slate-900/50 to-slate-800/30 rounded-xl border border-slate-700/50">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-slate-800/50 flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Aucun graphique configuré</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Créez votre premier graphique pour visualiser vos données budgétaires de manière personnalisée.
            </p>
            <Button onClick={addWidget} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500">
              <Plus className="h-4 w-4 mr-2" />
              Créer un graphique
            </Button>
          </div>
        )}
      </div>

      {/* Modal Plein Écran */}
      {fullscreenWidget && (() => {
        const widget = widgets.find(w => w.id === fullscreenWidget)
        if (!widget) return null
        const data = getWidgetData(widget)

        return (
          <div className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-xl font-bold text-slate-50">{widget.title}</h2>
              <button
                onClick={() => setFullscreenWidget(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 p-6">
              {data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart(widget, data)}
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  Aucune donnée
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Modal Sauvegarde Vue */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-50">Sauvegarder la vue</h3>
              <button
                onClick={() => {
                  setShowSaveModal(false)
                  setNewViewName('')
                  setNewViewDescription('')
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Nom de la vue <span className="text-red-400">*</span>
                </label>
                <Input
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  placeholder="Ma vue personnalisée"
                  className="bg-slate-900 border-slate-600"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Description (optionnel)
                </label>
                <Input
                  value={newViewDescription}
                  onChange={(e) => setNewViewDescription(e.target.value)}
                  placeholder="Description de la vue..."
                  className="bg-slate-900 border-slate-600"
                />
              </div>
              <p className="text-xs text-slate-500">
                Cette vue contiendra {widgets.length} widget{widgets.length > 1 ? 's' : ''} avec leur configuration actuelle.
              </p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveModal(false)
                  setNewViewName('')
                  setNewViewDescription('')
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={saveCustomView}
                className="bg-cyan-600 hover:bg-cyan-700"
                disabled={!newViewName.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
