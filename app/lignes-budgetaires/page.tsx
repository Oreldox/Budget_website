'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Search, Calendar, Tag, Folder, Edit2, Trash2, Plus, FileText, Receipt, TrendingUp, TrendingDown, MessageSquare, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useBudgetStructure, useContracts, useInvoices } from '@/lib/hooks'

export default function LignesBudgetairesPage() {
  const { budgetLines, types, domains, addBudgetLine, updateBudgetLine, deleteBudgetLine } = useBudgetStructure()
  const { contracts } = useContracts()
  const { invoices } = useInvoices()

  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [natureFilter, setNatureFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [domainFilter, setDomainFilter] = useState<string>('all')

  // Services and poles state
  const [services, setServices] = useState<any[]>([])
  const [poles, setPoles] = useState<any[]>([])

  // Modal states
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Comments state
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)

  // Pole allocations state
  const [poleAllocations, setPoleAllocations] = useState<Array<{ poleId: string; percentage: number }>>([])
  const [useMultiplePoles, setUseMultiplePoles] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    label: '',
    description: '',
    typeId: '',
    domainId: '',
    nature: 'Fonctionnement',
    accountingCode: '',
    year: new Date().getFullYear(),
    budget: '',
    poleId: 'none'
  })

  // Fetch services and poles
  const fetchServicesAndPoles = useCallback(async () => {
    try {
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data)
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

  useEffect(() => {
    fetchServicesAndPoles()
  }, [fetchServicesAndPoles])

  // Fetch comments when selectedLineId changes
  useEffect(() => {
    if (selectedLineId && showDetails) {
      fetchComments(selectedLineId)
    }
  }, [selectedLineId, showDetails])

  const fetchComments = async (lineId: string) => {
    try {
      setLoadingComments(true)
      const response = await fetch(`/api/budget-lines/${lineId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleAddComment = async () => {
    if (!selectedLineId || !newComment.trim()) return

    try {
      setSubmittingComment(true)
      const response = await fetch(`/api/budget-lines/${selectedLineId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      })

      if (response.ok) {
        const comment = await response.json()
        setComments([comment, ...comments])
        setNewComment('')
        toast.success('Commentaire ajouté')
      } else {
        toast.error('Erreur lors de l\'ajout du commentaire')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Erreur lors de l\'ajout du commentaire')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedLineId) return

    try {
      const response = await fetch(`/api/budget-lines/${selectedLineId}/comments/${commentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId))
        toast.success('Commentaire supprimé')
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  // Extract unique years from budget lines
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    budgetLines.forEach(line => {
      const lineWithYearlyBudgets = line as any
      if (lineWithYearlyBudgets.yearlyBudgets) {
        lineWithYearlyBudgets.yearlyBudgets.forEach((yb: any) => years.add(yb.year))
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [budgetLines])

  // Filter budget lines
  const filteredLines = useMemo(() => {
    return budgetLines.filter(line => {
      const lineWithDetails = line as any

      // Search filter
      if (search && !line.label.toLowerCase().includes(search.toLowerCase()) &&
          !line.description?.toLowerCase().includes(search.toLowerCase())) {
        return false
      }

      // Nature filter
      if (natureFilter !== 'all' && line.nature !== natureFilter) {
        return false
      }

      // Type filter
      if (typeFilter !== 'all' && line.typeId !== typeFilter) {
        return false
      }

      // Domain filter
      if (domainFilter !== 'all' && line.domainId !== domainFilter) {
        return false
      }

      // Year filter
      if (yearFilter !== 'all') {
        const yearInt = parseInt(yearFilter)
        const hasYear = lineWithDetails.yearlyBudgets?.some((yb: any) => yb.year === yearInt)
        if (!hasYear) return false
      }

      return true
    })
  }, [budgetLines, search, yearFilter, natureFilter, typeFilter, domainFilter])

  // Get stats for a budget line
  const getLineStats = (lineId: string) => {
    const lineContracts = contracts.filter(c => c.budgetLineId === lineId)
    const lineInvoices = invoices.filter(i => i.budgetLineId === lineId)
    const totalContractAmount = lineContracts.reduce((sum, c) => sum + (c.amount || 0), 0)
    const totalInvoiceAmount = lineInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)

    return {
      contractCount: lineContracts.length,
      invoiceCount: lineInvoices.length,
      totalContractAmount,
      totalInvoiceAmount,
      contracts: lineContracts,
      invoices: lineInvoices
    }
  }

  // Get yearly budget for a line
  const getYearlyBudget = (line: any, year?: number) => {
    if (!line.yearlyBudgets) return { budget: 0, engineered: 0, invoiced: 0 }

    if (year) {
      const yb = line.yearlyBudgets.find((yb: any) => yb.year === year)
      return yb || { budget: 0, engineered: 0, invoiced: 0 }
    }

    // Sum all years
    return line.yearlyBudgets.reduce((acc: any, yb: any) => ({
      budget: acc.budget + (yb.budget || 0),
      engineered: acc.engineered + (yb.engineered || 0),
      invoiced: acc.invoiced + (yb.invoiced || 0)
    }), { budget: 0, engineered: 0, invoiced: 0 })
  }

  const fetchPoleAllocations = async (lineId: string) => {
    try {
      const response = await fetch(`/api/budget-lines/${lineId}/pole-allocations`)
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          setPoleAllocations(data.map((a: any) => ({ poleId: a.poleId, percentage: a.percentage })))
          setUseMultiplePoles(true)
        } else {
          setPoleAllocations([])
          setUseMultiplePoles(false)
        }
      }
    } catch (error) {
      console.error('Error fetching pole allocations:', error)
    }
  }

  const openEditModal = async (line: any) => {
    const yearlyBudget = yearFilter !== 'all'
      ? line.yearlyBudgets?.find((yb: any) => yb.year === parseInt(yearFilter))
      : line.yearlyBudgets?.[0]

    setFormData({
      id: line.id,
      label: line.label,
      description: line.description || '',
      typeId: line.typeId || '',
      domainId: line.domainId || '',
      nature: line.nature,
      accountingCode: line.accountingCode || '',
      year: yearlyBudget?.year || new Date().getFullYear(),
      budget: yearlyBudget?.budget?.toString() || '',
      poleId: line.poleId || 'none'
    })

    // Charger les allocations de pôles
    await fetchPoleAllocations(line.id)

    setShowEditModal(true)
  }

  const openAddModal = () => {
    setFormData({
      id: '',
      label: '',
      description: '',
      typeId: '',
      domainId: '',
      nature: 'Fonctionnement',
      accountingCode: '',
      year: yearFilter !== 'all' ? parseInt(yearFilter) : new Date().getFullYear(),
      budget: '',
      poleId: 'none'
    })
    setPoleAllocations([])
    setUseMultiplePoles(false)
    setShowAddModal(true)
  }

  const handleSubmit = async () => {
    if (!formData.label.trim()) {
      toast.error('Le nom est requis')
      return
    }

    // Valider les allocations de pôles si mode multi-pôles activé
    if (useMultiplePoles && poleAllocations.length > 0) {
      const totalPercentage = poleAllocations.reduce((sum, a) => sum + a.percentage, 0)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast.error(`La somme des pourcentages doit être égale à 100% (actuellement ${totalPercentage.toFixed(1)}%)`)
        return
      }
    }

    try {
      if (formData.id) {
        // Update: send only updatable fields
        const updateData: any = {
          label: formData.label,
          description: formData.description,
          accountingCode: formData.accountingCode,
          poleId: useMultiplePoles ? null : (formData.poleId && formData.poleId !== 'none' ? formData.poleId : null),
          budget: formData.budget ? parseFloat(formData.budget) : undefined
        }
        // Only include nature if it's not null
        if (formData.nature) {
          updateData.nature = formData.nature
        }
        await updateBudgetLine(formData.id, updateData)

        // Sauvegarder les allocations de pôles
        if (useMultiplePoles) {
          await fetch(`/api/budget-lines/${formData.id}/pole-allocations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allocations: poleAllocations }),
          })
        } else {
          // Supprimer les allocations si mode single pole
          await fetch(`/api/budget-lines/${formData.id}/pole-allocations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allocations: [] }),
          })
        }

        setShowEditModal(false)
        toast.success('Ligne budgétaire modifiée')
      } else {
        // Create: send all fields including yearlyBudgets
        const createData = {
          label: formData.label,
          description: formData.description,
          typeId: formData.typeId || undefined,
          domainId: formData.domainId || undefined,
          nature: formData.nature,
          accountingCode: formData.accountingCode,
          poleId: useMultiplePoles ? null : (formData.poleId && formData.poleId !== 'none' ? formData.poleId : null),
          yearlyBudgets: formData.budget ? [{
            year: formData.year,
            budget: parseFloat(formData.budget)
          }] : []
        }
        const newLine = await addBudgetLine(createData as any)

        // Sauvegarder les allocations de pôles pour la nouvelle ligne
        if (useMultiplePoles && newLine && newLine.id) {
          await fetch(`/api/budget-lines/${newLine.id}/pole-allocations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allocations: poleAllocations }),
          })
        }

        setShowAddModal(false)
        toast.success('Ligne budgétaire créée')
      }
    } catch (error) {
      console.error('Error saving budget line:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleDelete = (id: string) => {
    const stats = getLineStats(id)
    if (stats.contractCount > 0 || stats.invoiceCount > 0) {
      toast.error(`Impossible de supprimer : ${stats.contractCount} contrat(s) et ${stats.invoiceCount} facture(s) associés`)
      return
    }
    deleteBudgetLine(id)
    setDeleteConfirmId(null)
    toast.success('Ligne budgétaire supprimée')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
  }

  const selectedLine = budgetLines.find(l => l.id === selectedLineId)
  const selectedLineStats = selectedLineId ? getLineStats(selectedLineId) : null

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-50">Lignes Budgétaires</h2>
            <p className="text-slate-400 mt-2">Vue d'ensemble et gestion de toutes vos lignes budgétaires</p>
          </div>
          <Button onClick={openAddModal} className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle ligne
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Rechercher une ligne..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700"
              />
            </div>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">Toutes années</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={natureFilter} onValueChange={setNatureFilter}>
              <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">Toutes natures</SelectItem>
                <SelectItem value="Fonctionnement">Fonctionnement</SelectItem>
                <SelectItem value="Investissement">Investissement</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700">
                <Tag className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">Tous types</SelectItem>
                {types.map(type => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700">
                <Folder className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">Tous domaines</SelectItem>
                {domains.map(domain => (
                  <SelectItem key={domain.id} value={domain.id}>{domain.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-slate-400">
            {filteredLines.length} ligne(s) • Total budget: <span className="text-cyan-400 font-semibold">
              {formatCurrency(filteredLines.reduce((sum, line) => {
                const yb = getYearlyBudget(line, yearFilter !== 'all' ? parseInt(yearFilter) : undefined)
                return sum + yb.budget
              }, 0))}
            </span>
          </div>
        </div>

        {/* Budget Lines List */}
        <div className="space-y-3">
          {filteredLines.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Aucune ligne budgétaire trouvée
            </div>
          ) : (
            filteredLines.map(line => {
              const lineWithDetails = line as any
              const type = types.find(t => t.id === line.typeId)
              const domain = domains.find(d => d.id === line.domainId)
              const stats = getLineStats(line.id)
              const yearlyBudget = getYearlyBudget(lineWithDetails, yearFilter !== 'all' ? parseInt(yearFilter) : undefined)

              return (
                <div
                  key={line.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-800/50 transition-colors"
                >
                  <div
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                    onClick={() => {
                      setSelectedLineId(line.id)
                      setShowDetails(true)
                    }}
                  >
                    {/* Nature icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      line.nature === 'Fonctionnement'
                        ? 'bg-blue-900/30 border border-blue-700/50'
                        : 'bg-purple-900/30 border border-purple-700/50'
                    }`}>
                      {line.nature === 'Fonctionnement' ? (
                        <TrendingUp className="h-5 w-5 text-blue-400" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-purple-400" />
                      )}
                    </div>

                    {/* Line info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-50">{line.label}</p>
                        {type && (
                          <span
                            className="px-2 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: `${type.color}20`,
                              color: type.color
                            }}
                          >
                            {type.name}
                          </span>
                        )}
                        {domain && (
                          <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                            {domain.name}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          line.nature === 'Fonctionnement'
                            ? 'bg-blue-900/30 text-blue-400'
                            : 'bg-purple-900/30 text-purple-400'
                        }`}>
                          {line.nature}
                        </span>
                        {lineWithDetails.poleAllocations && lineWithDetails.poleAllocations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {lineWithDetails.poleAllocations.map((allocation: any) => (
                              <span key={allocation.id} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-purple-900/50 text-purple-300 border border-purple-700/50">
                                <span>{allocation.pole.service?.name} › {allocation.pole.name}</span>
                                <span className="font-semibold text-purple-200">{allocation.percentage}%</span>
                              </span>
                            ))}
                          </div>
                        ) : lineWithDetails.pole ? (
                          <span className="inline-block px-2 py-1 rounded text-xs bg-purple-900/50 text-purple-300 border border-purple-700/50">
                            {lineWithDetails.pole.service?.name} › {lineWithDetails.pole.name}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        Budget: {formatCurrency(yearlyBudget.budget)} •
                        Engagé: {formatCurrency(yearlyBudget.engineered)} •
                        Facturé: {formatCurrency(yearlyBudget.invoiced)} •
                        {stats.contractCount} contrat(s) • {stats.invoiceCount} facture(s)
                      </p>
                      {line.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{line.description}</p>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="w-32 hidden lg:block">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">
                          {yearlyBudget.budget > 0
                            ? Math.round((yearlyBudget.invoiced / yearlyBudget.budget) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            yearlyBudget.budget > 0 && (yearlyBudget.invoiced / yearlyBudget.budget) > 1
                              ? 'bg-red-500'
                              : yearlyBudget.budget > 0 && (yearlyBudget.invoiced / yearlyBudget.budget) > 0.8
                              ? 'bg-amber-500'
                              : 'bg-cyan-500'
                          }`}
                          style={{
                            width: `${Math.min((yearlyBudget.invoiced / (yearlyBudget.budget || 1)) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(lineWithDetails)
                      }}
                      className="h-8 w-8 p-0 hover:bg-slate-700"
                    >
                      <Edit2 className="h-4 w-4 text-slate-400" />
                    </Button>
                    {stats.contractCount === 0 && stats.invoiceCount === 0 ? (
                      deleteConfirmId === line.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(line.id)}
                            className="h-8"
                          >
                            Confirmer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirmId(null)}
                            className="h-8 bg-slate-800 border-slate-700"
                          >
                            Annuler
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConfirmId(line.id)
                          }}
                          className="h-8 w-8 p-0 hover:bg-red-900/20 text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Details Sheet */}
      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent className="bg-slate-900 border-slate-700 text-slate-50 sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-slate-50 text-xl">
              {selectedLine && (
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedLine.nature === 'Fonctionnement'
                      ? 'bg-blue-900/30 border border-blue-700/50'
                      : 'bg-purple-900/30 border border-purple-700/50'
                  }`}>
                    {selectedLine.nature === 'Fonctionnement' ? (
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-purple-400" />
                    )}
                  </div>
                  <span>{selectedLine.label}</span>
                </div>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {selectedLine && selectedLineStats && (() => {
              const lineWithDetails = selectedLine as any
              const type = types.find(t => t.id === selectedLine.typeId)
              const domain = domains.find(d => d.id === selectedLine.domainId)
              const yearlyBudget = getYearlyBudget(lineWithDetails, yearFilter !== 'all' ? parseInt(yearFilter) : undefined)

              return (
                <>
                  {/* Description */}
                  {selectedLine.description && (
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-300">{selectedLine.description}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4">
                    {type && (
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                        <p className="text-xs text-slate-400 mb-1">Type</p>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: type.color }} />
                          <p className="text-sm font-medium text-slate-200">{type.name}</p>
                        </div>
                      </div>
                    )}
                    {domain && (
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                        <p className="text-xs text-slate-400 mb-1">Domaine</p>
                        <p className="text-sm font-medium text-slate-200">{domain.name}</p>
                      </div>
                    )}
                  </div>

                  {/* Pole Allocations */}
                  {lineWithDetails.poleAllocations && lineWithDetails.poleAllocations.length > 0 ? (
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-xs text-slate-400 mb-3">Répartition par pôles</p>
                      <div className="space-y-2">
                        {lineWithDetails.poleAllocations.map((allocation: any) => (
                          <div key={allocation.id} className="flex items-center justify-between p-2 rounded bg-purple-900/20 border border-purple-700/30">
                            <span className="text-sm text-slate-200">
                              {allocation.pole.service?.name} › {allocation.pole.name}
                            </span>
                            <span className="text-sm font-semibold text-purple-300">{allocation.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : lineWithDetails.pole && (
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-xs text-slate-400 mb-2">Pôle</p>
                      <p className="text-sm font-medium text-slate-200">
                        {lineWithDetails.pole.service?.name} › {lineWithDetails.pole.name}
                      </p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Budget Prévu</p>
                      <p className="text-2xl font-bold text-cyan-400 mt-1">{formatCurrency(yearlyBudget.budget)}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Engagé</p>
                      <p className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(yearlyBudget.engineered)}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {selectedLineStats.contractCount} contrat(s)
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400">Facturé</p>
                      <p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(yearlyBudget.invoiced)}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {selectedLineStats.invoiceCount} facture(s)
                      </p>
                    </div>
                  </div>

                  {/* Contracts */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-cyan-400" />
                        Contrats ({selectedLineStats.contractCount})
                      </h3>
                    </div>
                    {selectedLineStats.contractCount === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Aucun contrat associé</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedLineStats.contracts.map(contract => (
                          <Link
                            key={contract.id}
                            href={`/contrats?id=${contract.id}`}
                            className="block p-3 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 hover:border-cyan-600/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-slate-200">{contract.label}</p>
                                <p className="text-sm text-slate-400 mt-1">
                                  {contract.vendor} • {contract.number}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {new Date(contract.startDate).toLocaleDateString('fr-FR')} - {new Date(contract.endDate).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-cyan-400">{formatCurrency(contract.amount)}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Invoices */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-amber-400" />
                        Factures ({selectedLineStats.invoiceCount})
                      </h3>
                    </div>
                    {selectedLineStats.invoiceCount === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Aucune facture associée</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedLineStats.invoices.map(invoice => (
                          <Link
                            key={invoice.id}
                            href={`/factures?id=${invoice.id}`}
                            className="block p-3 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 hover:border-amber-600/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-slate-200">{invoice.description}</p>
                                <p className="text-sm text-slate-400 mt-1">
                                  {invoice.vendor} • {invoice.number}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')}
                                  {invoice.status && (
                                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                      invoice.status === 'Payée' ? 'bg-green-900/30 text-green-400' : 'bg-orange-900/30 text-orange-400'
                                    }`}>
                                      {invoice.status}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-amber-400">{formatCurrency(invoice.amount)}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Comments Section */}
                  <div className="space-y-3 border-t border-slate-700 pt-6">
                    <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-cyan-400" />
                      Commentaires ({comments.length})
                    </h3>

                    {/* Add comment form */}
                    <div className="space-y-2">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Ajouter un commentaire..."
                        className="bg-slate-800 border-slate-700 text-slate-50 min-h-[80px]"
                        rows={3}
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || submittingComment}
                          className="bg-cyan-600 hover:bg-cyan-700"
                          size="sm"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {submittingComment ? 'Envoi...' : 'Envoyer'}
                        </Button>
                      </div>
                    </div>

                    {/* Comments list */}
                    {loadingComments ? (
                      <p className="text-sm text-slate-400 text-center py-4">Chargement des commentaires...</p>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Aucun commentaire pour le moment</p>
                    ) : (
                      <div className="space-y-3">
                        {comments.map(comment => (
                          <div
                            key={comment.id}
                            className="p-3 rounded-lg border border-slate-700 bg-slate-800/30"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-sm font-medium text-slate-200">
                                  {comment.user?.name || comment.user?.email || 'Utilisateur inconnu'}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(comment.createdAt).toLocaleString('fr-FR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Supprimer ce commentaire ?')) {
                                    handleDeleteComment(comment.id)
                                  }
                                }}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add/Edit Modal */}
      <Dialog open={showEditModal || showAddModal} onOpenChange={(open) => { setShowEditModal(open); setShowAddModal(open) }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-50 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formData.id ? 'Modifier' : 'Ajouter'} une ligne budgétaire</DialogTitle>
            <DialogDescription className="text-slate-400">
              Créez ou modifiez une ligne budgétaire pour organiser vos dépenses
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="label">Nom de la ligne *</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="Ex: Licences Microsoft"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nature">Nature *</Label>
                <Select value={formData.nature} onValueChange={(value) => setFormData({ ...formData, nature: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="Fonctionnement">Fonctionnement</SelectItem>
                    <SelectItem value="Investissement">Investissement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-800 border-slate-700"
                placeholder="Description détaillée de la ligne budgétaire..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.typeId} onValueChange={(value) => setFormData({ ...formData, typeId: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {types.map(type => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">Domaine</Label>
                <Select value={formData.domainId} onValueChange={(value) => setFormData({ ...formData, domainId: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Sélectionner un domaine" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {domains.map(domain => (
                      <SelectItem key={domain.id} value={domain.id}>{domain.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Année</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget prévisionnel (€)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="Ex: 150000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountingCode">Code comptable</Label>
                <Input
                  id="accountingCode"
                  value={formData.accountingCode}
                  onChange={(e) => setFormData({ ...formData, accountingCode: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="Ex: 6063"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label>Pôle(s)</Label>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="checkbox"
                      id="useMultiplePoles"
                      checked={useMultiplePoles}
                      onChange={(e) => {
                        setUseMultiplePoles(e.target.checked)
                        if (e.target.checked) {
                          // Convertir le pôle unique en allocation si nécessaire
                          if (formData.poleId && formData.poleId !== 'none') {
                            setPoleAllocations([{ poleId: formData.poleId, percentage: 100 }])
                          }
                        } else {
                          // Réinitialiser aux allocations simples
                          setPoleAllocations([])
                        }
                      }}
                      className="w-4 h-4 text-cyan-600 bg-slate-800 border-slate-600 rounded focus:ring-cyan-500 flex-shrink-0"
                    />
                    <Label htmlFor="useMultiplePoles" className="text-xs text-slate-400 cursor-pointer whitespace-nowrap">
                      Multi-pôles
                    </Label>
                  </div>
                </div>

                {!useMultiplePoles ? (
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
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-3">
                      {poleAllocations.map((allocation, index) => (
                        <div key={index} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400">Pôle {index + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newAllocations = poleAllocations.filter((_, i) => i !== index)
                                setPoleAllocations(newAllocations)
                              }}
                              className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Supprimer
                            </Button>
                          </div>
                          <div className="grid grid-cols-[1fr_100px] gap-2">
                            <div>
                              <Label className="text-xs text-slate-400 mb-1">Pôle</Label>
                              <Select
                                value={allocation.poleId}
                                onValueChange={(value) => {
                                  const newAllocations = [...poleAllocations]
                                  newAllocations[index].poleId = value
                                  setPoleAllocations(newAllocations)
                                }}
                              >
                                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-50 h-9">
                                  <SelectValue placeholder="Choisir un pôle" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                  {poles.map((pole: any) => (
                                    <SelectItem key={pole.id} value={pole.id} className="text-slate-50">
                                      {pole.serviceName} › {pole.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-slate-400 mb-1">Part (%)</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={allocation.percentage}
                                onChange={(e) => {
                                  const newAllocations = [...poleAllocations]
                                  newAllocations[index].percentage = parseFloat(e.target.value) || 0
                                  setPoleAllocations(newAllocations)
                                }}
                                className="bg-slate-800 border-slate-700 text-slate-50 text-center h-9"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPoleAllocations([...poleAllocations, { poleId: '', percentage: 0 }])
                      }}
                      className="w-full border-slate-700 hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un pôle
                    </Button>

                    {poleAllocations.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                        <span className="text-sm text-slate-400">Total des pourcentages</span>
                        <span className={`text-sm font-semibold ${
                          Math.abs(poleAllocations.reduce((sum, a) => sum + a.percentage, 0) - 100) < 0.01
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}>
                          {poleAllocations.reduce((sum, a) => sum + a.percentage, 0).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditModal(false); setShowAddModal(false) }}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} className="bg-cyan-600 hover:bg-cyan-700">
              {formData.id ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
