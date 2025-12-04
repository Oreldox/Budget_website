import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const budgetLineSchema = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
  typeId: z.string(),
  domainId: z.string(),
  accountingCode: z.string().optional(),
  allocationCode: z.string().optional(),
  year: z.number().int(),
  budget: z.number().optional(),
  poleId: z.string().optional().nullable(),
})

// GET /api/budget-lines - Liste des lignes budgétaires avec filtres
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '25')
    const domain = searchParams.get('domain')
    const type = searchParams.get('type')
    const year = searchParams.get('year')
    const search = searchParams.get('search')
    const nature = searchParams.get('nature')
    const all = searchParams.get('all') === 'true'

    const where: any = {
      organizationId: session.user.organizationId,
    }

    if (domain) {
      const domainRecord = await prisma.budgetStructureDomain.findFirst({
        where: {
          name: domain,
          organizationId: session.user.organizationId!,
        },
      })
      if (domainRecord) where.domainId = domainRecord.id
    }

    if (type) {
      const typeRecord = await prisma.budgetType.findFirst({
        where: {
          name: type,
          organizationId: session.user.organizationId!,
        },
      })
      if (typeRecord) where.typeId = typeRecord.id
    }

    if (search) {
      where.OR = [
        { label: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { accountingCode: { contains: search, mode: 'insensitive' } },
        { allocationCode: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (nature) {
      where.nature = nature
    }

    // Filtrer par année : ne montrer QUE les lignes qui ont un yearlyBudget pour cette année
    if (year) {
      where.yearlyBudgets = {
        some: {
          year: parseInt(year),
        },
      }
    }

    if (all) {
      // Retourner toutes les lignes budgétaires sans pagination
      const budgetLines = await prisma.budgetLine.findMany({
        where,
        include: {
          type: { select: { name: true, color: true } },
          domain: { select: { name: true } },
          pole: {
            include: {
              service: true
            }
          },
          poleAllocations: {
            include: {
              pole: {
                include: {
                  service: true
                }
              }
            },
            orderBy: { percentage: 'desc' },
          },
          yearlyBudgets: {
            where: year ? { year: parseInt(year) } : undefined,
            select: {
              year: true,
              budget: true,
              engineered: true,
              invoiced: true,
            },
          },
          contracts: {
            select: {
              id: true,
              number: true,
              label: true,
              amount: true,
              status: true,
            },
          },
          invoices: {
            select: {
              id: true,
              number: true,
              amount: true,
              status: true,
            },
          },
        },
        orderBy: { label: 'asc' },
      })

      return NextResponse.json({ data: budgetLines })
    }

    const [budgetLines, total] = await Promise.all([
      prisma.budgetLine.findMany({
        where,
        include: {
          type: { select: { name: true, color: true } },
          domain: { select: { name: true } },
          pole: {
            include: {
              service: true
            }
          },
          poleAllocations: {
            include: {
              pole: {
                include: {
                  service: true
                }
              }
            },
            orderBy: { percentage: 'desc' },
          },
          yearlyBudgets: {
            where: year ? { year: parseInt(year) } : undefined,
            select: {
              year: true,
              budget: true,
              engineered: true,
              invoiced: true,
            },
          },
          _count: {
            select: {
              contracts: true,
              invoices: true,
            },
          },
        },
        orderBy: { label: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.budgetLine.count({ where }),
    ])

    return NextResponse.json({
      data: budgetLines,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Error fetching budget lines:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des lignes budgétaires' },
      { status: 500 }
    )
  }
}

// POST /api/budget-lines - Créer une nouvelle ligne budgétaire
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const validatedData = budgetLineSchema.parse(body)

    const { year, budget: yearlyBudget, poleId, ...budgetLineData } = validatedData

    // Utiliser une transaction pour créer la ligne et le budget annuel
    const result = await prisma.$transaction(async (tx) => {
      // Vérifier si le type existe
      const typeExists = await tx.budgetType.findFirst({
        where: {
          id: budgetLineData.typeId,
          organizationId: session.user.organizationId!,
        },
      })

      if (!typeExists) {
        throw new Error('Type invalide')
      }

      // Vérifier si le domaine existe
      const domainExists = await tx.budgetStructureDomain.findFirst({
        where: {
          id: budgetLineData.domainId,
          organizationId: session.user.organizationId!,
        },
      })

      if (!domainExists) {
        throw new Error('Domaine invalide')
      }

      // Créer la ligne budgétaire
      const line = await tx.budgetLine.create({
        data: {
          ...budgetLineData,
          budget: 0, // Budget global par défaut à 0
          engineered: 0,
          invoiced: 0,
          organizationId: session.user.organizationId!,
          poleId: poleId || null,
        },
        include: {
          type: { select: { name: true, color: true } },
          domain: { select: { name: true } },
          pole: {
            include: {
              service: true
            }
          },
        },
      })

      // Créer le budget annuel associé
      await tx.yearlyBudget.create({
        data: {
          budgetLineId: line.id,
          year,
          budget: yearlyBudget || 0,
          engineered: 0,
          invoiced: 0,
        },
      })

      return line
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating budget line:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la création de la ligne budgétaire' },
      { status: 500 }
    )
  }
}

// DELETE /api/budget-lines - Supprimer une ligne budgétaire
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    // Vérifier que la ligne budgétaire appartient à l'organisation
    const budgetLine = await prisma.budgetLine.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId!,
      },
    })

    if (!budgetLine) {
      return NextResponse.json({ error: 'Ligne budgétaire non trouvée' }, { status: 404 })
    }

    // Supprimer la ligne budgétaire et ses budgets annuels (cascade)
    await prisma.budgetLine.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting budget line:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la ligne budgétaire' },
      { status: 500 }
    )
  }
}
