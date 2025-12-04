import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/vendors-list - Liste des fournisseurs uniques
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Récupérer les fournisseurs des contrats
    const contractVendors = await prisma.contract.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      select: {
        vendor: true,
        providerName: true,
      },
      distinct: ['vendor'],
    })

    // Récupérer les fournisseurs des factures
    const invoiceVendors = await prisma.invoice.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      select: {
        vendor: true,
      },
      distinct: ['vendor'],
    })

    // Combiner et dédupliquer
    const vendorsSet = new Set<string>()

    contractVendors.forEach(c => {
      if (c.vendor) vendorsSet.add(c.vendor)
      if (c.providerName) vendorsSet.add(c.providerName)
    })

    invoiceVendors.forEach(i => {
      if (i.vendor) vendorsSet.add(i.vendor)
    })

    const vendors = Array.from(vendorsSet).sort()

    return NextResponse.json(vendors)
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
