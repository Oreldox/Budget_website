import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/poles - Récupérer tous les pôles (avec filtre optionnel par serviceId)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const serviceId = searchParams.get('serviceId')

    const where: any = {}

    if (serviceId) {
      where.serviceId = serviceId
    }

    const poles = await prisma.pole.findMany({
      where,
      include: {
        service: true,
        _count: {
          select: {
            budgetLines: true,
            forecastBudgetLines: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(poles)
  } catch (error: any) {
    console.error('Error fetching poles:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des pôles', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/poles - Créer un nouveau pôle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { serviceId, name, description, color } = body

    if (!serviceId || !name) {
      return NextResponse.json(
        { error: 'Le serviceId et le nom du pôle sont requis' },
        { status: 400 }
      )
    }

    const pole = await prisma.pole.create({
      data: {
        serviceId,
        name,
        description: description || null,
        color: color || null
      },
      include: {
        service: true
      }
    })

    return NextResponse.json({ message: 'Pôle créé avec succès', pole })
  } catch (error: any) {
    console.error('Error creating pole:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du pôle', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/poles - Mettre à jour un pôle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, color } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID du pôle manquant' },
        { status: 400 }
      )
    }

    const data: any = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description
    if (color !== undefined) data.color = color

    const pole = await prisma.pole.update({
      where: { id },
      data,
      include: {
        service: true
      }
    })

    return NextResponse.json({ message: 'Pôle mis à jour', pole })
  } catch (error: any) {
    console.error('Error updating pole:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du pôle', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/poles - Supprimer un pôle
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID du pôle manquant' },
        { status: 400 }
      )
    }

    await prisma.pole.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Pôle supprimé avec succès' })
  } catch (error: any) {
    console.error('Error deleting pole:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du pôle', details: error.message },
      { status: 500 }
    )
  }
}
