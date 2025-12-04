import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const organizationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'),
})

// GET /api/organizations - Liste des organisations
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Si super admin (pas d'org), voir toutes les orgs
    // Sinon, voir seulement son org
    const where = session.user.organizationId
      ? { id: session.user.organizationId }
      : {}

    const organizations = await prisma.organization.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            invoices: true,
            contracts: true,
            budgetLines: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(organizations)
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/organizations - Créer une organisation
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    // Seul un super admin peut créer une organisation
    if (!session?.user || session.user.role !== 'admin' || session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const data = organizationSchema.parse(body)

    // Vérifier si le slug existe déjà
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: data.slug },
    })

    if (existingOrg) {
      return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 400 })
    }

    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
      },
      include: {
        _count: {
          select: {
            users: true,
            invoices: true,
            contracts: true,
            budgetLines: true,
          },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'Organization',
        entityId: organization.id,
        changes: JSON.stringify({ name: organization.name, slug: organization.slug }),
      },
    })

    return NextResponse.json(organization, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides', details: error.errors }, { status: 400 })
    }
    console.error('Error creating organization:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
