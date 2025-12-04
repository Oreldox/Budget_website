import { prisma } from '../lib/prisma'

async function initYearlyBudgets() {
  try {
    console.log('\n=== INITIALIZING YEARLY BUDGETS ===\n')

    // Get all budget lines
    const budgetLines = await prisma.budgetLine.findMany({
      include: {
        yearlyBudgets: true,
        invoices: true
      }
    })

    console.log(`Found ${budgetLines.length} budget lines`)

    const years = [2023, 2024, 2025]

    for (const line of budgetLines) {
      console.log(`\nProcessing: ${line.label}`)

      for (const year of years) {
        // Check if year budget already exists
        const existing = line.yearlyBudgets?.find((yb: any) => yb.year === year)

        if (existing) {
          console.log(`  ${year}: Already exists, updating...`)

          // Calculate invoiced amount for this year
          const yearInvoices = line.invoices.filter(inv => {
            const invDate = new Date(inv.invoiceDate)
            return invDate.getFullYear() === year
          })

          const invoiced = yearInvoices.reduce((sum, inv) => sum + inv.amount, 0)

          // Update
          await prisma.yearlyBudget.update({
            where: { id: existing.id },
            data: {
              invoiced,
              engineered: invoiced, // For now, engineered = invoiced
            }
          })

          console.log(`    Updated: invoiced=${invoiced}`)
        } else {
          console.log(`  ${year}: Creating...`)

          // Calculate invoiced amount for this year
          const yearInvoices = line.invoices.filter(inv => {
            const invDate = new Date(inv.invoiceDate)
            return invDate.getFullYear() === year
          })

          const invoiced = yearInvoices.reduce((sum, inv) => sum + inv.amount, 0)

          // Create with a default budget (we'll set real budgets later)
          const budget = invoiced > 0 ? Math.round(invoiced * 1.2) : 10000

          await prisma.yearlyBudget.create({
            data: {
              year,
              budget,
              engineered: invoiced,
              invoiced,
              budgetLineId: line.id
            }
          })

          console.log(`    Created: budget=${budget}, invoiced=${invoiced}`)
        }
      }
    }

    console.log('\n=== DONE ===\n')

    // Verify
    const linesWithBudgets = await prisma.budgetLine.findMany({
      include: {
        yearlyBudgets: true
      }
    })

    linesWithBudgets.forEach(line => {
      const years = line.yearlyBudgets?.map((yb: any) => yb.year).join(', ')
      console.log(`${line.label}: ${years}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

initYearlyBudgets()
