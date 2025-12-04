import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/budget-years - Liste des années disponibles
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Récupérer toutes les années distinctes des yearlyBudgets
    const yearlyBudgets = await prisma.yearlyBudget.findMany({
      where: {
        budgetLine: {
          organizationId: session.user.organizationId!,
        },
      },
      select: {
        year: true,
      },
      distinct: ['year'],
      orderBy: {
        year: 'desc',
      },
    })

    const years = yearlyBudgets.map((yb) => yb.year)

    return NextResponse.json({ years })
  } catch (error) {
    console.error('Error fetching budget years:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des années' },
      { status: 500 }
    )
  }
}

// POST /api/budget-years - Créer une nouvelle année (vierge ou copiée)
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const { year, copyFrom } = body

    if (!year || typeof year !== 'number') {
      return NextResponse.json({ error: 'Année invalide' }, { status: 400 })
    }

    // Vérifier que l'année n'existe pas déjà
    const existingYear = await prisma.yearlyBudget.findFirst({
      where: {
        year,
        budgetLine: {
          organizationId: session.user.organizationId!,
        },
      },
    })

    if (existingYear) {
      return NextResponse.json({ error: 'Cette année existe déjà' }, { status: 400 })
    }

    let copiedLines = 0

    if (copyFrom && typeof copyFrom === 'number') {
      // Option 2: Copier depuis une année existante
      const sourceBudgets = await prisma.budgetLine.findMany({
        where: {
          organizationId: session.user.organizationId!,
        },
        include: {
          yearlyBudgets: {
            where: {
              year: copyFrom,
            },
          },
        },
      })

      // Créer les yearlyBudgets pour la nouvelle année
      for (const budgetLine of sourceBudgets) {
        if (budgetLine.yearlyBudgets.length > 0) {
          const sourceYearlyBudget = budgetLine.yearlyBudgets[0]

          await prisma.yearlyBudget.create({
            data: {
              budgetLineId: budgetLine.id,
              year,
              budget: sourceYearlyBudget.budget,
              engineered: 0, // Remis à zéro pour la nouvelle année
              invoiced: 0,   // Remis à zéro pour la nouvelle année
            },
          })
          copiedLines++
        }
      }

      return NextResponse.json({
        success: true,
        year,
        copiedLines,
        message: `${copiedLines} lignes budgétaires copiées depuis ${copyFrom}`,
      })
    } else {
      // Option 1: Créer une année vierge
      // Ne créer AUCUNE ligne budgétaire, l'année est complètement vide
      // L'utilisateur ajoutera ses propres lignes manuellement

      return NextResponse.json({
        success: true,
        year,
        createdLines: 0,
        message: `Année ${year} créée vide, vous pouvez maintenant ajouter vos lignes budgétaires`,
      })
    }
  } catch (error) {
    console.error('Error creating budget year:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'année' },
      { status: 500 }
    )
  }
}
