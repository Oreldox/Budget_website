import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/services - Récupérer tous les services
export async function GET(request: NextRequest) {
  try {
    // Récupérer toutes les organisations
    const organizations = await prisma.organization.findMany({
      select: { id: true }
    })

    if (organizations.length === 0) {
      return NextResponse.json([])
    }

    const services = await prisma.service.findMany({
      where: {
        organizationId: organizations[0].id
      },
      include: {
        poles: {
          include: {
            _count: {
              select: {
                budgetLines: true,
                forecastBudgetLines: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(services)
  } catch (error: any) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des services', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/services - Créer un nouveau service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, color } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Le nom du service est requis' },
        { status: 400 }
      )
    }

    // Récupérer l'organization
    const organizations = await prisma.organization.findMany({
      select: { id: true }
    })

    if (organizations.length === 0) {
      return NextResponse.json(
        { error: 'Aucune organisation trouvée' },
        { status: 404 }
      )
    }

    const service = await prisma.service.create({
      data: {
        organizationId: organizations[0].id,
        name,
        description: description || null,
        color: color || null
      },
      include: {
        poles: true
      }
    })

    return NextResponse.json({ message: 'Service créé avec succès', service })
  } catch (error: any) {
    console.error('Error creating service:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du service', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/services - Mettre à jour un service
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, color } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID du service manquant' },
        { status: 400 }
      )
    }

    const data: any = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description
    if (color !== undefined) data.color = color

    const service = await prisma.service.update({
      where: { id },
      data,
      include: {
        poles: true
      }
    })

    return NextResponse.json({ message: 'Service mis à jour', service })
  } catch (error: any) {
    console.error('Error updating service:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du service', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/services - Supprimer un service
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID du service manquant' },
        { status: 400 }
      )
    }

    await prisma.service.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Service supprimé avec succès' })
  } catch (error: any) {
    console.error('Error deleting service:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du service', details: error.message },
      { status: 500 }
    )
  }
}
