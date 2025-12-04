import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/forecast-expenses - Récupérer toutes les dépenses prévisionnelles (avec filtres optionnels)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const forecastBudgetLineId = searchParams.get('forecastBudgetLineId')
    const year = searchParams.get('year')
    const onlyAvailable = searchParams.get('onlyAvailable') === 'true'
    const excludeInvoiceId = searchParams.get('excludeInvoiceId')
    const excludePurchaseOrderId = searchParams.get('excludePurchaseOrderId')

    const where: any = {}

    if (forecastBudgetLineId) {
      where.forecastBudgetLineId = forecastBudgetLineId
    }

    if (year) {
      where.year = parseInt(year)
    }

    const expenses = await prisma.forecastExpense.findMany({
      where,
      include: {
        forecastBudgetLine: {
          include: {
            type: true,
            domain: true
          }
        },
        linkedInvoices: {
          select: {
            id: true,
            number: true,
            amount: true,
            vendor: true,
            invoiceDate: true,
            status: true
          }
        },
        linkedPurchaseOrders: {
          select: {
            id: true,
            number: true,
            amount: true,
            vendor: true,
            orderDate: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Filtrer pour ne garder que les dépenses disponibles (sans facture liée)
    let filteredExpenses = expenses
    if (onlyAvailable) {
      filteredExpenses = expenses.filter(expense => {
        // Une dépense est disponible si elle n'a aucune facture liée
        // OU si la seule facture liée est celle qu'on est en train d'éditer (excludeInvoiceId)
        if (expense.linkedInvoices.length === 0) return true
        if (excludeInvoiceId && expense.linkedInvoices.length === 1 && expense.linkedInvoices[0].id === excludeInvoiceId) return true
        return false
      })
    }

    return NextResponse.json(filteredExpenses)
  } catch (error: any) {
    console.error('Error fetching forecast expenses:', error)
    console.error('Error details:', error.message, error.stack)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des dépenses prévisionnelles', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/forecast-expenses - Créer une nouvelle dépense prévisionnelle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { forecastBudgetLineId, year, label, description, amount } = body

    if (!forecastBudgetLineId || !year || !label || amount === undefined) {
      return NextResponse.json(
        { error: 'Champs manquants : forecastBudgetLineId, year, label et amount sont requis' },
        { status: 400 }
      )
    }

    const expense = await prisma.forecastExpense.create({
      data: {
        forecastBudgetLineId,
        year: parseInt(year),
        label,
        description: description || null,
        amount: parseFloat(amount)
      },
      include: {
        forecastBudgetLine: {
          include: {
            type: true,
            domain: true
          }
        }
      }
    })

    return NextResponse.json({ message: 'Dépense prévisionnelle créée avec succès', expense })
  } catch (error: any) {
    console.error('Error creating forecast expense:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la dépense prévisionnelle', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/forecast-expenses - Mettre à jour une dépense prévisionnelle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, label, description, amount } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la dépense manquant' },
        { status: 400 }
      )
    }

    const data: any = {}
    if (label !== undefined) data.label = label
    if (description !== undefined) data.description = description
    if (amount !== undefined) data.amount = parseFloat(amount)

    const expense = await prisma.forecastExpense.update({
      where: { id },
      data,
      include: {
        forecastBudgetLine: {
          include: {
            type: true,
            domain: true
          }
        }
      }
    })

    return NextResponse.json({ message: 'Dépense prévisionnelle mise à jour', expense })
  } catch (error: any) {
    console.error('Error updating forecast expense:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la dépense prévisionnelle', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/forecast-expenses - Supprimer une dépense prévisionnelle
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la dépense manquant' },
        { status: 400 }
      )
    }

    await prisma.forecastExpense.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Dépense prévisionnelle supprimée avec succès' })
  } catch (error: any) {
    console.error('Error deleting forecast expense:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la dépense prévisionnelle', details: error.message },
      { status: 500 }
    )
  }
}
