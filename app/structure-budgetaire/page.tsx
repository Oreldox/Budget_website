'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Calendar, TrendingUp, TrendingDown, DollarSign, Settings2, AlertCircle, LayoutGrid, List, Search, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useBudgetStructure } from '@/lib/hooks'

export default function BudgetPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    // Initialize from URL or default to current year
    const yearParam = searchParams.get('year')
    if (yearParam) {
      const year = parseInt(yearParam)
      if (!isNaN(year)) return year
    }
    return new Date().getFullYear()
  })
  const [forecastExpenses, setForecastExpenses] = useState<any[]>([])
  const [forecastBudgetLines, setForecastBudgetLines] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [services, setServices] = useState<any[]>([])
  const [poles, setPoles] = useState<any[]>([])
  const { types, domains } = useBudgetStructure()

  // Update URL when year changes
  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year)
    router.push(`/structure-budgetaire?year=${year}`, { scroll: false })
  }, [router])

  // List view states
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([])
  const [expenseSearchTerm, setExpenseSearchTerm] = useState('')
  const [expenseNatureFilter, setExpenseNatureFilter] = useState<'all' | 'Fonctionnement' | 'Investissement'>('all')
  const [expenseBudgetLineFilter, setExpenseBudgetLineFilter] = useState<string>('all')
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false)
  const [bulkEditData, setBulkEditData] = useState({
    action: 'changeLine' as 'changeLine' | 'applyCoefficient',
    budgetLineId: '',
    coefficient: '1'
  })

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false)
  const [editExpenseModalOpen, setEditExpenseModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [createYearModalOpen, setCreateYearModalOpen] = useState(false)
  const [envelopeModalOpen, setEnvelopeModalOpen] = useState(false)

  // Form state for budget lines
  const [formData, setFormData] = useState({
    id: '',
    label: '',
    description: '',
    typeId: '',
    domainId: '',
    nature: '',
    accountingCode: '',
    year: new Date().getFullYear(),
    budget: '',
    poleId: 'none'
  })

  // Form state for forecast expenses
  const [expenseFormData, setExpenseFormData] = useState({
    id: '',
    forecastBudgetLineId: '',
    label: '',
    description: '',
    amount: '',
    nature: '' // For knowing which section we're in
  })

  // Year creation form
  const [newYearData, setNewYearData] = useState({
    year: new Date().getFullYear() + 1,
    copyFrom: 'none'
  })

  // Annual budget envelopes
  const [annualBudget, setAnnualBudget] = useState({
    budgetFonctionnement: 0,
    budgetInvestissement: 0,
    exists: false
  })

  // Envelope form
  const [envelopeForm, setEnvelopeForm] = useState({
    budgetFonctionnement: '',
    budgetInvestissement: ''
  })

  // Charger les services et pôles
  const fetchServicesAndPoles = useCallback(async () => {
    try {
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data)
        // Flatten all poles from all services
        const allPoles = data.flatMap((service: any) =>
          service.poles.map((pole: any) => ({
            ...pole,
            serviceName: service.name
          }))
        )
        setPoles(allPoles)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }, [])

  // Charger les années disponibles
  const fetchAvailableYears = useCallback(async () => {
    try {
      const response = await fetch('/api/budget-years')
      if (response.ok) {
        const data = await response.json()
        setAvailableYears(prev => {
          const newYears = data.years || []
          const merged = [...new Set([...prev, ...newYears])]
          return merged.sort((a, b) => a - b)
        })
      }
    } catch (error) {
      console.error('Error fetching years:', error)
    }
  }, [])

  useEffect(() => {
    fetchAvailableYears()
    fetchServicesAndPoles()
  }, [fetchAvailableYears, fetchServicesAndPoles])

  // Charger le budget annuel pour l'année sélectionnée
  const fetchAnnualBudget = useCallback(async (year: number) => {
    try {
      const response = await fetch(`/api/annual-budgets?year=${year}`)
      if (response.ok) {
        const data = await response.json()
        setAnnualBudget(data)
        if (data.exists) {
          setEnvelopeForm({
            budgetFonctionnement: data.budgetFonctionnement.toString(),
            budgetInvestissement: data.budgetInvestissement.toString()
          })
        } else {
          setEnvelopeForm({
            budgetFonctionnement: '',
            budgetInvestissement: ''
          })
        }
      }
    } catch (error) {
      console.error('Error fetching annual budget:', error)
    }
  }, [])

  // Charger le budget annuel quand l'année change
  useEffect(() => {
    fetchAnnualBudget(selectedYear)
  }, [selectedYear, fetchAnnualBudget])

  // Charger les lignes budgétaires prévisionnelles pour l'année sélectionnée
  const fetchForecastBudgetLines = useCallback(async (year: number) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/forecast-budget-lines?year=${year}`)
      if (response.ok) {
        const data = await response.json()
        setForecastBudgetLines(data)
      }
    } catch (error) {
      console.error('Error fetching forecast budget lines:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchForecastBudgetLines(selectedYear)
  }, [selectedYear, fetchForecastBudgetLines])

  // Charger les dépenses prévisionnelles pour l'année sélectionnée
  useEffect(() => {
    const fetchForecastExpenses = async () => {
      try {
        const response = await fetch(`/api/forecast-expenses?year=${selectedYear}`)
        if (response.ok) {
          const data = await response.json()
          setForecastExpenses(data)
        }
      } catch (error) {
        console.error('Error fetching forecast expenses:', error)
      }
    }
    fetchForecastExpenses()
  }, [selectedYear])

  // Gérer l'année depuis l'URL
  useEffect(() => {
    const yearParam = searchParams.get('year')
    if (yearParam) {
      const year = parseInt(yearParam)
      if (!isNaN(year)) {
        setAvailableYears(prev => {
          if (!prev.includes(year)) {
            return [...prev, year].sort((a, b) => a - b)
          }
          return prev
        })
        handleYearChange(year)
      }
    }
  }, [searchParams, handleYearChange])

  // Calculer les totaux
  const calculateTotals = (nature: 'Fonctionnement' | 'Investissement') => {
    const lines = forecastBudgetLines.filter(line => line.nature === nature)

    const previsionnel = lines.reduce((sum, line) => {
      return sum + (line.budget || 0)
    }, 0)

    // Calculer le total des dépenses prévisionnelles
    const depenses = lines.reduce((sum, line) => {
      const lineExpenses = forecastExpenses.filter(exp => exp.forecastBudgetLineId === line.id)
      return sum + lineExpenses.reduce((expSum, exp) => expSum + exp.amount, 0)
    }, 0)

    // Calculer le total engagé (bons de commande liés)
    const engaged = lines.reduce((sum, line) => {
      const lineExpenses = forecastExpenses.filter(exp => exp.forecastBudgetLineId === line.id)
      return sum + lineExpenses.reduce((expSum, exp) => {
        const linkedPOs = (exp as any).linkedPurchaseOrders || []
        return expSum + linkedPOs.reduce((poSum: number, po: any) => poSum + po.amount, 0)
      }, 0)
    }, 0)

    // Calculer le total réel (factures liées)
    const realized = lines.reduce((sum, line) => {
      const lineExpenses = forecastExpenses.filter(exp => exp.forecastBudgetLineId === line.id)
      return sum + lineExpenses.reduce((expSum, exp) => {
        const linkedInvoices = exp.linkedInvoices || []
        return expSum + linkedInvoices.reduce((invSum: number, inv: any) => invSum + inv.amount, 0)
      }, 0)
    }, 0)

    return { previsionnel, depenses, engaged, realized }
  }

  const fonctionnementTotals = calculateTotals('Fonctionnement')
  const investissementTotals = calculateTotals('Investissement')
  const grandTotal = {
    previsionnel: fonctionnementTotals.previsionnel + investissementTotals.previsionnel,
    depenses: fonctionnementTotals.depenses + investissementTotals.depenses,
    engaged: fonctionnementTotals.engaged + investissementTotals.engaged,
    realized: fonctionnementTotals.realized + investissementTotals.realized,
  }

  const openEditModal = (line: any) => {
    setFormData({
      id: line.id,
      label: line.label,
      description: line.description || '',
      typeId: line.typeId,
      domainId: line.domainId,
      nature: line.nature || '',
      accountingCode: line.accountingCode || '',
      year: line.year,
      budget: (line.budget || 0).toString(),
      poleId: line.poleId || 'none'
    })
    setEditModalOpen(true)
  }

  const openAddModal = (nature: 'Fonctionnement' | 'Investissement') => {
    setFormData({
      id: '',
      label: '',
      description: '',
      typeId: '',
      domainId: '',
      nature,
      accountingCode: '',
      year: selectedYear,
      budget: '',
      poleId: 'none'
    })
    setAddModalOpen(true)
  }

  const openAddExpenseModal = (nature: 'Fonctionnement' | 'Investissement') => {
    setExpenseFormData({
      id: '',
      forecastBudgetLineId: '',
      label: '',
      description: '',
      amount: '',
      nature
    })
    setAddExpenseModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.label || !formData.typeId || !formData.domainId || !formData.budget) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    const data = {
      label: formData.label,
      description: formData.description,
      typeId: formData.typeId,
      domainId: formData.domainId,
      nature: formData.nature,
      accountingCode: formData.accountingCode,
      year: formData.year,
      budget: Number(formData.budget),
      poleId: formData.poleId && formData.poleId !== 'none' ? formData.poleId : null
    }

    try {
      if (formData.id) {
        // Update existing line
        const response = await fetch('/api/forecast-budget-lines', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: formData.id, ...data })
        })

        if (response.ok) {
          toast.success('Ligne budgétaire mise à jour')
          setEditModalOpen(false)
        } else {
          const error = await response.json()
          toast.error(error.error || 'Erreur lors de la mise à jour')
          return
        }
      } else {
        // Create new line
        const response = await fetch('/api/forecast-budget-lines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })

        if (response.ok) {
          toast.success('Ligne budgétaire créée')
          setAddModalOpen(false)
        } else {
          const error = await response.json()
          toast.error(error.error || 'Erreur lors de la création')
          return
        }
      }

      // Refresh the forecast budget lines
      await fetchForecastBudgetLines(selectedYear)
    } catch (error) {
      console.error('Error saving budget line:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/forecast-budget-lines?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Ligne budgétaire supprimée')
        setDeleteConfirm(null)
        await fetchForecastBudgetLines(selectedYear)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error deleting budget line:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleSaveExpense = async () => {
    if (!expenseFormData.forecastBudgetLineId || !expenseFormData.label || !expenseFormData.amount) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      const method = expenseFormData.id ? 'PUT' : 'POST'
      const response = await fetch('/api/forecast-expenses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: expenseFormData.id || undefined,
          forecastBudgetLineId: expenseFormData.forecastBudgetLineId,
          year: selectedYear,
          label: expenseFormData.label,
          description: expenseFormData.description,
          amount: parseFloat(expenseFormData.amount)
        })
      })

      if (response.ok) {
        toast.success(expenseFormData.id ? 'Dépense modifiée avec succès' : 'Dépense prévisionnelle ajoutée avec succès')
        setAddExpenseModalOpen(false)
        setEditExpenseModalOpen(false)
        setExpenseFormData({
          id: '',
          forecastBudgetLineId: '',
          label: '',
          description: '',
          amount: '',
          nature: ''
        })
        // Refresh forecast expenses and budget lines
        await fetchForecastBudgetLines(selectedYear)

        // Refresh forecast expenses separately
        const expensesResponse = await fetch(`/api/forecast-expenses?year=${selectedYear}`)
        if (expensesResponse.ok) {
          const data = await expensesResponse.json()
          setForecastExpenses(data)
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de la sauvegarde de la dépense')
      }
    } catch (error) {
      console.error('Error saving expense:', error)
      toast.error('Erreur lors de la sauvegarde de la dépense')
    }
  }

  const openEditExpenseModal = (expense: any) => {
    setExpenseFormData({
      id: expense.id,
      forecastBudgetLineId: expense.forecastBudgetLineId,
      label: expense.label,
      description: expense.description || '',
      amount: expense.amount.toString(),
      nature: ''
    })
    setEditExpenseModalOpen(true)
  }

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const response = await fetch(`/api/forecast-expenses?id=${expenseId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Dépense supprimée avec succès')
        await fetchForecastBudgetLines(selectedYear)

        // Refresh forecast expenses separately
        const expensesResponse = await fetch(`/api/forecast-expenses?year=${selectedYear}`)
        if (expensesResponse.ok) {
          const data = await expensesResponse.json()
          setForecastExpenses(data)
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  // Bulk operations
  const handleSelectExpense = (expenseId: string) => {
    setSelectedExpenses(prev =>
      prev.includes(expenseId)
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    )
  }

  const handleSelectAll = () => {
    if (selectedExpenses.length === filteredExpenses.length) {
      setSelectedExpenses([])
    } else {
      setSelectedExpenses(filteredExpenses.map((exp: any) => exp.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedExpenses.length === 0) return

    if (!confirm(`Voulez-vous vraiment supprimer ${selectedExpenses.length} dépense(s) ?`)) {
      return
    }

    try {
      const deletePromises = selectedExpenses.map(id =>
        fetch(`/api/forecast-expenses?id=${id}`, { method: 'DELETE' })
      )

      const results = await Promise.all(deletePromises)
      const successCount = results.filter(r => r.ok).length

      if (successCount === selectedExpenses.length) {
        toast.success(`${successCount} dépense(s) supprimée(s) avec succès`)
      } else {
        toast.warning(`${successCount}/${selectedExpenses.length} dépense(s) supprimée(s)`)
      }

      setSelectedExpenses([])
      await fetchForecastBudgetLines(selectedYear)

      const expensesResponse = await fetch(`/api/forecast-expenses?year=${selectedYear}`)
      if (expensesResponse.ok) {
        const data = await expensesResponse.json()
        setForecastExpenses(data)
      }
    } catch (error) {
      console.error('Error bulk deleting expenses:', error)
      toast.error('Erreur lors de la suppression en masse')
    }
  }

  const handleBulkEdit = async () => {
    if (selectedExpenses.length === 0) return

    try {
      if (bulkEditData.action === 'changeLine') {
        if (!bulkEditData.budgetLineId) {
          toast.error('Veuillez sélectionner une ligne budgétaire')
          return
        }

        const updatePromises = selectedExpenses.map(async (id) => {
          const expense = forecastExpenses.find((exp: any) => exp.id === id)
          if (!expense) return null

          return fetch('/api/forecast-expenses', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              forecastBudgetLineId: bulkEditData.budgetLineId,
              year: selectedYear,
              label: expense.label,
              description: expense.description,
              amount: expense.amount
            })
          })
        })

        const results = await Promise.all(updatePromises)
        const successCount = results.filter(r => r?.ok).length

        toast.success(`${successCount} dépense(s) modifiée(s)`)
      } else if (bulkEditData.action === 'applyCoefficient') {
        const coefficient = parseFloat(bulkEditData.coefficient)
        if (isNaN(coefficient) || coefficient <= 0) {
          toast.error('Coefficient invalide')
          return
        }

        const updatePromises = selectedExpenses.map(async (id) => {
          const expense = forecastExpenses.find((exp: any) => exp.id === id)
          if (!expense) return null

          return fetch('/api/forecast-expenses', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              forecastBudgetLineId: expense.forecastBudgetLineId,
              year: selectedYear,
              label: expense.label,
              description: expense.description,
              amount: Math.round(expense.amount * coefficient * 100) / 100
            })
          })
        })

        const results = await Promise.all(updatePromises)
        const successCount = results.filter(r => r?.ok).length

        toast.success(`${successCount} dépense(s) modifiée(s)`)
      }

      setBulkEditModalOpen(false)
      setSelectedExpenses([])
      setBulkEditData({ action: 'changeLine', budgetLineId: '', coefficient: '1' })

      await fetchForecastBudgetLines(selectedYear)
      const expensesResponse = await fetch(`/api/forecast-expenses?year=${selectedYear}`)
      if (expensesResponse.ok) {
        const data = await expensesResponse.json()
        setForecastExpenses(data)
      }
    } catch (error) {
      console.error('Error bulk editing expenses:', error)
      toast.error('Erreur lors de la modification en masse')
    }
  }

  // Filter expenses for list view
  const filteredExpenses = forecastExpenses.filter((expense: any) => {
    const matchesSearch = expense.label.toLowerCase().includes(expenseSearchTerm.toLowerCase()) ||
      expense.description?.toLowerCase().includes(expenseSearchTerm.toLowerCase())

    const budgetLine = forecastBudgetLines.find((line: any) => line.id === expense.forecastBudgetLineId)
    const matchesNature = expenseNatureFilter === 'all' || budgetLine?.nature === expenseNatureFilter
    const matchesBudgetLine = expenseBudgetLineFilter === 'all' || expense.forecastBudgetLineId === expenseBudgetLineFilter

    return matchesSearch && matchesNature && matchesBudgetLine
  })

  // Créer une nouvelle année
  const handleCreateYear = async () => {
    if (!newYearData.year) {
      toast.error('Veuillez saisir une année')
      return
    }

    try {
      const response = await fetch('/api/budget-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: newYearData.year,
          copyFrom: newYearData.copyFrom && newYearData.copyFrom !== 'none' ? parseInt(newYearData.copyFrom) : undefined
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        setCreateYearModalOpen(false)
        setAvailableYears(prev => [...prev, newYearData.year].sort((a, b) => a - b))
        handleYearChange(newYearData.year)
        setNewYearData({ year: new Date().getFullYear() + 1, copyFrom: 'none' })
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de la création de l\'année')
      }
    } catch (error) {
      console.error('Error creating year:', error)
      toast.error('Erreur lors de la création de l\'année')
    }
  }

  // Sauvegarder les enveloppes budgétaires
  const handleSaveEnvelopes = async () => {
    const fonctionnement = parseFloat(envelopeForm.budgetFonctionnement || '0')
    const investissement = parseFloat(envelopeForm.budgetInvestissement || '0')

    if (fonctionnement <= 0 && investissement <= 0) {
      toast.error('Veuillez saisir au moins un budget')
      return
    }

    try {
      const response = await fetch('/api/annual-budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          budgetFonctionnement: fonctionnement,
          budgetInvestissement: investissement
        })
      })

      if (response.ok) {
        toast.success('Enveloppes budgétaires enregistrées')
        setEnvelopeModalOpen(false)
        fetchAnnualBudget(selectedYear)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de l\'enregistrement')
      }
    } catch (error) {
      console.error('Error saving envelopes:', error)
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  const renderBudgetCard = (line: any) => {
    const previsionnel = line.budget || 0

    // Récupérer les dépenses prévisionnelles pour cette ligne budgétaire
    const lineExpenses = forecastExpenses.filter(exp => exp.forecastBudgetLineId === line.id)
    const totalExpenses = lineExpenses.reduce((sum, exp) => sum + exp.amount, 0)

    // Calculer le total engagé (bons de commande liés)
    const totalEngaged = lineExpenses.reduce((sum, exp) => {
      const linkedPOs = (exp as any).linkedPurchaseOrders || []
      return sum + linkedPOs.reduce((poSum: number, po: any) => poSum + po.amount, 0)
    }, 0)

    // Calculer le total réel (factures liées)
    const totalRealized = lineExpenses.reduce((sum, exp) => {
      const linkedInvoices = exp.linkedInvoices || []
      return sum + linkedInvoices.reduce((invSum: number, inv: any) => invSum + inv.amount, 0)
    }, 0)

    return (
      <div key={line.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-cyan-600 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-50">{line.label}</h3>
            {line.description && <p className="text-sm text-slate-400 mt-1">{line.description}</p>}
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="inline-block px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">
                {(line as any).type?.name || '-'}
              </span>
              <span className="inline-block px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">
                {(line as any).domain?.name || '-'}
              </span>
              {(line as any).pole && (
                <span className="inline-block px-2 py-1 rounded text-xs bg-purple-900/50 text-purple-300 border border-purple-700/50">
                  {(line as any).pole.service?.name} › {(line as any).pole.name}
                </span>
              )}
              {line.accountingCode && (
                <span className="inline-block px-2 py-1 rounded text-xs bg-slate-700 text-slate-400 font-mono">
                  {line.accountingCode}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => openEditModal(line)} className="h-8 w-8 p-0">
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirm(line.id)}
              className="h-8 w-8 p-0 text-red-400 hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-700">
          <div>
            <p className="text-xs text-slate-500 mb-1">Budget alloué</p>
            <p className="text-lg font-bold text-cyan-400">{previsionnel.toLocaleString('fr-FR')}€</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Dépenses prévisionnelles</p>
            <p className="text-lg font-bold text-purple-400">{totalExpenses.toLocaleString('fr-FR')}€</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Engagé (BCs)</p>
            <p className="text-lg font-bold text-orange-400">{totalEngaged.toLocaleString('fr-FR')}€</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Factures liées (Réel)</p>
            <p className="text-lg font-bold text-green-400">{totalRealized.toLocaleString('fr-FR')}€</p>
          </div>
        </div>

        {/* Afficher les dépenses prévisionnelles */}
        {lineExpenses.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-xs font-semibold text-slate-400 mb-2">Dépenses prévisionnelles ({lineExpenses.length})</p>
            <div className="space-y-2">
              {lineExpenses.map((expense: any) => {
                const linkedInvoices = expense.linkedInvoices || []
                const linkedPOs = (expense as any).linkedPurchaseOrders || []
                const totalEngaged = linkedPOs.reduce((sum: number, po: any) => sum + po.amount, 0)
                const totalRealized = linkedInvoices.reduce((sum: number, inv: any) => sum + inv.amount, 0)
                const variance = totalRealized - expense.amount
                const hasLinkedInvoices = linkedInvoices.length > 0
                const hasLinkedPOs = linkedPOs.length > 0

                return (
                  <div
                    key={expense.id}
                    className={`rounded p-2 ${
                      hasLinkedInvoices
                        ? 'bg-green-900/20 border border-green-700/50 opacity-70'
                        : 'bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between group hover:bg-slate-900/70 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${hasLinkedInvoices ? 'text-slate-400' : 'text-slate-300'}`}>
                            {expense.label}
                          </p>
                          {hasLinkedPOs && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-600 text-white">
                              📦 Engagé
                            </span>
                          )}
                          {hasLinkedInvoices && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-600 text-white">
                              ✓ Facturée
                            </span>
                          )}
                        </div>
                        {expense.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{expense.description}</p>
                        )}

                        {/* Indicateur de liaison avec infos BCs */}
                        {hasLinkedPOs && (
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-400">Prévu: {expense.amount.toLocaleString('fr-FR')}€</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-orange-400 font-medium">Engagé: {totalEngaged.toLocaleString('fr-FR')}€</span>
                            </div>
                            {linkedPOs.map((po: any) => (
                              <div key={po.id} className="text-xs text-slate-400">
                                📦 BC: {po.number} • {po.vendor} • {po.amount.toLocaleString('fr-FR')}€
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Indicateur de liaison avec infos facture */}
                        {hasLinkedInvoices && (
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-400">Prévu: {expense.amount.toLocaleString('fr-FR')}€</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-cyan-400 font-medium">Réel: {totalRealized.toLocaleString('fr-FR')}€</span>
                              <span className={`font-bold ${variance < 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {variance < 0 ? '↓' : '↑'} {Math.abs(variance).toLocaleString('fr-FR')}€
                              </span>
                            </div>
                            {linkedInvoices.map((inv: any) => (
                              <div key={inv.id} className="text-xs text-slate-400">
                                📄 Facture: {inv.number} • {inv.vendor} • {inv.amount.toLocaleString('fr-FR')}€
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${hasLinkedInvoices ? 'text-slate-500' : 'text-cyan-400'}`}>
                          {expense.amount.toLocaleString('fr-FR')}€
                        </p>
                        {!hasLinkedInvoices && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditExpenseModal(expense)}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-cyan-400"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                <p className="text-xs font-semibold text-slate-400">Total dépenses</p>
                <p className="text-sm font-bold text-cyan-300">{totalExpenses.toLocaleString('fr-FR')}€</p>
              </div>
            </div>
          </div>
        )}

        {deleteConfirm === line.id && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
            <p className="text-sm text-slate-300 flex-1">Confirmer la suppression ?</p>
            <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>
              Annuler
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleDelete(line.id)}>
              Supprimer
            </Button>
          </div>
        )}
      </div>
    )
  }

  const renderTotalCard = (title: string, totals: typeof fonctionnementTotals, color: string) => (
    <div className={`bg-gradient-to-br ${color} rounded-lg p-6 border border-slate-700`}>
      <h3 className="text-xl font-bold text-slate-50 mb-4">{title}</h3>
      <div className="grid grid-cols-4 gap-6">
        <div>
          <p className="text-sm text-slate-400 mb-2">Budget alloué</p>
          <p className="text-3xl font-bold text-cyan-300">{totals.previsionnel.toLocaleString('fr-FR')}€</p>
        </div>
        <div>
          <p className="text-sm text-slate-400 mb-2">Dépenses prévisionnelles</p>
          <p className="text-3xl font-bold text-purple-300">{totals.depenses.toLocaleString('fr-FR')}€</p>
        </div>
        <div>
          <p className="text-sm text-slate-400 mb-2">Engagé (BCs)</p>
          <p className="text-3xl font-bold text-orange-300">{totals.engaged.toLocaleString('fr-FR')}€</p>
        </div>
        <div>
          <p className="text-sm text-slate-400 mb-2">Factures liées (Réel)</p>
          <p className="text-3xl font-bold text-green-300">{totals.realized.toLocaleString('fr-FR')}€</p>
        </div>
      </div>
    </div>
  )

  const fonctionnementLines = forecastBudgetLines.filter(line => line.nature === 'Fonctionnement')
  const investissementLines = forecastBudgetLines.filter(line => line.nature === 'Investissement')

  // Render list view
  const renderListView = () => (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700">
      {/* Filters and Search */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex gap-4 flex-wrap items-center mb-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher une dépense..."
                value={expenseSearchTerm}
                onChange={(e) => setExpenseSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-700"
              />
            </div>
          </div>

          <Select value={expenseNatureFilter} onValueChange={(value: any) => setExpenseNatureFilter(value)}>
            <SelectTrigger className="w-[200px] bg-slate-900 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-slate-50">Toutes natures</SelectItem>
              <SelectItem value="Fonctionnement" className="text-slate-50">Fonctionnement</SelectItem>
              <SelectItem value="Investissement" className="text-slate-50">Investissement</SelectItem>
            </SelectContent>
          </Select>

          <Select value={expenseBudgetLineFilter} onValueChange={setExpenseBudgetLineFilter}>
            <SelectTrigger className="w-[250px] bg-slate-900 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-slate-50">Toutes lignes budgétaires</SelectItem>
              {forecastBudgetLines.map((line: any) => (
                <SelectItem key={line.id} value={line.id} className="text-slate-50">
                  {line.label} ({line.nature})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => openAddModal('Fonctionnement')} className="bg-blue-600 hover:bg-blue-700" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une ligne budgétaire
          </Button>
          <Button onClick={() => openAddExpenseModal('Fonctionnement')} className="bg-cyan-600 hover:bg-cyan-700" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une dépense
          </Button>
        </div>

        {/* Bulk actions */}
        {selectedExpenses.length > 0 && (
          <div className="flex gap-2 mt-4 p-3 bg-cyan-900/20 rounded border border-cyan-700/50">
            <span className="text-sm text-cyan-400 font-semibold flex items-center">
              {selectedExpenses.length} dépense(s) sélectionnée(s)
            </span>
            <div className="flex-1"></div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkEditModalOpen(true)}
              className="border-cyan-700 text-cyan-400 hover:bg-cyan-900/30"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Modifier la sélection
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
            >
              <Trash className="h-4 w-4 mr-2" />
              Supprimer la sélection
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedExpenses.length === filteredExpenses.length && filteredExpenses.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-600"
                />
              </th>
              <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase">Nom</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase">Ligne budgétaire</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase">Nature</th>
              <th className="p-3 text-right text-xs font-semibold text-slate-400 uppercase">Montant</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase">Description</th>
              <th className="p-3 text-center text-xs font-semibold text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense: any) => {
                const budgetLine = forecastBudgetLines.find((line: any) => line.id === expense.forecastBudgetLineId)
                const linkedInvoices = expense.linkedInvoices || []
                const totalRealized = linkedInvoices.reduce((sum: number, inv: any) => sum + inv.amount, 0)
                const variance = totalRealized - expense.amount
                const hasLinkedInvoices = linkedInvoices.length > 0

                return (
                  <tr
                    key={expense.id}
                    className={`transition-colors ${
                      hasLinkedInvoices
                        ? 'bg-green-900/10 opacity-70'
                        : 'hover:bg-slate-900/50'
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedExpenses.includes(expense.id)}
                        onChange={() => handleSelectExpense(expense.id)}
                        disabled={hasLinkedInvoices}
                        className="rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${hasLinkedInvoices ? 'text-slate-400' : 'text-slate-200'}`}>
                            {expense.label}
                          </span>
                          {hasLinkedInvoices && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-600 text-white">
                              ✓ Facturée
                            </span>
                          )}
                        </div>
                        {hasLinkedInvoices && (
                          <div className="mt-1 space-y-0.5">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-500">Prévu: {expense.amount.toLocaleString('fr-FR')}€</span>
                              <span className="text-slate-500">→</span>
                              <span className="text-cyan-400 font-medium">Réel: {totalRealized.toLocaleString('fr-FR')}€</span>
                              <span className={`font-bold ${variance < 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {variance < 0 ? '↓' : '↑'} {Math.abs(variance).toLocaleString('fr-FR')}€
                              </span>
                            </div>
                            {linkedInvoices.map((inv: any) => (
                              <div key={inv.id} className="text-xs text-slate-400">
                                📄 Facture: {inv.number} • {inv.vendor} • {inv.amount.toLocaleString('fr-FR')}€
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`text-sm ${hasLinkedInvoices ? 'text-slate-400' : 'text-slate-300'}`}>
                        {budgetLine?.label || '-'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        budgetLine?.nature === 'Fonctionnement'
                          ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                          : 'bg-purple-900/50 text-purple-300 border border-purple-700/50'
                      }`}>
                        {budgetLine?.nature || '-'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`text-sm font-bold ${hasLinkedInvoices ? 'text-slate-500' : 'text-cyan-400'}`}>
                        {expense.amount.toLocaleString('fr-FR')}€
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-slate-400 line-clamp-2">{expense.description || '-'}</span>
                    </td>
                    <td className="p-3">
                      {!hasLinkedInvoices ? (
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditExpenseModal(expense)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-cyan-400"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-center">
                          <span className="text-xs text-slate-500 italic">Non modifiable</span>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  Aucune dépense trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer stats */}
      <div className="p-4 border-t border-slate-700 bg-slate-900/30">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">
            {filteredExpenses.length} dépense(s) • Total: <span className="font-bold text-cyan-400">
              {filteredExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0).toLocaleString('fr-FR')}€
            </span>
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-50">Budget Prévisionnel</h2>
            <p className="text-slate-400 mt-2">Gestion des budgets prévisionnels et suivi des dépenses</p>
          </div>

          {/* Sélecteur d'année et actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setCreateYearModalOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle année
            </Button>

            <Calendar className="h-5 w-5 text-cyan-400" />
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => handleYearChange(parseInt(value))}
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

        {/* Enveloppes budgétaires */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-cyan-400" />
              <h3 className="text-xl font-bold text-slate-50">Enveloppes Budgétaires {selectedYear}</h3>
            </div>
            <Button
              size="sm"
              onClick={() => setEnvelopeModalOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white border-0"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              {annualBudget.exists ? 'Modifier' : 'Définir'} les enveloppes
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/50">
              <p className="text-sm text-blue-400 mb-2 font-semibold">Budget Fonctionnement</p>
              <p className="text-3xl font-bold text-blue-300">
                {annualBudget.budgetFonctionnement.toLocaleString('fr-FR')}€
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Réparti: {fonctionnementTotals.previsionnel.toLocaleString('fr-FR')}€
              </p>
              <p className={`text-sm font-semibold mt-1 ${
                (annualBudget.budgetFonctionnement - fonctionnementTotals.previsionnel) >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                Reste à répartir: {(annualBudget.budgetFonctionnement - fonctionnementTotals.previsionnel).toLocaleString('fr-FR')}€
              </p>
            </div>

            <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/50">
              <p className="text-sm text-purple-400 mb-2 font-semibold">Budget Investissement</p>
              <p className="text-3xl font-bold text-purple-300">
                {annualBudget.budgetInvestissement.toLocaleString('fr-FR')}€
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Réparti: {investissementTotals.previsionnel.toLocaleString('fr-FR')}€
              </p>
              <p className={`text-sm font-semibold mt-1 ${
                (annualBudget.budgetInvestissement - investissementTotals.previsionnel) >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                Reste à répartir: {(annualBudget.budgetInvestissement - investissementTotals.previsionnel).toLocaleString('fr-FR')}€
              </p>
            </div>
          </div>

          {(!annualBudget.exists || (annualBudget.budgetFonctionnement === 0 && annualBudget.budgetInvestissement === 0)) && (
            <div className="mt-4 flex items-center gap-2 text-amber-400 bg-amber-900/20 rounded-lg p-3 border border-amber-700/50">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">
                Aucune enveloppe budgétaire définie pour {selectedYear}. Cliquez sur "Définir les enveloppes" pour commencer.
              </p>
            </div>
          )}
        </div>

        {/* Grand Total */}
        {renderTotalCard('TOTAL BUDGET', grandTotal, 'from-purple-900/30 to-indigo-900/30')}

        {/* View toggle and expense management */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-slate-50">Gestion des Dépenses Prévisionnelles</h3>
              <span className="text-sm text-slate-400">({forecastExpenses.length} dépense{forecastExpenses.length > 1 ? 's' : ''})</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className={viewMode === 'cards' ? 'bg-cyan-600 hover:bg-cyan-700' : ''}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Vue cartes
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-cyan-600 hover:bg-cyan-700' : ''}
              >
                <List className="h-4 w-4 mr-2" />
                Vue liste
              </Button>
            </div>
          </div>

          {viewMode === 'list' && renderListView()}
        </div>

        {/* FONCTIONNEMENT */}
        {viewMode === 'cards' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-blue-400" />
                <h3 className="text-2xl font-bold text-slate-50">Fonctionnement</h3>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => openAddModal('Fonctionnement')} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une ligne budgétaire
                </Button>
                <Button onClick={() => openAddExpenseModal('Fonctionnement')} className="bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une dépense
                </Button>
              </div>
            </div>

          {renderTotalCard('Total Fonctionnement', fonctionnementTotals, 'from-blue-900/30 to-cyan-900/30')}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {fonctionnementLines.length > 0 ? (
              fonctionnementLines.map(renderBudgetCard)
            ) : (
              <div className="col-span-2 text-center py-12 text-slate-400">
                Aucune ligne de fonctionnement pour {selectedYear}
              </div>
            )}
          </div>
          </div>
        )}

        {/* INVESTISSEMENT */}
        {viewMode === 'cards' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-6 w-6 text-purple-400" />
                <h3 className="text-2xl font-bold text-slate-50">Investissement</h3>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => openAddModal('Investissement')} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une ligne budgétaire
                </Button>
                <Button onClick={() => openAddExpenseModal('Investissement')} className="bg-pink-600 hover:bg-pink-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une dépense
                </Button>
              </div>
            </div>

            {renderTotalCard('Total Investissement', investissementTotals, 'from-purple-900/30 to-pink-900/30')}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              {investissementLines.length > 0 ? (
                investissementLines.map(renderBudgetCard)
              ) : (
                <div className="col-span-2 text-center py-12 text-slate-400">
                  Aucune ligne d'investissement pour {selectedYear}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de création d'année */}
        <Dialog open={createYearModalOpen} onOpenChange={setCreateYearModalOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-50">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle année budgétaire</DialogTitle>
              <DialogDescription className="text-slate-400">
                Créez une nouvelle année vierge ou copiez les budgets d'une année existante
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newYear">Année *</Label>
                <Input
                  id="newYear"
                  type="number"
                  value={newYearData.year}
                  onChange={(e) => setNewYearData({ ...newYearData, year: parseInt(e.target.value) })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="Ex: 2027"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="copyFrom">Copier depuis (optionnel)</Label>
                <Select
                  value={newYearData.copyFrom}
                  onValueChange={(value) => setNewYearData({ ...newYearData, copyFrom: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Année vierge" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="none" className="text-slate-50">Année vierge</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()} className="text-slate-50">
                        Copier {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Si vous copiez une année, les budgets prévisionnels seront repris (engagé et facturé remis à 0)
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateYearModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateYear} className="bg-cyan-600 hover:bg-cyan-700">
                Créer l'année
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de définition des enveloppes */}
        <Dialog open={envelopeModalOpen} onOpenChange={setEnvelopeModalOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-50">
            <DialogHeader>
              <DialogTitle>Définir les enveloppes budgétaires {selectedYear}</DialogTitle>
              <DialogDescription className="text-slate-400">
                Définissez les enveloppes globales pour le fonctionnement et l'investissement
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="envelopeFonctionnement">Budget Fonctionnement (€) *</Label>
                <Input
                  id="envelopeFonctionnement"
                  type="number"
                  value={envelopeForm.budgetFonctionnement}
                  onChange={(e) => setEnvelopeForm({ ...envelopeForm, budgetFonctionnement: e.target.value })}
                  className="bg-slate-800 border-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Ex: 500000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="envelopeInvestissement">Budget Investissement (€) *</Label>
                <Input
                  id="envelopeInvestissement"
                  type="number"
                  value={envelopeForm.budgetInvestissement}
                  onChange={(e) => setEnvelopeForm({ ...envelopeForm, budgetInvestissement: e.target.value })}
                  className="bg-slate-800 border-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Ex: 200000"
                />
              </div>

              <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-4">
                <p className="text-sm text-cyan-400 font-semibold mb-2">Total enveloppe budgétaire</p>
                <p className="text-2xl font-bold text-cyan-300">
                  {(parseFloat(envelopeForm.budgetFonctionnement || '0') + parseFloat(envelopeForm.budgetInvestissement || '0')).toLocaleString('fr-FR')}€
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEnvelopeModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveEnvelopes} className="bg-cyan-600 hover:bg-cyan-700">
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal d'ajout/édition ligne budgétaire */}
        <Dialog open={editModalOpen || addModalOpen} onOpenChange={(open) => { setEditModalOpen(open); setAddModalOpen(open) }}>
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-50 max-w-2xl">
            <DialogHeader>
              <DialogTitle>{formData.id ? 'Modifier' : 'Ajouter'} une ligne budgétaire</DialogTitle>
              <DialogDescription className="text-slate-400">
                {formData.nature} • Année {selectedYear}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Nom de la ligne budgétaire *</Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                    placeholder="Ex: Maintenance logiciels"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Budget prévisionnel (€) *</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="bg-slate-800 border-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Ex: 50000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description détaillée</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="Ex: Achat d'un NDR pour renforcer la détection des menaces..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={formData.typeId} onValueChange={(value) => setFormData({ ...formData, typeId: value })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {types.map((t: any) => (
                        <SelectItem key={t.id} value={t.id} className="text-slate-50">
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domain">Domaine *</Label>
                  <Select value={formData.domainId} onValueChange={(value) => setFormData({ ...formData, domainId: value })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Sélectionner un domaine" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {domains.map((d: any) => (
                        <SelectItem key={d.id} value={d.id} className="text-slate-50">
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pole">Pôle (optionnel)</Label>
                <Select value={formData.poleId} onValueChange={(value) => setFormData({ ...formData, poleId: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Aucun pôle" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="none" className="text-slate-50">Aucun pôle</SelectItem>
                    {poles.map((pole: any) => (
                      <SelectItem key={pole.id} value={pole.id} className="text-slate-50">
                        {pole.serviceName} › {pole.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Attribuez cette ligne budgétaire à un pôle pour une meilleure répartition
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountingCode">Code comptable</Label>
                <Input
                  id="accountingCode"
                  value={formData.accountingCode}
                  onChange={(e) => setFormData({ ...formData, accountingCode: e.target.value })}
                  className="bg-slate-800 border-slate-700 font-mono"
                  placeholder="Ex: 6234"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditModalOpen(false); setAddModalOpen(false) }}>
                Annuler
              </Button>
              <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700">
                {formData.id ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal d'ajout de dépense prévisionnelle */}
        <Dialog open={addExpenseModalOpen} onOpenChange={setAddExpenseModalOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-50 max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter une dépense prévisionnelle</DialogTitle>
              <DialogDescription className="text-slate-400">
                {expenseFormData.nature} • Année {selectedYear}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="budgetLine">Ligne budgétaire *</Label>
                <Select
                  value={expenseFormData.forecastBudgetLineId}
                  onValueChange={(value) => setExpenseFormData({ ...expenseFormData, forecastBudgetLineId: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Sélectionner une ligne budgétaire" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {forecastBudgetLines
                      .filter((line: any) => line.nature === expenseFormData.nature)
                      .map((line: any) => (
                        <SelectItem key={line.id} value={line.id} className="text-slate-50">
                          {line.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expenseLabel">Nom de la dépense *</Label>
                  <Input
                    id="expenseLabel"
                    value={expenseFormData.label}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, label: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                    placeholder="Ex: Licence Adobe Pro - 50 utilisateurs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expenseAmount">Montant estimé (€) *</Label>
                  <Input
                    id="expenseAmount"
                    type="number"
                    value={expenseFormData.amount}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                    className="bg-slate-800 border-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Ex: 15000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseDescription">Description détaillée</Label>
                <Textarea
                  id="expenseDescription"
                  value={expenseFormData.description}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="Ex: Renouvellement licence Creative Cloud pour l'équipe communication..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddExpenseModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveExpense} className="bg-cyan-600 hover:bg-cyan-700">
                Créer la dépense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de modification de dépense prévisionnelle */}
        <Dialog open={editExpenseModalOpen} onOpenChange={setEditExpenseModalOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-50 max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier la dépense prévisionnelle</DialogTitle>
              <DialogDescription className="text-slate-400">
                Modifiez le nom et le montant de la dépense
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editExpenseLabel">Nom de la dépense *</Label>
                <Input
                  id="editExpenseLabel"
                  value={expenseFormData.label}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, label: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="Ex: Licence Adobe Pro - 50 utilisateurs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editExpenseAmount">Montant estimé (€) *</Label>
                <Input
                  id="editExpenseAmount"
                  type="number"
                  value={expenseFormData.amount}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                  className="bg-slate-800 border-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Ex: 15000"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditExpenseModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveExpense} className="bg-cyan-600 hover:bg-cyan-700">
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de modification en masse */}
        <Dialog open={bulkEditModalOpen} onOpenChange={setBulkEditModalOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-50 max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier {selectedExpenses.length} dépense(s)</DialogTitle>
              <DialogDescription className="text-slate-400">
                Appliquez des modifications à toutes les dépenses sélectionnées
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Type de modification</Label>
                <Select
                  value={bulkEditData.action}
                  onValueChange={(value: 'changeLine' | 'applyCoefficient') =>
                    setBulkEditData({ ...bulkEditData, action: value })
                  }
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="changeLine" className="text-slate-50">
                      Changer de ligne budgétaire
                    </SelectItem>
                    <SelectItem value="applyCoefficient" className="text-slate-50">
                      Appliquer un coefficient sur les montants
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {bulkEditData.action === 'changeLine' && (
                <div className="space-y-2">
                  <Label htmlFor="bulkBudgetLine">Nouvelle ligne budgétaire *</Label>
                  <Select
                    value={bulkEditData.budgetLineId}
                    onValueChange={(value) => setBulkEditData({ ...bulkEditData, budgetLineId: value })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Sélectionner une ligne budgétaire" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {forecastBudgetLines.map((line: any) => (
                        <SelectItem key={line.id} value={line.id} className="text-slate-50">
                          {line.label} ({line.nature})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Toutes les dépenses sélectionnées seront déplacées vers cette ligne budgétaire
                  </p>
                </div>
              )}

              {bulkEditData.action === 'applyCoefficient' && (
                <div className="space-y-2">
                  <Label htmlFor="bulkCoefficient">Coefficient multiplicateur *</Label>
                  <Input
                    id="bulkCoefficient"
                    type="number"
                    step="0.01"
                    value={bulkEditData.coefficient}
                    onChange={(e) => setBulkEditData({ ...bulkEditData, coefficient: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                    placeholder="Ex: 1.05 pour +5%"
                  />
                  <p className="text-xs text-slate-500">
                    Exemples: 1.05 pour +5%, 0.95 pour -5%, 1.10 pour +10%
                  </p>
                  {bulkEditData.coefficient && parseFloat(bulkEditData.coefficient) !== 1 && (
                    <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-3">
                      <p className="text-sm text-cyan-400">
                        Les montants seront multipliés par {bulkEditData.coefficient}
                        {parseFloat(bulkEditData.coefficient) > 1 && (
                          <span className="text-green-400"> (+{((parseFloat(bulkEditData.coefficient) - 1) * 100).toFixed(1)}%)</span>
                        )}
                        {parseFloat(bulkEditData.coefficient) < 1 && (
                          <span className="text-red-400"> ({((parseFloat(bulkEditData.coefficient) - 1) * 100).toFixed(1)}%)</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkEditModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleBulkEdit} className="bg-cyan-600 hover:bg-cyan-700">
                Appliquer les modifications
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
