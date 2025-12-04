import { prisma } from '../lib/prisma'

async function checkDataFlow() {
  try {
    console.log('\n=== CHECKING DATA FLOW ===\n')

    // 1. Check invoices
    const invoices = await prisma.invoice.findMany({
      take: 5,
      include: {
        budgetLine: {
          include: {
            yearlyBudgets: true
          }
        }
      }
    })

    console.log(`Total invoices sample: ${invoices.length}`)
    invoices.forEach(inv => {
      console.log(`\nInvoice ${inv.number}:`)
      console.log(`  Amount: ${inv.amount}`)
      console.log(`  Budget Line: ${inv.budgetLine?.label || 'NONE'}`)
      console.log(`  Yearly Budgets: ${inv.budgetLine?.yearlyBudgets?.length || 0}`)
    })

    // 2. Check budget lines with yearly budgets
    const budgetLines = await prisma.budgetLine.findMany({
      include: {
        yearlyBudgets: true,
        _count: {
          select: { invoices: true }
        }
      }
    })

    console.log(`\n\n=== BUDGET LINES ===`)
    console.log(`Total budget lines: ${budgetLines.length}`)

    budgetLines.forEach(line => {
      const years = line.yearlyBudgets?.map((yb: any) => yb.year).join(', ') || 'none'
      console.log(`\n${line.label}:`)
      console.log(`  Years: ${years}`)
      console.log(`  Invoices: ${line._count.invoices}`)

      line.yearlyBudgets?.forEach((yb: any) => {
        console.log(`    ${yb.year}: Budget=${yb.budget}, Engineered=${yb.engineered}, Invoiced=${yb.invoiced}`)
      })
    })

    // 3. Check if invoices are updating yearly budgets
    const year2024 = budgetLines[0]?.yearlyBudgets?.find((yb: any) => yb.year === 2024)
    if (year2024) {
      console.log(`\n\n=== CHECKING YEARLY BUDGET CALCULATION ===`)
      console.log(`First budget line 2024:`)
      console.log(`  Budget: ${year2024.budget}`)
      console.log(`  Engineered: ${year2024.engineered}`)
      console.log(`  Invoiced: ${year2024.invoiced}`)

      const lineInvoices = await prisma.invoice.findMany({
        where: {
          budgetLineId: budgetLines[0].id,
          invoiceDate: {
            gte: new Date('2024-01-01'),
            lt: new Date('2025-01-01')
          }
        }
      })

      const totalInvoiced = lineInvoices.reduce((sum, inv) => sum + inv.amount, 0)
      console.log(`  Actual invoices total: ${totalInvoiced}`)
      console.log(`  Match: ${totalInvoiced === year2024.invoiced ? 'YES' : 'NO - NEEDS UPDATE'}`)
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDataFlow()
