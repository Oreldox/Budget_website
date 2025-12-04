import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const contractSchema = z.object({
  number: z.string().min(1),
  label: z.string().min(1),
  vendor: z.string().min(1),
  providerName: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  amount: z.number().positive(),
  typeId: z.string(),
  domainId: z.string(),
  budgetLineId: z.string().optional(),
  status: z.enum(['Actif', 'Expirant', 'Expiré']),
  description: z.string().optional(),
  constraints: z.string().optional(),
  accountingCode: z.string().optional(),
  allocationCode: z.string().optional(),
  yearlyAmounts: z.array(z.object({
    year: z.number(),
    amount: z.number(),
  })).default([]),
})

// GET /api/contracts - Liste des contrats avec filtres
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
    const domain = searchParams.get('domain')
    const year = searchParams.get('year')
    const search = searchParams.get('search')

    const where: any = {
      organizationId: session.user.organizationId,
    }

    if (status) where.status = status
    if (vendor) where.vendor = { contains: vendor, mode: 'insensitive' }

    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { label: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (domain) {
      const domainRecord = await prisma.budgetStructureDomain.findFirst({
        where: {
          name: domain,
          organizationId: session.user.organizationId,
        },
      })
      if (domainRecord) where.domainId = domainRecord.id
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: {
          type: { select: { name: true, color: true } },
          domain: { select: { name: true } },
          budgetLine: { select: { label: true } },
          yearlyAmounts: true,
          invoices: {
            select: {
              id: true,
              amount: true,
            }
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contract.count({ where }),
    ])

    // Calculer le total facturé pour chaque contrat
    const enrichedContracts = contracts.map(contract => {
      const totalInvoiced = contract.invoices.reduce((sum, inv) => sum + inv.amount, 0)
      const { invoices, ...rest } = contract
      return {
        ...rest,
        totalInvoiced,
      }
    })

    return NextResponse.json({
      data: enrichedContracts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Error fetching contracts:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/contracts - Créer un contrat
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    if (session.user.role === 'viewer') {
      return NextResponse.json({ error: 'Les lecteurs ne peuvent pas créer de contrats' }, { status: 403 })
    }

    const body = await req.json()
    const data = contractSchema.parse(body)

    const { yearlyAmounts, ...contractData } = data

    const contract = await prisma.contract.create({
      data: {
        ...contractData,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        organizationId: session.user.organizationId,
        yearlyAmounts: {
          create: yearlyAmounts,
        },
      },
      include: {
        type: { select: { name: true, color: true } },
        domain: { select: { name: true } },
        budgetLine: { select: { label: true } },
        yearlyAmounts: true,
      },
    })

    // Mettre à jour le montant engagé de la ligne budgétaire
    if (data.budgetLineId) {
      await prisma.budgetLine.update({
        where: { id: data.budgetLineId },
        data: {
          engineered: {
            increment: data.amount,
          },
        },
      })
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'Contract',
        entityId: contract.id,
        changes: JSON.stringify({ number: contract.number, amount: contract.amount }),
        organizationId: session.user.organizationId,
      },
    })

    return NextResponse.json(contract, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides', details: error.errors }, { status: 400 })
    }
    console.error('Error creating contract:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
