import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const purchaseOrderSchema = z.object({
  number: z.string().min(1),
  vendor: z.string().min(1),
  orderDate: z.string(),
  expectedDeliveryDate: z.string().optional(),
  amount: z.number().positive(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'CONFIRMED', 'DELIVERED', 'INVOICED', 'CANCELLED']).default('DRAFT'),
  linkedForecastExpenseId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  attachments: z.array(z.string()).default([]),
})

// GET /api/purchase-orders - Liste des bons de commande avec filtres
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const status = searchParams.get('status')
    const vendor = searchParams.get('vendor')
    const search = searchParams.get('search')
    const unlinked = searchParams.get('unlinked') === 'true' // Pour afficher uniquement les BCs non liés

    const where: any = {
      organizationId: session.user.organizationId,
    }

    if (status) where.status = status
    if (vendor) where.vendor = { contains: vendor, mode: 'insensitive' }
    if (unlinked) where.linkedForecastExpenseId = null

    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [purchaseOrders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
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
        orderBy: { orderDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseOrder.count({ where }),
    ])

    return NextResponse.json({
      purchaseOrders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('[GET /api/purchase-orders]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des bons de commande' },
      { status: 500 }
    )
  }
}

// POST /api/purchase-orders - Créer un bon de commande
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const data = purchaseOrderSchema.parse(body)

    // Vérifier l'unicité du numéro dans l'organisation
    const existing = await prisma.purchaseOrder.findUnique({
      where: {
        organizationId_number: {
          organizationId: session.user.organizationId,
          number: data.number,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Un bon de commande avec ce numéro existe déjà' },
        { status: 400 }
      )
    }

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        ...data,
        tags: data.tags.length > 0 ? JSON.stringify(data.tags) : null,
        attachments: data.attachments.length > 0 ? JSON.stringify(data.attachments) : null,
        orderDate: new Date(data.orderDate),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        organizationId: session.user.organizationId,
      },
      include: {
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

    return NextResponse.json(purchaseOrder, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[POST /api/purchase-orders]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du bon de commande' },
      { status: 500 }
    )
  }
}
