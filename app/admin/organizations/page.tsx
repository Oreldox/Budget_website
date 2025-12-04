'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DataTable } from '@/components/ui/data-table'
import { Trash2, Edit, Plus, Building2, Users, FileText, Receipt, FolderKanban } from 'lucide-react'

interface Organization {
  id: string
  name: string
  slug: string
  settings: any
  createdAt: string
  _count: {
    users: number
    invoices: number
    contracts: number
    budgetLines: number
  }
}

export default function OrganizationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  })
  const [error, setError] = useState('')

  const isSuperAdmin = session?.user?.role === 'admin' && !session?.user?.organizationId

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user?.role !== 'admin') {
      router.push('/cockpit')
      return
    }
    fetchOrganizations()
  }, [session, status, router])

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations')
      if (res.ok) {
        const data = await res.json()
        setOrganizations(data)
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (editingOrg) {
        const res = await fetch(`/api/organizations/${editingOrg.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name }),
        })
        if (res.ok) {
          fetchOrganizations()
          closeDialog()
        } else {
          const data = await res.json()
          setError(data.error || 'Erreur lors de la modification')
        }
      } else {
        const res = await fetch('/api/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (res.ok) {
          fetchOrganizations()
          closeDialog()
        } else {
          const data = await res.json()
          setError(data.error || 'Erreur lors de la création')
        }
      }
    } catch (error) {
      console.error('Error saving organization:', error)
      setError('Une erreur est survenue')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette organisation ? Toutes les données associées seront perdues.')) return
    try {
      const res = await fetch(`/api/organizations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchOrganizations()
      } else {
        const data = await res.json()
        alert(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error deleting organization:', error)
    }
  }

  const openCreateDialog = () => {
    setEditingOrg(null)
    setFormData({ name: '', slug: '' })
    setError('')
    setIsDialogOpen(true)
  }

  const openEditDialog = (org: Organization) => {
    setEditingOrg(org)
    setFormData({ name: org.name, slug: org.slug })
    setError('')
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingOrg(null)
    setFormData({ name: '', slug: '' })
    setError('')
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  // Stats
  const totalOrgs = organizations.length
  const totalUsers = organizations.reduce((sum, org) => sum + org._count.users, 0)
  const totalData = organizations.reduce((sum, org) => sum + org._count.invoices + org._count.contracts, 0)

  const columns = [
    {
      key: 'name',
      label: 'Organisation',
      sortable: true,
      render: (_: any, org: Organization) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-lg">
            <Building2 className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <p className="font-medium text-slate-200">{org.name}</p>
            <p className="text-xs text-slate-500">slug: {org.slug}</p>
          </div>
        </div>
      )
    },
    {
      key: 'users',
      label: 'Utilisateurs',
      sortable: true,
      render: (_: any, org: Organization) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-400" />
          <span className="text-slate-300">{org._count.users}</span>
        </div>
      )
    },
    {
      key: 'invoices',
      label: 'Factures',
      sortable: true,
      render: (_: any, org: Organization) => (
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-green-400" />
          <span className="text-slate-300">{org._count.invoices}</span>
        </div>
      )
    },
    {
      key: 'contracts',
      label: 'Contrats',
      sortable: true,
      render: (_: any, org: Organization) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-orange-400" />
          <span className="text-slate-300">{org._count.contracts}</span>
        </div>
      )
    },
    {
      key: 'budgetLines',
      label: 'Lignes',
      sortable: true,
      render: (_: any, org: Organization) => (
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-purple-400" />
          <span className="text-slate-300">{org._count.budgetLines}</span>
        </div>
      )
    },
    {
      key: 'createdAt',
      label: 'Créée le',
      sortable: true,
      render: (_: any, org: Organization) => (
        <span className="text-slate-400">
          {new Date(org.createdAt).toLocaleDateString('fr-FR')}
        </span>
      )
    }
  ]

  if (status === 'loading' || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Chargement...</div>
        </div>
      </MainLayout>
    )
  }

  if (session?.user?.role !== 'admin') {
    return null
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Gestion des Organisations</h1>
            <p className="text-slate-400 text-sm mt-1">
              {isSuperAdmin
                ? 'Gérez toutes les organisations de la plateforme'
                : 'Consultez les informations de votre organisation'}
            </p>
          </div>
          {isSuperAdmin && (
            <Button onClick={openCreateDialog} className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle organisation
            </Button>
          )}
        </div>

        {!isSuperAdmin && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-blue-300 text-sm">
            Vous ne pouvez voir que votre organisation. Contactez un super admin pour gérer plusieurs organisations.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-50">{totalOrgs}</p>
                  <p className="text-xs text-slate-500">Organisation{totalOrgs > 1 ? 's' : ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-50">{totalUsers}</p>
                  <p className="text-xs text-slate-500">Utilisateurs total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Receipt className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-50">{totalData}</p>
                  <p className="text-xs text-slate-500">Documents total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <DataTable
              data={organizations}
              columns={columns}
              searchPlaceholder="Rechercher une organisation..."
              searchKeys={['name', 'slug']}
              pageSize={8}
              emptyMessage="Aucune organisation trouvée"
              actions={(org) => (
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditDialog(org)
                    }}
                    className="h-8 w-8 p-0 hover:bg-slate-800"
                  >
                    <Edit className="h-4 w-4 text-slate-400" />
                  </Button>
                  {isSuperAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(org.id)
                      }}
                      className="h-8 w-8 p-0 hover:bg-slate-800"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-slate-50">
                {editingOrg ? 'Modifier l\'organisation' : 'Nouvelle organisation'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">Nom de l'organisation</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        name: e.target.value,
                        slug: editingOrg ? formData.slug : generateSlug(e.target.value)
                      })
                    }}
                    placeholder="Mon entreprise"
                    className="bg-slate-800 border-slate-700 text-slate-200"
                    required
                  />
                </div>
                {!editingOrg && (
                  <div className="space-y-2">
                    <Label htmlFor="slug" className="text-slate-300">Slug (identifiant unique)</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="mon-entreprise"
                      className="bg-slate-800 border-slate-700 text-slate-200"
                      required
                    />
                    <p className="text-xs text-slate-500">
                      Utilisé dans les URLs, ne peut pas être modifié après création
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                  Annuler
                </Button>
                <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                  {editingOrg ? 'Enregistrer' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
