'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Building2, Users, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Pole {
  id: string
  serviceId: string
  name: string
  description?: string
  color?: string
  service?: any
  _count?: {
    budgetLines: number
    forecastBudgetLines: number
  }
}

interface Service {
  id: string
  name: string
  description?: string
  color?: string
  poles: Pole[]
  _count?: any
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set())

  // Modals
  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [poleModalOpen, setPoleModalOpen] = useState(false)
  const [deleteServiceConfirm, setDeleteServiceConfirm] = useState<string | null>(null)
  const [deletePoleConfirm, setDeletePoleConfirm] = useState<string | null>(null)

  // Forms
  const [serviceForm, setServiceForm] = useState({
    id: '',
    name: '',
    description: '',
    color: ''
  })

  const [poleForm, setPoleForm] = useState({
    id: '',
    serviceId: '',
    name: '',
    description: '',
    color: ''
  })

  // Fetch services
  const fetchServices = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
      toast.error('Erreur lors du chargement des services')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  // Toggle service expansion
  const toggleService = (serviceId: string) => {
    const newExpanded = new Set(expandedServices)
    if (newExpanded.has(serviceId)) {
      newExpanded.delete(serviceId)
    } else {
      newExpanded.add(serviceId)
    }
    setExpandedServices(newExpanded)
  }

  // Service handlers
  const openServiceModal = (service?: Service) => {
    if (service) {
      setServiceForm({
        id: service.id,
        name: service.name,
        description: service.description || '',
        color: service.color || ''
      })
    } else {
      setServiceForm({ id: '', name: '', description: '', color: '' })
    }
    setServiceModalOpen(true)
  }

  const handleSaveService = async () => {
    if (!serviceForm.name) {
      toast.error('Le nom du service est requis')
      return
    }

    try {
      const method = serviceForm.id ? 'PUT' : 'POST'
      const response = await fetch('/api/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceForm)
      })

      if (response.ok) {
        toast.success(serviceForm.id ? 'Service modifié avec succès' : 'Service créé avec succès')
        setServiceModalOpen(false)
        await fetchServices()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Error saving service:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    try {
      const response = await fetch(`/api/services?id=${serviceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Service supprimé avec succès')
        setDeleteServiceConfirm(null)
        await fetchServices()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error deleting service:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  // Pole handlers
  const openPoleModal = (serviceId: string, pole?: Pole) => {
    if (pole) {
      setPoleForm({
        id: pole.id,
        serviceId: pole.serviceId,
        name: pole.name,
        description: pole.description || '',
        color: pole.color || ''
      })
    } else {
      setPoleForm({ id: '', serviceId, name: '', description: '', color: '' })
    }
    setPoleModalOpen(true)
  }

  const handleSavePole = async () => {
    if (!poleForm.name || !poleForm.serviceId) {
      toast.error('Le nom du pôle et le service sont requis')
      return
    }

    try {
      const method = poleForm.id ? 'PUT' : 'POST'
      const response = await fetch('/api/poles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poleForm)
      })

      if (response.ok) {
        toast.success(poleForm.id ? 'Pôle modifié avec succès' : 'Pôle créé avec succès')
        setPoleModalOpen(false)
        await fetchServices()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Error saving pole:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleDeletePole = async (poleId: string) => {
    try {
      const response = await fetch(`/api/poles?id=${poleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Pôle supprimé avec succès')
        setDeletePoleConfirm(null)
        await fetchServices()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error deleting pole:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  // Calculate totals
  const calculateServiceTotals = (service: Service) => {
    return service.poles.reduce((acc, pole) => {
      return {
        budgetLines: acc.budgetLines + (pole._count?.budgetLines || 0),
        forecastBudgetLines: acc.forecastBudgetLines + (pole._count?.forecastBudgetLines || 0)
      }
    }, { budgetLines: 0, forecastBudgetLines: 0 })
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-50">Services & Pôles</h2>
            <p className="text-slate-400 mt-2">
              Organisez votre structure en services et pôles pour répartir les budgets
            </p>
          </div>

          <Button
            onClick={() => openServiceModal()}
            className="bg-cyan-600 hover:bg-cyan-700 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau service
          </Button>
        </div>

        {/* Services List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-400">Chargement...</div>
          </div>
        ) : services.length === 0 ? (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-12 text-center">
            <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Aucun service</h3>
            <p className="text-slate-500 mb-4">Créez votre premier service pour commencer</p>
            <Button onClick={() => openServiceModal()} className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="h-4 w-4 mr-2" />
              Créer un service
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service) => {
              const isExpanded = expandedServices.has(service.id)
              const totals = calculateServiceTotals(service)

              return (
                <div
                  key={service.id}
                  className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden"
                >
                  {/* Service Header */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleService(service.id)}
                          className="h-8 w-8 p-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-cyan-400" />
                            <h3 className="text-lg font-semibold text-slate-50">{service.name}</h3>
                          </div>
                          {service.description && (
                            <p className="text-sm text-slate-400 mt-1">{service.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-6 mr-4">
                          <div className="text-center">
                            <p className="text-xs text-slate-500">Pôles</p>
                            <p className="text-lg font-bold text-cyan-400">{service.poles.length}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-slate-500">Lignes budgétaires</p>
                            <p className="text-lg font-bold text-purple-400">{totals.budgetLines + totals.forecastBudgetLines}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPoleModal(service.id)}
                          className="h-8"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Pôle
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openServiceModal(service)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteServiceConfirm(service.id)}
                          className="h-8 w-8 p-0 text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Delete confirmation for service */}
                    {deleteServiceConfirm === service.id && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
                        <p className="text-sm text-slate-300 flex-1">
                          Confirmer la suppression du service ?
                        </p>
                        <Button size="sm" variant="outline" onClick={() => setDeleteServiceConfirm(null)}>
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteService(service.id)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Poles */}
                  {isExpanded && service.poles.length > 0 && (
                    <div className="border-t border-slate-700 bg-slate-900/30 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {service.poles.map((pole) => (
                          <div
                            key={pole.id}
                            className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 hover:border-cyan-600 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <Users className="h-4 w-4 text-purple-400" />
                                <h4 className="font-semibold text-slate-50 text-sm">{pole.name}</h4>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openPoleModal(service.id, pole)}
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-cyan-400"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletePoleConfirm(pole.id)}
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {pole.description && (
                              <p className="text-xs text-slate-400 mb-2">{pole.description}</p>
                            )}

                            {((pole._count?.budgetLines || 0) + (pole._count?.forecastBudgetLines || 0)) > 0 ? (
                              <div className="flex gap-3 text-xs">
                                {(pole._count?.budgetLines || 0) > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-500">Réelles:</span>
                                    <span className="text-emerald-400 font-semibold">
                                      {pole._count?.budgetLines || 0}
                                    </span>
                                  </div>
                                )}
                                {(pole._count?.forecastBudgetLines || 0) > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-500">Prévisionnelles:</span>
                                    <span className="text-cyan-400 font-semibold">
                                      {pole._count?.forecastBudgetLines || 0}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 italic">Aucune ligne budgétaire</p>
                            )}

                            {/* Delete confirmation for pole */}
                            {deletePoleConfirm === pole.id && (
                              <div className="flex gap-2 mt-2 pt-2 border-t border-slate-700">
                                <p className="text-xs text-slate-300 flex-1">Confirmer ?</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDeletePoleConfirm(null)}
                                  className="h-6 text-xs"
                                >
                                  Non
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeletePole(pole.id)}
                                  className="h-6 text-xs"
                                >
                                  Oui
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isExpanded && service.poles.length === 0 && (
                    <div className="border-t border-slate-700 bg-slate-900/30 p-6 text-center">
                      <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 mb-3">Aucun pôle dans ce service</p>
                      <Button
                        size="sm"
                        onClick={() => openPoleModal(service.id)}
                        className="bg-cyan-600 hover:bg-cyan-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Créer un pôle
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Service Modal */}
        <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-50">
            <DialogHeader>
              <DialogTitle>
                {serviceForm.id ? 'Modifier le service' : 'Nouveau service'}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Un service regroupe plusieurs pôles métiers
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="serviceName">Nom du service *</Label>
                <Input
                  id="serviceName"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="Ex: DSI, Direction Marketing"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceDescription">Description</Label>
                <Textarea
                  id="serviceDescription"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="Description du service..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setServiceModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveService} className="bg-cyan-600 hover:bg-cyan-700">
                {serviceForm.id ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pole Modal */}
        <Dialog open={poleModalOpen} onOpenChange={setPoleModalOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-50">
            <DialogHeader>
              <DialogTitle>
                {poleForm.id ? 'Modifier le pôle' : 'Nouveau pôle'}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Un pôle regroupe des lignes budgétaires
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="poleName">Nom du pôle *</Label>
                <Input
                  id="poleName"
                  value={poleForm.name}
                  onChange={(e) => setPoleForm({ ...poleForm, name: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="Ex: Cybersécurité, Développement"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="poleDescription">Description</Label>
                <Textarea
                  id="poleDescription"
                  value={poleForm.description}
                  onChange={(e) => setPoleForm({ ...poleForm, description: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  placeholder="Description du pôle..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPoleModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSavePole} className="bg-cyan-600 hover:bg-cyan-700">
                {poleForm.id ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
