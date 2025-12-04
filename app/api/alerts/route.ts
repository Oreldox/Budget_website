import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/alerts - Liste des alertes
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(now.getDate() + 30)

    // Contrats expirant bientôt
    const expiringContracts = await prisma.contract.findMany({
      where: {
        organizationId: session.user.organizationId,
        endDate: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
      select: {
        id: true,
        number: true,
        label: true,
        endDate: true,
        vendor: true,
      },
      take: 5,
      orderBy: { endDate: 'asc' },
    })

    // Factures en retard
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        organizationId: session.user.organizationId,
        status: 'Retard',
      },
      select: {
        id: true,
        number: true,
        vendor: true,
        amount: true,
        dueDate: true,
      },
      take: 5,
      orderBy: { dueDate: 'asc' },
    })

    // Budget dépassé
    const budgetLinesOverspent = await prisma.budgetLine.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        label: true,
        budget: true,
        invoiced: true,
      },
    })

    const overspentLines = budgetLinesOverspent
      .filter(line => line.invoiced > line.budget)
      .slice(0, 5)

    const alerts = [
      ...expiringContracts.map(contract => ({
        id: contract.id,
        type: 'contract',
        severity: 'warning' as const,
        title: 'Contrat expirant bientôt',
        message: `${contract.label} (${contract.number}) expire le ${new Date(contract.endDate).toLocaleDateString('fr-FR')}`,
        date: contract.endDate,
      })),
      ...overdueInvoices.map(invoice => ({
        id: invoice.id,
        type: 'invoice',
        severity: 'error' as const,
        title: 'Facture en retard',
        message: `Facture ${invoice.number} - ${invoice.vendor} - ${invoice.amount.toLocaleString('fr-FR')}€`,
        date: invoice.dueDate,
      })),
      ...overspentLines.map(line => ({
        id: line.id,
        type: 'budget',
        severity: 'error' as const,
        title: 'Budget dépassé',
        message: `${line.label} - Facturé: ${line.invoiced.toLocaleString('fr-FR')}€ / Budget: ${line.budget.toLocaleString('fr-FR')}€`,
        date: new Date(),
      })),
    ]

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
