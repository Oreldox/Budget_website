import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/annual-budgets - Récupérer le budget annuel pour une année donnée
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year')

    if (!year) {
      return NextResponse.json({ error: 'Année requise' }, { status: 400 })
    }

    const yearInt = parseInt(year)

    // Récupérer le budget annuel pour cette année
    const annualBudget = await prisma.annualBudget.findUnique({
      where: {
        organizationId_year: {
          organizationId: session.user.organizationId!,
          year: yearInt,
        },
      },
    })

    if (!annualBudget) {
      // Si le budget annuel n'existe pas encore, retourner des valeurs par défaut
      return NextResponse.json({
        year: yearInt,
        budgetFonctionnement: 0,
        budgetInvestissement: 0,
        exists: false,
      })
    }

    return NextResponse.json({
      ...annualBudget,
      exists: true,
    })
  } catch (error) {
    console.error('Error fetching annual budget:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du budget annuel' },
      { status: 500 }
    )
  }
}

// POST /api/annual-budgets - Créer ou mettre à jour le budget annuel
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const { year, budgetFonctionnement, budgetInvestissement } = body

    if (!year || typeof year !== 'number') {
      return NextResponse.json({ error: 'Année invalide' }, { status: 400 })
    }

    if (
      budgetFonctionnement === undefined ||
      budgetInvestissement === undefined
    ) {
      return NextResponse.json(
        { error: 'Budgets requis' },
        { status: 400 }
      )
    }

    // Créer ou mettre à jour le budget annuel
    const annualBudget = await prisma.annualBudget.upsert({
      where: {
        organizationId_year: {
          organizationId: session.user.organizationId!,
          year,
        },
      },
      update: {
        budgetFonctionnement: parseFloat(budgetFonctionnement.toString()),
        budgetInvestissement: parseFloat(budgetInvestissement.toString()),
      },
      create: {
        organizationId: session.user.organizationId!,
        year,
        budgetFonctionnement: parseFloat(budgetFonctionnement.toString()),
        budgetInvestissement: parseFloat(budgetInvestissement.toString()),
      },
    })

    return NextResponse.json({
      success: true,
      annualBudget,
    })
  } catch (error) {
    console.error('Error creating/updating annual budget:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création/mise à jour du budget annuel' },
      { status: 500 }
    )
  }
}
