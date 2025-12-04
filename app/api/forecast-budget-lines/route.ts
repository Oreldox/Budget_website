import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/forecast-budget-lines - Récupérer toutes les lignes budgétaires prévisionnelles
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year')

    // Récupérer toutes les organisations (en pratique il n'y en a qu'une seule dans ce projet)
    const organizations = await prisma.organization.findMany({
      select: { id: true }
    })

    if (organizations.length === 0) {
      return NextResponse.json([])
    }

    const where: any = {
      organizationId: organizations[0].id
    }

    if (year) {
      where.year = parseInt(year)
    }

    const lines = await prisma.forecastBudgetLine.findMany({
      where,
      include: {
        type: true,
        domain: true,
        expenses: true,
        pole: {
          include: {
            service: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(lines)
  } catch (error: any) {
    console.error('Error fetching forecast budget lines:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des lignes budgétaires', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/forecast-budget-lines - Créer une nouvelle ligne budgétaire prévisionnelle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { typeId, domainId, label, description, budget, accountingCode, nature, year, poleId } = body

    if (!typeId || !domainId || !label || !year || budget === undefined) {
      return NextResponse.json(
        { error: 'Champs manquants : typeId, domainId, label, year et budget sont requis' },
        { status: 400 }
      )
    }

    // Récupérer l'organizationId depuis le type
    const type = await prisma.budgetType.findUnique({
      where: { id: typeId },
      select: { organizationId: true }
    })

    if (!type) {
      return NextResponse.json(
        { error: 'Type non trouvé' },
        { status: 404 }
      )
    }

    const line = await prisma.forecastBudgetLine.create({
      data: {
        organizationId: type.organizationId,
        typeId,
        domainId,
        label,
        description: description || null,
        budget: parseFloat(budget),
        accountingCode: accountingCode || null,
        nature: nature || null,
        year: parseInt(year),
        poleId: poleId || null
      },
      include: {
        type: true,
        domain: true,
        expenses: true,
        pole: {
          include: {
            service: true
          }
        }
      }
    })

    return NextResponse.json({ message: 'Ligne budgétaire prévisionnelle créée avec succès', line })
  } catch (error: any) {
    console.error('Error creating forecast budget line:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la ligne budgétaire', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/forecast-budget-lines - Mettre à jour une ligne budgétaire prévisionnelle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, label, description, budget, accountingCode, poleId } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la ligne budgétaire manquant' },
        { status: 400 }
      )
    }

    const data: any = {}
    if (label !== undefined) data.label = label
    if (description !== undefined) data.description = description
    if (budget !== undefined) data.budget = parseFloat(budget)
    if (accountingCode !== undefined) data.accountingCode = accountingCode
    if (poleId !== undefined) data.poleId = poleId || null

    const line = await prisma.forecastBudgetLine.update({
      where: { id },
      data,
      include: {
        type: true,
        domain: true,
        expenses: true,
        pole: {
          include: {
            service: true
          }
        }
      }
    })

    return NextResponse.json({ message: 'Ligne budgétaire mise à jour', line })
  } catch (error: any) {
    console.error('Error updating forecast budget line:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la ligne budgétaire', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/forecast-budget-lines - Supprimer une ligne budgétaire prévisionnelle
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la ligne budgétaire manquant' },
        { status: 400 }
      )
    }

    await prisma.forecastBudgetLine.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Ligne budgétaire supprimée avec succès' })
  } catch (error: any) {
    console.error('Error deleting forecast budget line:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la ligne budgétaire', details: error.message },
      { status: 500 }
    )
  }
}
