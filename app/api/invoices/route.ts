import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const invoiceSchema = z.object({
  number: z.string().min(1),
  lineNumber: z.string().optional(),
  contractId: z.string().optional(),
  vendor: z.string().min(1),
  supplierCode: z.string().optional(),
  description: z.string().min(1),
  amount: z.number().positive(),
  amountHT: z.number().positive().optional(),
  isCredit: z.boolean().default(false), // true = avoir, false = facture normale
  dueDate: z.string(),
  invoiceDate: z.string(),
  paymentDate: z.string().optional(),
  status: z.enum(['Payée', 'En attente', 'Retard']),
  tags: z.array(z.string()).default([]),
  comment: z.string().optional(),
  domainId: z.string(),
  typeId: z.string(),
  nature: z.enum(['Investissement', 'Fonctionnement']),
  budgetLineId: z.string().optional(),
  accountingCode: z.string().optional(),
  allocationCode: z.string().optional(),
  commandNumber: z.string().optional(),
  pointed: z.boolean().default(false),
})

// GET /api/invoices - Liste des factures avec filtres
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
    const nature = searchParams.get('nature')
    const year = searchParams.get('year')
    const unpointedOnly = searchParams.get('unpointedOnly') === 'true'
    const withoutContract = searchParams.get('withoutContract') === 'true'
    const search = searchParams.get('search')

    const where: any = {
      organizationId: session.user.organizationId,
    }

    if (status) where.status = status
    if (vendor) where.vendor = { contains: vendor, mode: 'insensitive' }
    if (nature) where.nature = nature
    if (year) where.invoiceYear = parseInt(year)
    if (unpointedOnly) where.pointed = false
    if (withoutContract) where.contractId = null

    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
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

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          type: { select: { name: true, color: true } },
          domain: { select: { name: true } },
          budgetLine: { select: { label: true } },
          contract: { select: { number: true, label: true } },
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
        orderBy: { invoiceDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count({ where }),
    ])

    return NextResponse.json({
      data: invoices,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/invoices - Créer une facture
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    if (session.user.role === 'viewer') {
      return NextResponse.json({ error: 'Les lecteurs ne peuvent pas créer de factures' }, { status: 403 })
    }

    const body = await req.json()
    const data = invoiceSchema.parse(body)

    const invoiceDate = new Date(data.invoiceDate)
    const invoiceYear = invoiceDate.getFullYear()

    // Nettoyer les champs optionnels vides
    const cleanedData: any = {
      number: data.number,
      lineNumber: data.lineNumber || null,
      vendor: data.vendor,
      supplierCode: data.supplierCode || null,
      description: data.description,
      amount: data.amount,
      amountHT: data.amountHT || null,
      isCredit: data.isCredit || false,
      invoiceDate: new Date(data.invoiceDate),
      dueDate: new Date(data.dueDate),
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
      status: data.status,
      tags: Array.isArray(data.tags) ? data.tags.join(',') : data.tags || null,
      comment: data.comment || null,
      typeId: data.typeId,
      domainId: data.domainId,
      nature: data.nature,
      accountingCode: data.accountingCode || null,
      allocationCode: data.allocationCode || null,
      commandNumber: data.commandNumber || null,
      pointed: data.pointed || false,
      invoiceYear,
      organizationId: session.user.organizationId,
    }

    // Ajouter les relations optionnelles seulement si elles sont définies
    if (data.budgetLineId && data.budgetLineId.trim() !== '') {
      cleanedData.budgetLineId = data.budgetLineId
    }
    if (data.contractId && data.contractId.trim() !== '') {
      cleanedData.contractId = data.contractId
    }

    // Debug log
    console.log('Creating invoice with data:', JSON.stringify(cleanedData, null, 2))

    const invoice = await prisma.invoice.create({
      data: cleanedData,
      include: {
        type: { select: { name: true, color: true } },
        domain: { select: { name: true } },
        budgetLine: { select: { label: true } },
        contract: { select: { number: true, label: true } },
      },
    })

    // Mettre à jour le montant facturé de la ligne budgétaire
    // Si c'est un avoir (isCredit=true), on soustrait le montant, sinon on l'ajoute
    if (data.budgetLineId) {
      const amountToApply = data.isCredit ? -data.amount : data.amount
      await prisma.budgetLine.update({
        where: { id: data.budgetLineId },
        data: {
          invoiced: {
            increment: amountToApply,
          },
        },
      })
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'Invoice',
        entityId: invoice.id,
        changes: JSON.stringify({ number: invoice.number, amount: invoice.amount }),
        organizationId: session.user.organizationId,
      },
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides', details: error.errors }, { status: 400 })
    }
    console.error('Error creating invoice:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
