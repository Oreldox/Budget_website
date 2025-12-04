import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { clearBudgetLinesCache } from '@/lib/cache-utils'

// PATCH /api/yearly-budgets - Met à jour ou crée des budgets annuels pour toutes les lignes
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const { lineId, budgetLineId, year, budget, engineered, invoiced } = body

    // Si lineId ou budgetLineId est fourni, mise à jour d'une ligne spécifique
    const id = lineId || budgetLineId
    if (id) {
      const budgetLine = await prisma.budgetLine.findUnique({
        where: { id },
        include: { yearlyBudgets: true }
      })

      if (!budgetLine || budgetLine.organizationId !== session.user.organizationId) {
        return NextResponse.json({ error: 'Ligne budgétaire non trouvée' }, { status: 404 })
      }

      // Chercher ou créer le budget annuel
      const existingYearBudget = budgetLine.yearlyBudgets?.find(
        (yb: any) => yb.year === year
      )

      if (existingYearBudget) {
        // Mise à jour
        await prisma.yearlyBudget.update({
          where: { id: existingYearBudget.id },
          data: {
            budget: budget !== undefined ? budget : existingYearBudget.budget,
            engineered: engineered !== undefined ? engineered : existingYearBudget.engineered,
            invoiced: invoiced !== undefined ? invoiced : existingYearBudget.invoiced,
          }
        })
      } else {
        // Création
        await prisma.yearlyBudget.create({
          data: {
            year,
            budget: budget || 0,
            engineered: engineered || 0,
            invoiced: invoiced || 0,
            budgetLineId: id
          }
        })
      }

      // Invalider le cache des budget lines
      clearBudgetLinesCache(session.user.organizationId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'lineId ou budgetLineId requis' }, { status: 400 })
  } catch (error) {
    console.error('Error updating yearly budgets:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
