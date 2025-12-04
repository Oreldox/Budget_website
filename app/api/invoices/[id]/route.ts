import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateInvoiceSchema = z.object({
  number: z.string().min(1).optional(),
  lineNumber: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  vendor: z.string().min(1).optional(),
  supplierCode: z.string().optional().nullable(),
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  amountHT: z.number().positive().optional().nullable(),
  isCredit: z.boolean().optional(),
  dueDate: z.string().optional(),
  invoiceDate: z.string().optional(),
  paymentDate: z.string().optional().nullable(),
  status: z.enum(['Payée', 'En attente', 'Retard']).optional(),
  tags: z.array(z.string()).optional(),
  comment: z.string().optional().nullable(),
  domainId: z.string().optional(),
  typeId: z.string().optional(),
  nature: z.enum(['Investissement', 'Fonctionnement']).optional(),
  budgetLineId: z.string().optional().nullable(),
  accountingCode: z.string().optional().nullable(),
  allocationCode: z.string().optional().nullable(),
  commandNumber: z.string().optional().nullable(),
  pointed: z.boolean().optional(),
})

// GET /api/invoices/[id] - Détails d'une facture
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      include: {
        type: { select: { name: true, color: true } },
        domain: { select: { name: true, description: true } },
        budgetLine: { select: { label: true, accountingCode: true } },
        contract: { select: { number: true, label: true } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT /api/invoices/[id] - Modifier une facture
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    if (session.user.role === 'viewer') {
      return NextResponse.json({ error: 'Les lecteurs ne peuvent pas modifier de factures' }, { status: 403 })
    }

    const body = await req.json()
    const data = updateInvoiceSchema.parse(body)

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    })

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })
    }

    // Préparer les données de mise à jour
    const updateData: any = { ...data }

    if (data.invoiceDate) {
      updateData.invoiceDate = new Date(data.invoiceDate)
      updateData.invoiceYear = new Date(data.invoiceDate).getFullYear()
    }
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate)
    if (data.paymentDate !== undefined) {
      updateData.paymentDate = data.paymentDate ? new Date(data.paymentDate) : null
    }
    // Convertir tags array en string JSON pour le stockage
    if (data.tags !== undefined) {
      updateData.tags = data.tags.length > 0 ? JSON.stringify(data.tags) : null
    }

    // Mettre à jour les montants de la ligne budgétaire si le montant, isCredit ou la ligne change
    if (data.amount !== undefined || data.isCredit !== undefined || data.budgetLineId !== undefined) {
      const oldAmount = existingInvoice.amount
      const oldIsCredit = existingInvoice.isCredit
      const newAmount = data.amount ?? existingInvoice.amount
      const newIsCredit = data.isCredit ?? existingInvoice.isCredit
      const oldBudgetLineId = existingInvoice.budgetLineId
      const newBudgetLineId = data.budgetLineId ?? existingInvoice.budgetLineId

      // Retirer l'ancien montant (en tenant compte du fait que c'était un avoir ou non)
      if (oldBudgetLineId) {
        const oldAmountToApply = oldIsCredit ? -oldAmount : oldAmount
        await prisma.budgetLine.update({
          where: { id: oldBudgetLineId },
          data: { invoiced: { decrement: oldAmountToApply } },
        })
      }

      // Ajouter le nouveau montant (en tenant compte du fait que c'est un avoir ou non)
      if (newBudgetLineId) {
        const newAmountToApply = newIsCredit ? -newAmount : newAmount
        await prisma.budgetLine.update({
          where: { id: newBudgetLineId },
          data: { invoiced: { increment: newAmountToApply } },
        })
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        type: { select: { name: true, color: true } },
        domain: { select: { name: true } },
        budgetLine: { select: { label: true } },
        contract: { select: { number: true, label: true } },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'Invoice',
        entityId: invoice.id,
        changes: JSON.stringify(data),
        organizationId: session.user.organizationId,
      },
    })

    return NextResponse.json(invoice)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides', details: error.errors }, { status: 400 })
    }
    console.error('Error updating invoice:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/invoices/[id] - Supprimer une facture
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    if (session.user.role === 'viewer') {
      return NextResponse.json({ error: 'Les lecteurs ne peuvent pas supprimer de factures' }, { status: 403 })
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    })

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })
    }

    // Retirer le montant de la ligne budgétaire (en tenant compte du fait que c'était un avoir ou non)
    if (existingInvoice.budgetLineId) {
      const amountToRemove = existingInvoice.isCredit ? -existingInvoice.amount : existingInvoice.amount
      await prisma.budgetLine.update({
        where: { id: existingInvoice.budgetLineId },
        data: { invoiced: { decrement: amountToRemove } },
      })
    }

    await prisma.invoice.delete({
      where: { id },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entity: 'Invoice',
        entityId: id,
        changes: JSON.stringify({ number: existingInvoice.number, amount: existingInvoice.amount }),
        organizationId: session.user.organizationId,
      },
    })

    return NextResponse.json({ message: 'Facture supprimée avec succès' })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
