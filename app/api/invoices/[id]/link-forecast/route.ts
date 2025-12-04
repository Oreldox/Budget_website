import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const linkForecastSchema = z.object({
  forecastExpenseId: z.string().nullable(), // null pour délier
})

// PUT /api/invoices/[id]/link-forecast - Lier ou délier une facture à une dépense prévisionnelle
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
      return NextResponse.json({ error: 'Les lecteurs ne peuvent pas modifier les liens' }, { status: 403 })
    }

    const body = await req.json()
    const { forecastExpenseId } = linkForecastSchema.parse(body)

    // Vérifier que la facture existe et appartient à l'organisation
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    })

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })
    }

    // Si on lie à une dépense prévisionnelle, vérifier qu'elle existe
    if (forecastExpenseId) {
      const forecastExpense = await prisma.forecastExpense.findFirst({
        where: {
          id: forecastExpenseId,
        },
        include: {
          forecastBudgetLine: {
            select: {
              organizationId: true,
            },
          },
        },
      })

      if (!forecastExpense) {
        return NextResponse.json({ error: 'Dépense prévisionnelle non trouvée' }, { status: 404 })
      }

      // Vérifier que la dépense prévisionnelle appartient à la même organisation
      if (forecastExpense.forecastBudgetLine.organizationId !== session.user.organizationId) {
        return NextResponse.json({ error: 'Dépense prévisionnelle non autorisée' }, { status: 403 })
      }
    }

    // Mettre à jour le lien
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        linkedForecastExpenseId: forecastExpenseId,
      },
      include: {
        type: { select: { name: true, color: true } },
        domain: { select: { name: true } },
        budgetLine: { select: { label: true } },
        contract: { select: { number: true, label: true } },
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

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'Invoice',
        entityId: id,
        changes: JSON.stringify({
          action: forecastExpenseId ? 'LINK_FORECAST' : 'UNLINK_FORECAST',
          forecastExpenseId,
        }),
        organizationId: session.user.organizationId,
      },
    })

    return NextResponse.json({
      message: forecastExpenseId ? 'Facture liée avec succès' : 'Facture déliée avec succès',
      invoice: updatedInvoice,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides', details: error.errors }, { status: 400 })
    }
    console.error('Error linking/unlinking invoice to forecast:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
