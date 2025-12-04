'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Building2, Users, Copy, Trash2, Plus, Edit2, Check, X } from 'lucide-react'

interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  primaryColor: string | null
  secondaryColor: string | null
}

interface Invitation {
  id: string
  code: string
  role: string
  email: string | null
  note: string | null
  usedBy: string | null
  usedAt: string | null
  expiresAt: string
  createdAt: string
}

export default function SettingsPage() {
  const toast = useToast()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Invitation form
  const [newInvitationRole, setNewInvitationRole] = useState('viewer')
  const [newInvitationEmail, setNewInvitationEmail] = useState('')
  const [newInvitationNote, setNewInvitationNote] = useState('')
  const [creatingInvitation, setCreatingInvitation] = useState(false)

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch organization
      const orgRes = await fetch('/api/organizations')
      if (orgRes.ok) {
        const orgs = await orgRes.json()
        if (orgs.length > 0) {
          const org = orgs[0]
          setOrganization(org)
          setName(org.name)
          setDescription(org.description || '')
        }
      }

      // Fetch invitations
      const invRes = await fetch('/api/invitations')
      if (invRes.ok) {
        const invs = await invRes.json()
        setInvitations(invs)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const saveOrganization = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        setOrganization(updated)
        toast.success('Organisation mise à jour')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  const createInvitation = async () => {
    setCreatingInvitation(true)
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: newInvitationRole,
          email: newInvitationEmail || undefined,
          note: newInvitationNote || undefined,
          expiresInHours: 48,
        }),
      })

      if (res.ok) {
        const invitation = await res.json()
        setInvitations([invitation, ...invitations])
        setNewInvitationEmail('')
        setNewInvitationNote('')
        toast.success('Invitation créée')
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast.error(errorData?.error || 'Erreur lors de la création')
      }
    } catch {
      toast.error('Erreur lors de la création')
    } finally {
      setCreatingInvitation(false)
    }
  }

  const deleteInvitation = async (id: string) => {
    try {
      const res = await fetch(`/api/invitations?id=${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setInvitations(invitations.filter(i => i.id !== id))
        toast.success('Invitation supprimée')
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const startEditNote = (invitation: Invitation) => {
    setEditingId(invitation.id)
    setEditingNote(invitation.note || '')
  }

  const cancelEditNote = () => {
    setEditingId(null)
    setEditingNote('')
  }

  const saveEditNote = async (id: string) => {
    try {
      const res = await fetch(`/api/invitations?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: editingNote || null }),
      })

      if (res.ok) {
        const updated = await res.json()
        setInvitations(invitations.map(i => i.id === id ? updated : i))
        toast.success('Note mise à jour')
        setEditingId(null)
        setEditingNote('')
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Code copié dans le presse-papier')
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur'
      case 'manager': return 'Manager'
      case 'viewer': return 'Lecteur'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400'
      case 'manager': return 'bg-amber-500/20 text-amber-400'
      case 'viewer': return 'bg-cyan-500/20 text-cyan-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Paramètres de l'organisation</h1>
          <p className="text-slate-400 mt-1">Gérez votre organisation et les invitations</p>
        </div>

        {/* Organization Settings */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-slate-50">Informations</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nom de l'organisation</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optionnel)"
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={saveOrganization} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>

        {/* Invitations */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-slate-50">Invitations</h2>
            </div>
          </div>

          {/* Create invitation form */}
          <div className="flex items-end gap-3 mb-4 p-3 bg-slate-900/50 rounded-lg flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-slate-400 mb-1">Note (pour identifier)</label>
              <Input
                value={newInvitationNote}
                onChange={(e) => setNewInvitationNote(e.target.value)}
                placeholder="Ex: Jean Dupont - Comptabilité"
                className="bg-slate-800 border-slate-700 h-9"
              />
            </div>
            <div className="min-w-[150px]">
              <label className="block text-xs text-slate-400 mb-1">Email (optionnel)</label>
              <Input
                value={newInvitationEmail}
                onChange={(e) => setNewInvitationEmail(e.target.value)}
                placeholder="email@exemple.com"
                className="bg-slate-800 border-slate-700 h-9"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Rôle</label>
              <select
                value={newInvitationRole}
                onChange={(e) => setNewInvitationRole(e.target.value)}
                className="h-9 px-3 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-sm"
              >
                <option value="viewer">Lecteur</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <Button
              onClick={createInvitation}
              disabled={creatingInvitation}
              size="sm"
              className="h-9"
            >
              <Plus className="h-4 w-4 mr-1" />
              Créer
            </Button>
          </div>

          {/* Invitations list */}
          <div className="space-y-2">
            {invitations.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Aucune invitation</p>
            ) : (
              invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    invitation.usedBy
                      ? 'bg-slate-900/30 border-slate-700/50'
                      : new Date(invitation.expiresAt) < new Date()
                      ? 'bg-red-900/10 border-red-900/30'
                      : 'bg-slate-800/50 border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-wrap flex-1">
                    <div className="font-mono text-sm text-slate-200 bg-slate-900 px-2 py-1 rounded">
                      {invitation.code}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(invitation.role)}`}>
                      {getRoleLabel(invitation.role)}
                    </span>
                    {editingId === invitation.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingNote}
                          onChange={(e) => setEditingNote(e.target.value)}
                          placeholder="Note..."
                          className="bg-slate-800 border-slate-700 h-7 text-xs w-48"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => saveEditNote(invitation.id)}
                          className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEditNote}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-slate-300"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          {invitation.note ? (
                            <span className="text-xs text-cyan-400">
                              {invitation.note}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 italic">
                              Aucune note
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditNote(invitation)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-cyan-400"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                    {invitation.email && (
                      <span className="text-xs text-slate-500">
                        ({invitation.email})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {invitation.usedBy ? (
                      <span className="text-xs text-emerald-400">Utilisée</span>
                    ) : new Date(invitation.expiresAt) < new Date() ? (
                      <span className="text-xs text-red-400">Expirée</span>
                    ) : (
                      <>
                        <span className="text-xs text-slate-500">
                          Expire le {new Date(invitation.expiresAt).toLocaleDateString('fr-FR')}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyCode(invitation.code)}
                          className="h-7 w-7 p-0"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteInvitation(invitation.id)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
