import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const commentSchema = z.object({
  content: z.string().min(1, 'Le commentaire ne peut pas être vide'),
})

// GET /api/budget-lines/[id]/comments - Récupérer les commentaires d'une ligne budgétaire
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Vérifier que la ligne budgétaire existe et appartient à l'organisation
    const budgetLine = await prisma.budgetLine.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
    })

    if (!budgetLine) {
      return NextResponse.json({ error: 'Ligne budgétaire introuvable' }, { status: 404 })
    }

    const comments = await prisma.budgetLineComment.findMany({
      where: {
        budgetLineId: params.id,
        organizationId: session.user.organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('[GET /api/budget-lines/[id]/comments]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commentaires' },
      { status: 500 }
    )
  }
}

// POST /api/budget-lines/[id]/comments - Ajouter un commentaire
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const data = commentSchema.parse(body)

    // Vérifier que la ligne budgétaire existe et appartient à l'organisation
    const budgetLine = await prisma.budgetLine.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
    })

    if (!budgetLine) {
      return NextResponse.json({ error: 'Ligne budgétaire introuvable' }, { status: 404 })
    }

    const comment = await prisma.budgetLineComment.create({
      data: {
        content: data.content,
        budgetLineId: params.id,
        userId: session.user.id || undefined,
        organizationId: session.user.organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[POST /api/budget-lines/[id]/comments]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du commentaire' },
      { status: 500 }
    )
  }
}
