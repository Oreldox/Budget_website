import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateContractSchema = z.object({
  number: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  vendor: z.string().min(1).optional(),
  providerName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  amount: z.number().positive().optional(),
  typeId: z.string().optional(),
  domainId: z.string().optional(),
  budgetLineId: z.string().optional(),
  status: z.enum(['Actif', 'Expirant', 'Expiré']).optional(),
  description: z.string().optional(),
  constraints: z.string().optional(),
  accountingCode: z.string().optional(),
  allocationCode: z.string().optional(),
})

// GET /api/contracts/[id] - Détails d'un contrat
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

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      include: {
        type: { select: { name: true, color: true } },
        domain: { select: { name: true, description: true } },
        budgetLine: { select: { label: true, accountingCode: true } },
        yearlyAmounts: { orderBy: { year: 'asc' } },
        invoices: {
          select: {
            id: true,
            number: true,
            amount: true,
            invoiceDate: true,
            status: true,
          },
          orderBy: { invoiceDate: 'desc' },
        },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contrat non trouvé' }, { status: 404 })
    }

    return NextResponse.json(contract)
  } catch (error) {
    console.error('Error fetching contract:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT /api/contracts/[id] - Modifier un contrat
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
      return NextResponse.json({ error: 'Les lecteurs ne peuvent pas modifier de contrats' }, { status: 403 })
    }

    const body = await req.json()
    const data = updateContractSchema.parse(body)

    const existingContract = await prisma.contract.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    })

    if (!existingContract) {
      return NextResponse.json({ error: 'Contrat non trouvé' }, { status: 404 })
    }

    // Préparer les données de mise à jour
    const updateData: any = { ...data }

    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)

    // Mettre à jour les montants de la ligne budgétaire si le montant ou la ligne change
    if (data.amount !== undefined || data.budgetLineId !== undefined) {
      const oldAmount = existingContract.amount
      const newAmount = data.amount ?? existingContract.amount
      const oldBudgetLineId = existingContract.budgetLineId
      const newBudgetLineId = data.budgetLineId ?? existingContract.budgetLineId

      // Retirer l'ancien montant
      if (oldBudgetLineId) {
        await prisma.budgetLine.update({
          where: { id: oldBudgetLineId },
          data: { engineered: { decrement: oldAmount } },
        })
      }

      // Ajouter le nouveau montant
      if (newBudgetLineId) {
        await prisma.budgetLine.update({
          where: { id: newBudgetLineId },
          data: { engineered: { increment: newAmount } },
        })
      }
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: updateData,
      include: {
        type: { select: { name: true, color: true } },
        domain: { select: { name: true } },
        budgetLine: { select: { label: true } },
        yearlyAmounts: true,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'Contract',
        entityId: contract.id,
        changes: JSON.stringify(data),
        organizationId: session.user.organizationId,
      },
    })

    return NextResponse.json(contract)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides', details: error.errors }, { status: 400 })
    }
    console.error('Error updating contract:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/contracts/[id] - Supprimer un contrat
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
      return NextResponse.json({ error: 'Les lecteurs ne peuvent pas supprimer de contrats' }, { status: 403 })
    }

    const existingContract = await prisma.contract.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    })

    if (!existingContract) {
      return NextResponse.json({ error: 'Contrat non trouvé' }, { status: 404 })
    }

    if (existingContract._count.invoices > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un contrat avec des factures associées' },
        { status: 400 }
      )
    }

    // Retirer le montant de la ligne budgétaire
    if (existingContract.budgetLineId) {
      await prisma.budgetLine.update({
        where: { id: existingContract.budgetLineId },
        data: { engineered: { decrement: existingContract.amount } },
      })
    }

    await prisma.contract.delete({
      where: { id },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entity: 'Contract',
        entityId: id,
        changes: JSON.stringify({ number: existingContract.number, amount: existingContract.amount }),
        organizationId: session.user.organizationId,
      },
    })

    return NextResponse.json({ message: 'Contrat supprimé avec succès' })
  } catch (error) {
    console.error('Error deleting contract:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
