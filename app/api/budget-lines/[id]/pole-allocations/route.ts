import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const allocationSchema = z.object({
  allocations: z.array(z.object({
    poleId: z.string(),
    percentage: z.number().min(0).max(100),
  })),
})

// GET /api/budget-lines/[id]/pole-allocations - Récupérer les allocations de pôles
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { id } = await params

    const allocations = await prisma.budgetLinePoleAllocation.findMany({
      where: {
        budgetLineId: id,
      },
      include: {
        pole: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        percentage: 'desc',
      },
    })

    return NextResponse.json(allocations)
  } catch (error) {
    console.error('[GET /api/budget-lines/[id]/pole-allocations]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des allocations' },
      { status: 500 }
    )
  }
}

// PUT /api/budget-lines/[id]/pole-allocations - Mettre à jour les allocations (remplace toutes les allocations existantes)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const data = allocationSchema.parse(body)

    // Vérifier que la ligne budgétaire existe et appartient à l'organisation
    const budgetLine = await prisma.budgetLine.findFirst({
      where: {
        id: id,
        organizationId: session.user.organizationId,
      },
    })

    if (!budgetLine) {
      return NextResponse.json({ error: 'Ligne budgétaire introuvable' }, { status: 404 })
    }

    // Vérifier que la somme des pourcentages = 100%
    const totalPercentage = data.allocations.reduce((sum, a) => sum + a.percentage, 0)
    if (data.allocations.length > 0 && Math.abs(totalPercentage - 100) > 0.01) {
      return NextResponse.json(
        { error: `La somme des pourcentages doit être égale à 100% (actuellement ${totalPercentage}%)` },
        { status: 400 }
      )
    }

    // Supprimer toutes les allocations existantes
    await prisma.budgetLinePoleAllocation.deleteMany({
      where: { budgetLineId: id },
    })

    // Créer les nouvelles allocations
    if (data.allocations.length > 0) {
      await prisma.budgetLinePoleAllocation.createMany({
        data: data.allocations.map(a => ({
          budgetLineId: id,
          poleId: a.poleId,
          percentage: a.percentage,
        })),
      })
    }

    // Récupérer les allocations créées avec les relations
    const allocations = await prisma.budgetLinePoleAllocation.findMany({
      where: { budgetLineId: id },
      include: {
        pole: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        percentage: 'desc',
      },
    })

    return NextResponse.json(allocations)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[PUT /api/budget-lines/[id]/pole-allocations]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des allocations' },
      { status: 500 }
    )
  }
}
