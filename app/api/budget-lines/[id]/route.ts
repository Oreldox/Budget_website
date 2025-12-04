import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateBudgetLineSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  budget: z.number().min(0).optional(),
  accountingCode: z.string().optional(),
  nature: z.enum(['Investissement', 'Fonctionnement']).optional(),
  poleId: z.string().optional().nullable(),
})

// GET /api/budget-lines/[id] - Détails d'une ligne budgétaire
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

    const budgetLine = await prisma.budgetLine.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      include: {
        type: { select: { name: true, color: true } },
        domain: { select: { name: true, description: true } },
        pole: {
          include: {
            service: true
          }
        },
        yearlyBudgets: { orderBy: { year: 'asc' } },
        contracts: {
          select: {
            id: true,
            number: true,
            label: true,
            amount: true,
            status: true,
          },
        },
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

    if (!budgetLine) {
      return NextResponse.json({ error: 'Ligne budgétaire non trouvée' }, { status: 404 })
    }

    return NextResponse.json(budgetLine)
  } catch (error) {
    console.error('Error fetching budget line:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/budget-lines/[id] - Modifier partiellement une ligne budgétaire
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(req, { params })
}

// PUT /api/budget-lines/[id] - Modifier une ligne budgétaire
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
      return NextResponse.json({ error: 'Les lecteurs ne peuvent pas modifier de lignes budgétaires' }, { status: 403 })
    }

    const body = await req.json()
    console.log('Body received for update:', JSON.stringify(body, null, 2))
    const data = updateBudgetLineSchema.parse(body)
    console.log('Data validated:', JSON.stringify(data, null, 2))

    const existingBudgetLine = await prisma.budgetLine.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    })

    if (!existingBudgetLine) {
      return NextResponse.json({ error: 'Ligne budgétaire non trouvée' }, { status: 404 })
    }

    const budgetLine = await prisma.budgetLine.update({
      where: { id },
      data,
      include: {
        type: { select: { name: true, color: true } },
        domain: { select: { name: true } },
        pole: {
          include: {
            service: true
          }
        },
        yearlyBudgets: true,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'BudgetLine',
        entityId: budgetLine.id,
        changes: JSON.stringify(data),
        organizationId: session.user.organizationId,
      },
    })

    return NextResponse.json(budgetLine)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', JSON.stringify(error.errors, null, 2))
      return NextResponse.json({ error: 'Données invalides', details: error.errors }, { status: 400 })
    }
    console.error('Error updating budget line:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/budget-lines/[id] - Supprimer une ligne budgétaire
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

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Seuls les administrateurs peuvent supprimer des lignes budgétaires' }, { status: 403 })
    }

    const existingBudgetLine = await prisma.budgetLine.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      include: {
        _count: {
          select: {
            contracts: true,
            invoices: true,
          },
        },
      },
    })

    if (!existingBudgetLine) {
      return NextResponse.json({ error: 'Ligne budgétaire non trouvée' }, { status: 404 })
    }

    if (existingBudgetLine._count.contracts > 0 || existingBudgetLine._count.invoices > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer une ligne budgétaire avec des contrats ou factures associées' },
        { status: 400 }
      )
    }

    await prisma.budgetLine.delete({
      where: { id },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entity: 'BudgetLine',
        entityId: id,
        changes: JSON.stringify({ label: existingBudgetLine.label }),
        organizationId: session.user.organizationId,
      },
    })

    return NextResponse.json({ message: 'Ligne budgétaire supprimée avec succès' })
  } catch (error) {
    console.error('Error deleting budget line:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
