'use client'

import { useState, useEffect } from 'react'
import { X, Trash2, Edit2, Save, Building2, Mail, Phone, MapPin, FileText, TrendingUp, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Vendor {
  id: string
  name: string
  code?: string
  contact?: string
  email?: string
  phone?: string
  address?: string
  siret?: string
  tvaNumber?: string
  paymentTerms?: number
  notes?: string
  isActive: boolean
}

interface VendorDetail extends Vendor {
  contracts: any[]
  invoices: any[]
  analytics: {
    totalContractAmount: number
    totalInvoiceAmount: number
    activeContracts: number
    expiringContracts: number
    paidInvoices: number
    pendingInvoices: number
    invoicesByYear: Record<number, number>
  }
}

interface VendorDrawerProps {
  vendorId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (vendor: Vendor) => void
  onDelete: (id: string) => void
}

export function VendorDrawer({ vendorId, open, onOpenChange, onUpdate, onDelete }: VendorDrawerProps) {
  const [vendor, setVendor] = useState<VendorDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<Vendor>>({})
  const [showConfirm, setShowConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    if (vendorId && open) {
      fetchVendor()
    }
  }, [vendorId, open])

  const fetchVendor = async () => {
    if (!vendorId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/vendors/${vendorId}`)
      if (response.ok) {
        const data = await response.json()
        setVendor(data)
        setFormData(data)
      }
    } catch (error) {
      console.error('Error fetching vendor:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      alert('Le nom est requis')
      return
    }

    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const updated = await response.json()
        setVendor({ ...vendor!, ...updated })
        onUpdate(updated)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error updating vendor:', error)
    }
  }

  const handleDelete = () => {
    if (vendorId) {
      onDelete(vendorId)
      onOpenChange(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
  }

  if (!vendorId) return null

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl">
        <DrawerHeader className="flex items-center justify-between border-b border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-cyan-400" />
            <div>
              <DrawerTitle className="text-lg">
                {loading ? 'Chargement...' : vendor?.name}
              </DrawerTitle>
              {vendor?.code && (
                <span className="text-xs text-slate-400 font-mono">{vendor.code}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-1" />
                Modifier
              </Button>
            ) : (
              <>
                <Button size="sm" onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700">
                  <Save className="h-4 w-4 mr-1" />
                  Sauvegarder
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setIsEditing(false)
                  setFormData(vendor || {})
                }}>
                  Annuler
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        {loading ? (
          <div className="p-6 text-center text-slate-400">Chargement...</div>
        ) : vendor ? (
          <div className="overflow-y-auto max-h-[70vh]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full bg-slate-800 border-b border-slate-700 rounded-none p-1">
                <TabsTrigger value="info" className="flex-1 data-[state=active]:bg-cyan-600">
                  Informations
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex-1 data-[state=active]:bg-cyan-600">
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1 data-[state=active]:bg-cyan-600">
                  Historique
                </TabsTrigger>
              </TabsList>

              {/* Tab Informations */}
              <TabsContent value="info" className="p-6 space-y-6">
                {isEditing ? (
                  // Mode édition
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Nom *</label>
                        <Input
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Code</label>
                        <Input
                          value={formData.code || ''}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          className="bg-slate-800 border-slate-700"
                          placeholder="ex: MSFT"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Contact</label>
                        <Input
                          value={formData.contact || ''}
                          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                        <Input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Téléphone</label>
                        <Input
                          value={formData.phone || ''}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Délai paiement (jours)</label>
                        <Input
                          type="number"
                          value={formData.paymentTerms || 30}
                          onChange={(e) => setFormData({ ...formData, paymentTerms: parseInt(e.target.value) || 30 })}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Adresse</label>
                      <Input
                        value={formData.address || ''}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="bg-slate-800 border-slate-700"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">SIRET</label>
                        <Input
                          value={formData.siret || ''}
                          onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">N° TVA</label>
                        <Input
                          value={formData.tvaNumber || ''}
                          onChange={(e) => setFormData({ ...formData, tvaNumber: e.target.value })}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                      <textarea
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm min-h-20"
                        rows={3}
                      />
                    </div>
                  </div>
                ) : (
                  // Mode visualisation
                  <div className="space-y-4">
                    {/* Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vendor.contact && (
                        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                          <Building2 className="h-4 w-4 text-slate-500" />
                          <div>
                            <p className="text-xs text-slate-400">Contact</p>
                            <p className="text-sm text-slate-200">{vendor.contact}</p>
                          </div>
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                          <Mail className="h-4 w-4 text-slate-500" />
                          <div>
                            <p className="text-xs text-slate-400">Email</p>
                            <a href={`mailto:${vendor.email}`} className="text-sm text-cyan-400 hover:underline">
                              {vendor.email}
                            </a>
                          </div>
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                          <Phone className="h-4 w-4 text-slate-500" />
                          <div>
                            <p className="text-xs text-slate-400">Téléphone</p>
                            <a href={`tel:${vendor.phone}`} className="text-sm text-slate-200">
                              {vendor.phone}
                            </a>
                          </div>
                        </div>
                      )}
                      {vendor.paymentTerms && (
                        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          <div>
                            <p className="text-xs text-slate-400">Délai paiement</p>
                            <p className="text-sm text-slate-200">{vendor.paymentTerms} jours</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {vendor.address && (
                      <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                        <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-400">Adresse</p>
                          <p className="text-sm text-slate-200">{vendor.address}</p>
                        </div>
                      </div>
                    )}

                    {/* Infos légales */}
                    {(vendor.siret || vendor.tvaNumber) && (
                      <div className="grid grid-cols-2 gap-4">
                        {vendor.siret && (
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <p className="text-xs text-slate-400">SIRET</p>
                            <p className="text-sm font-mono text-slate-200">{vendor.siret}</p>
                          </div>
                        )}
                        {vendor.tvaNumber && (
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <p className="text-xs text-slate-400">N° TVA</p>
                            <p className="text-sm font-mono text-slate-200">{vendor.tvaNumber}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {vendor.notes && (
                      <div className="p-3 bg-slate-800/50 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Notes</p>
                        <p className="text-sm text-slate-300">{vendor.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Bouton supprimer */}
                {!isEditing && (
                  <div className="pt-4 border-t border-slate-700">
                    {showConfirm ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-red-400">Confirmer la suppression ?</span>
                        <Button size="sm" variant="destructive" onClick={handleDelete}>
                          Oui, supprimer
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowConfirm(false)}>
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowConfirm(true)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer ce fournisseur
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Tab Analytics */}
              <TabsContent value="analytics" className="p-6 space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <p className="text-xs text-slate-400">Total contrats</p>
                    <p className="text-2xl font-bold text-cyan-400">{formatCurrency(vendor.analytics.totalContractAmount)}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {vendor.analytics.activeContracts} actif(s)
                      {vendor.analytics.expiringContracts > 0 && (
                        <span className="text-amber-400"> • {vendor.analytics.expiringContracts} expirant(s)</span>
                      )}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <p className="text-xs text-slate-400">Total facturé</p>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(vendor.analytics.totalInvoiceAmount)}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {vendor.analytics.paidInvoices} payée(s) / {vendor.invoices.length}
                    </p>
                  </div>
                </div>

                {/* Dépenses par année */}
                {Object.keys(vendor.analytics.invoicesByYear).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-50 mb-3">Dépenses par année</h4>
                    <div className="space-y-2">
                      {Object.entries(vendor.analytics.invoicesByYear)
                        .sort(([a], [b]) => parseInt(b) - parseInt(a))
                        .map(([year, amount]) => {
                          const maxAmount = Math.max(...Object.values(vendor.analytics.invoicesByYear))
                          const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0
                          return (
                            <div key={year} className="flex items-center gap-3">
                              <span className="text-sm text-slate-400 w-12">{year}</span>
                              <div className="flex-1 h-6 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-cyan-500 rounded-full flex items-center justify-end pr-2"
                                  style={{ width: `${percentage}%` }}
                                >
                                  {percentage > 30 && (
                                    <span className="text-xs text-white font-medium">{formatCurrency(amount)}</span>
                                  )}
                                </div>
                              </div>
                              {percentage <= 30 && (
                                <span className="text-sm text-cyan-400 font-medium">{formatCurrency(amount)}</span>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Tab Historique */}
              <TabsContent value="history" className="p-6 space-y-6">
                {/* Contrats */}
                {vendor.contracts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-50 mb-3">
                      Contrats ({vendor.contracts.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {vendor.contracts.map((contract: any) => (
                        <div key={contract.id} className="flex justify-between items-center p-3 bg-slate-800/50 rounded border border-slate-700">
                          <div>
                            <p className="text-sm text-slate-50">{contract.label}</p>
                            <p className="text-xs text-slate-400">{contract.number}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-cyan-400">{formatCurrency(contract.amount)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              contract.status === 'Actif' ? 'bg-emerald-900/50 text-emerald-400' :
                              contract.status === 'Expirant' ? 'bg-amber-900/50 text-amber-400' :
                              'bg-red-900/50 text-red-400'
                            }`}>
                              {contract.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dernières factures */}
                {vendor.invoices.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-50 mb-3">
                      Dernières factures ({vendor.invoices.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {vendor.invoices.slice(0, 10).map((invoice: any) => (
                        <div key={invoice.id} className="flex justify-between items-center p-3 bg-slate-800/50 rounded border border-slate-700">
                          <div>
                            <p className="text-sm text-slate-50">{invoice.description}</p>
                            <p className="text-xs text-slate-400">
                              {invoice.number} • {new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-emerald-400">{formatCurrency(invoice.amount)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              invoice.status === 'Payée' ? 'bg-emerald-900/50 text-emerald-400' :
                              invoice.status === 'En attente' ? 'bg-amber-900/50 text-amber-400' :
                              'bg-red-900/50 text-red-400'
                            }`}>
                              {invoice.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {vendor.contracts.length === 0 && vendor.invoices.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    Aucun historique pour ce fournisseur
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400">Fournisseur non trouvé</div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
