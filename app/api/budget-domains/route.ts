import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Cache côté serveur - 3 secondes pour navigation rapide
const CACHE_TTL = 3000
const cache = new Map<string, { data: any; timestamp: number }>()

// GET /api/budget-domains - Liste des domaines budgétaires
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const cacheKey = session.user.organizationId
    const cached = cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'private, max-age=3',
        },
      })
    }

    const domains = await prisma.budgetStructureDomain.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      include: {
        type: {
          select: {
            name: true,
            color: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    cache.set(cacheKey, { data: domains, timestamp: Date.now() })

    return NextResponse.json(domains, {
      headers: {
        'Cache-Control': 'private, max-age=3',
      },
    })
  } catch (error) {
    console.error('Error fetching budget domains:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
