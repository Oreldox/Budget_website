import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const purchaseOrderUpdateSchema = z.object({
  number: z.string().min(1).optional(),
  vendor: z.string().min(1).optional(),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'CONFIRMED', 'DELIVERED', 'INVOICED', 'CANCELLED']).optional(),
  linkedForecastExpenseId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
})

// GET /api/purchase-orders/[id] - Récupérer un bon de commande
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
      include: {
        linkedForecastExpense: {
          select: {
            id: true,
            label: true,
            amount: true,
            forecastBudgetLine: {
              select: {
                label: true,
                nature: true,
              },
            },
          },
        },
      },
    })

    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Bon de commande introuvable' }, { status: 404 })
    }

    return NextResponse.json(purchaseOrder)
  } catch (error) {
    console.error('[GET /api/purchase-orders/[id]]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du bon de commande' },
      { status: 500 }
    )
  }
}

// PATCH /api/purchase-orders/[id] - Mettre à jour un bon de commande
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const data = purchaseOrderUpdateSchema.parse(body)

    // Vérifier que le bon de commande existe et appartient à l'organisation
    const existing = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Bon de commande introuvable' }, { status: 404 })
    }

    // Si le numéro change, vérifier l'unicité
    if (data.number && data.number !== existing.number) {
      const duplicate = await prisma.purchaseOrder.findUnique({
        where: {
          organizationId_number: {
            organizationId: session.user.organizationId,
            number: data.number,
          },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Un bon de commande avec ce numéro existe déjà' },
          { status: 400 }
        )
      }
    }

    const updateData: any = { ...data }

    if (data.orderDate) updateData.orderDate = new Date(data.orderDate)
    if (data.expectedDeliveryDate) updateData.expectedDeliveryDate = new Date(data.expectedDeliveryDate)
    if (data.tags) updateData.tags = JSON.stringify(data.tags)
    if (data.attachments) updateData.attachments = JSON.stringify(data.attachments)

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: updateData,
      include: {
        linkedForecastExpense: {
          select: {
            id: true,
            label: true,
            amount: true,
            forecastBudgetLine: {
              select: {
                label: true,
                nature: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(purchaseOrder)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[PATCH /api/purchase-orders/[id]]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du bon de commande' },
      { status: 500 }
    )
  }
}

// DELETE /api/purchase-orders/[id] - Supprimer un bon de commande
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Vérifier que le bon de commande existe et appartient à l'organisation
    const existing = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Bon de commande introuvable' }, { status: 404 })
    }

    await prisma.purchaseOrder.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Bon de commande supprimé avec succès' })
  } catch (error) {
    console.error('[DELETE /api/purchase-orders/[id]]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du bon de commande' },
      { status: 500 }
    )
  }
}
