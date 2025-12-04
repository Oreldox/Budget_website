import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateYearlyBudgetSchema = z.object({
  budget: z.number().min(0),
})

// PATCH /api/yearly-budgets/[id] - Mettre à jour le budget prévisionnel d'une année
export async function PATCH(
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
      return NextResponse.json(
        { error: 'Les lecteurs ne peuvent pas modifier les budgets' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { budget } = updateYearlyBudgetSchema.parse(body)

    // Vérifier que le yearlyBudget appartient à l'organisation
    const existingYearlyBudget = await prisma.yearlyBudget.findFirst({
      where: {
        id,
        budgetLine: {
          organizationId: session.user.organizationId,
        },
      },
      include: {
        budgetLine: {
          select: {
            id: true,
            label: true,
          },
        },
      },
    })

    if (!existingYearlyBudget) {
      return NextResponse.json(
        { error: 'Budget annuel non trouvé' },
        { status: 404 }
      )
    }

    // Mettre à jour le budget annuel
    const updatedYearlyBudget = await prisma.yearlyBudget.update({
      where: { id },
      data: { budget },
      include: {
        budgetLine: {
          include: {
            type: { select: { name: true, color: true } },
            domain: { select: { name: true } },
          },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'YearlyBudget',
        entityId: id,
        changes: JSON.stringify({
          year: existingYearlyBudget.year,
          budgetLineLabel: existingYearlyBudget.budgetLine.label,
          oldBudget: existingYearlyBudget.budget,
          newBudget: budget,
        }),
        organizationId: session.user.organizationId,
      },
    })

    return NextResponse.json(updatedYearlyBudget)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating yearly budget:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
