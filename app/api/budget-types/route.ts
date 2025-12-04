import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Cache côté serveur - 3 secondes pour navigation rapide
const CACHE_TTL = 3000
const cache = new Map<string, { data: any; timestamp: number }>()

// GET /api/budget-types - Liste des types de budget
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

    const budgetTypes = await prisma.budgetType.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      orderBy: { name: 'asc' },
    })

    cache.set(cacheKey, { data: budgetTypes, timestamp: Date.now() })

    return NextResponse.json(budgetTypes, {
      headers: {
        'Cache-Control': 'private, max-age=3',
      },
    })
  } catch (error) {
    console.error('Error fetching budget types:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
