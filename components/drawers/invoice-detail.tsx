'use client'

import { Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { Invoice } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Badge } from '@/components/ui/badge'

interface InvoiceDetailDrawerProps {
  invoice: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, updates: Partial<Invoice>) => void
  onDelete: (id: string) => void
}

export function InvoiceDetailDrawer({ invoice, open, onOpenChange, onUpdate, onDelete }: InvoiceDetailDrawerProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [comment, setComment] = useState(invoice?.comment || '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState(invoice?.tags || [])

  if (!invoice) return null

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()]
      setTags(newTags)
      onUpdate(invoice.id, { tags: newTags, comment })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    const newTags = tags.filter((t) => t !== tag)
    setTags(newTags)
    onUpdate(invoice.id, { tags: newTags, comment })
  }

  const handleSaveComment = () => {
    onUpdate(invoice.id, { comment, tags })
  }

  const handleDelete = () => {
    onDelete(invoice.id)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Détails de la facture</DrawerTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        <div className="space-y-6 overflow-y-auto px-6 pb-8">
          {/* Header */}
          <div className="space-y-2 border-b border-slate-700 pb-4">
            <h3 className="text-lg font-semibold text-slate-50">{invoice.number}</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">{invoice.vendor}</span>
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  invoice.status === 'Payée'
                    ? 'bg-emerald-900/50 text-emerald-300'
                    : invoice.status === 'En attente'
                      ? 'bg-blue-900/50 text-blue-300'
                      : 'bg-red-900/50 text-red-300'
                }`}
              >
                {invoice.status}
              </span>
            </div>
          </div>

          {/* Main Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Montant TTC</label>
              <p className="mt-1 text-xl font-semibold text-cyan-400">{invoice.amount.toLocaleString('fr-FR')}€</p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Montant HT</label>
              <p className="mt-1 text-slate-50">{(invoice.amountHT || invoice.amount).toLocaleString('fr-FR')}€</p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Date facture</label>
              <p className="mt-1 text-slate-50">{new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Date d'échéance</label>
              <p className="mt-1 text-slate-50">{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          {/* Nature & Domaine */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Nature</label>
              <p className="mt-1 text-slate-50">{invoice.nature}</p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Domaine</label>
              <p className="mt-1 text-slate-50">{invoice.domain?.name || '-'}</p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">Tags</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                  {tag}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter un tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="bg-slate-800 border-slate-700"
              />
              <Button variant="outline" size="sm" onClick={handleAddTag}>
                Ajouter
              </Button>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
              Commentaire interne
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Notes internes..."
              className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-slate-50 placeholder-slate-500"
              rows={4}
            />
            <Button size="sm" onClick={handleSaveComment} className="mt-2">
              Enregistrer
            </Button>
          </div>

          {/* Accounting Info */}
          <div className="rounded bg-slate-800/50 p-3 space-y-2">
            {invoice.accountingCode && (
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Code comptable</span>
                <span className="text-slate-50">{invoice.accountingCode}</span>
              </div>
            )}
            {invoice.allocationCode && (
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Code d'allocation</span>
                <span className="text-slate-50">{invoice.allocationCode}</span>
              </div>
            )}
            {invoice.commandNumber && (
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">N° commande</span>
                <span className="text-slate-50">{invoice.commandNumber}</span>
              </div>
            )}
            {invoice.supplierCode && (
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Code fournisseur</span>
                <span className="text-slate-50">{invoice.supplierCode}</span>
              </div>
            )}
            {invoice.lineNumber && (
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">N° ligne</span>
                <span className="text-slate-50">{invoice.lineNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-700 px-6 py-4 flex gap-2 justify-end">
          {showConfirm ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>
                Annuler
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Supprimer
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirm(true)}
                className="text-red-400 hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
