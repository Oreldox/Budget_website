import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const yearsParam = searchParams.get('years')

    if (!yearsParam) {
      return NextResponse.json({ error: 'Years parameter is required' }, { status: 400 })
    }

    const years = yearsParam.split(',').map(y => parseInt(y.trim()))

    // Récupérer toutes les factures pour les années demandées (optimisé avec l'index sur invoiceDate)
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)

    const invoices = await prisma.invoice.findMany({
      where: {
        invoiceDate: {
          gte: new Date(`${minYear}-01-01`),
          lte: new Date(`${maxYear}-12-31`),
        },
      },
      select: {
        amount: true,
        invoiceDate: true,
      },
      orderBy: {
        invoiceDate: 'asc'
      }
    })

    // Organiser les données par mois
    const monthlyData: any[] = []

    for (let month = 1; month <= 12; month++) {
      const dataPoint: any = {
        month: new Date(2024, month - 1).toLocaleDateString('fr-FR', { month: 'short' }),
      }

      years.forEach(year => {
        const monthInvoices = invoices.filter(inv => {
          const invDate = new Date(inv.invoiceDate)
          return invDate.getFullYear() === year && invDate.getMonth() + 1 === month
        })

        const total = monthInvoices.reduce((sum, inv) => sum + inv.amount, 0)
        dataPoint[year.toString()] = total
      })

      monthlyData.push(dataPoint)
    }

    return NextResponse.json(monthlyData)
  } catch (error) {
    console.error('Error fetching monthly budget stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
