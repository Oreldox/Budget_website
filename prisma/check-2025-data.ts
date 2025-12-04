import { prisma } from '../lib/prisma'

async function check2025Data() {
  try {
    console.log('🔍 Vérification des données 2025...\n')

    // 1. Vérifier les factures 2025
    const invoices2025 = await prisma.invoice.findMany({
      where: {
        invoiceYear: 2025,
      },
      include: {
        budgetLine: {
          select: {
            id: true,
            label: true,
          },
        },
      },
    })

    console.log(`📄 ${invoices2025.length} factures avec invoiceYear = 2025\n`)
    for (const invoice of invoices2025) {
      console.log(`   - ${invoice.number}: ${invoice.amount}€ (Ligne: ${invoice.budgetLine?.label || 'AUCUNE'})`)
    }

    // 2. Vérifier les yearlyBudgets 2025
    const yearlyBudgets2025 = await prisma.yearlyBudget.findMany({
      where: {
        year: 2025,
      },
      include: {
        budgetLine: {
          select: {
            label: true,
          },
        },
      },
    })

    console.log(`\n📊 ${yearlyBudgets2025.length} yearlyBudgets pour l'année 2025\n`)
    for (const yb of yearlyBudgets2025) {
      console.log(`   - ${yb.budgetLine.label}:`)
      console.log(`      Budget: ${yb.budget}€`)
      console.log(`      Engagé: ${yb.engineered}€`)
      console.log(`      Facturé: ${yb.invoiced}€`)
    }

    // 3. Vérifier s'il y a des factures 2025 sans budgetLineId
    const orphanInvoices = await prisma.invoice.findMany({
      where: {
        invoiceYear: 2025,
        budgetLineId: null,
      },
    })

    console.log(`\n⚠️  ${orphanInvoices.length} factures 2025 SANS ligne budgétaire\n`)
    for (const invoice of orphanInvoices) {
      console.log(`   - ${invoice.number}: ${invoice.amount}€`)
    }

    // 4. Total attendu
    const totalExpected = invoices2025
      .filter((i) => i.budgetLineId !== null)
      .reduce((sum, i) => sum + i.amount, 0)

    const totalInYearlyBudgets = yearlyBudgets2025.reduce((sum, yb) => sum + yb.invoiced, 0)

    console.log(`\n💰 Total factures 2025 avec ligne budgétaire: ${totalExpected}€`)
    console.log(`💰 Total dans yearlyBudgets 2025: ${totalInYearlyBudgets}€`)

    if (totalExpected !== totalInYearlyBudgets) {
      console.log(`\n❌ PROBLÈME: Les montants ne correspondent pas!`)
    } else {
      console.log(`\n✅ Les montants correspondent`)
    }

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

check2025Data()
