import { prisma } from '../lib/prisma'

async function recalculateBudgets() {
  try {
    console.log('🔄 Recalcul des montants engagés et facturés...\n')

    // 1. Récupérer toutes les lignes budgétaires
    const budgetLines = await prisma.budgetLine.findMany({
      include: {
        yearlyBudgets: true,
      }
    })

    console.log(`📊 ${budgetLines.length} lignes budgétaires trouvées\n`)

    // 2. Pour chaque ligne budgétaire
    for (const line of budgetLines) {
      console.log(`\n📌 Traitement: ${line.label}`)

      // Récupérer tous les contrats liés à cette ligne
      const contracts = await prisma.contract.findMany({
        where: { budgetLineId: line.id }
      })

      // Récupérer toutes les factures liées à cette ligne
      const invoices = await prisma.invoice.findMany({
        where: { budgetLineId: line.id }
      })

      console.log(`   - ${contracts.length} contrats`)
      console.log(`   - ${invoices.length} factures`)

      // Calculer les montants par année
      const yearlyData = new Map<number, { engineered: number; invoiced: number }>()

      // Ajouter les contrats (engagé)
      for (const contract of contracts) {
        const startYear = new Date(contract.startDate).getFullYear()

        if (!yearlyData.has(startYear)) {
          yearlyData.set(startYear, { engineered: 0, invoiced: 0 })
        }

        const data = yearlyData.get(startYear)!
        data.engineered += contract.amount
      }

      // Ajouter les factures (facturé)
      for (const invoice of invoices) {
        const invoiceYear = invoice.invoiceYear || new Date(invoice.invoiceDate).getFullYear()

        if (!yearlyData.has(invoiceYear)) {
          yearlyData.set(invoiceYear, { engineered: 0, invoiced: 0 })
        }

        const data = yearlyData.get(invoiceYear)!
        data.invoiced += invoice.amount
      }

      // Mettre à jour ou créer les yearlyBudgets
      for (const [year, amounts] of yearlyData.entries()) {
        const existingYearlyBudget = line.yearlyBudgets.find(yb => yb.year === year)

        if (existingYearlyBudget) {
          // Mettre à jour
          await prisma.yearlyBudget.update({
            where: { id: existingYearlyBudget.id },
            data: {
              engineered: amounts.engineered,
              invoiced: amounts.invoiced,
            }
          })
          console.log(`   ✅ ${year}: Engagé ${amounts.engineered}€, Facturé ${amounts.invoiced}€`)
        } else {
          // Créer une nouvelle année avec budget = 0
          await prisma.yearlyBudget.create({
            data: {
              budgetLineId: line.id,
              year,
              budget: 0,
              engineered: amounts.engineered,
              invoiced: amounts.invoiced,
            }
          })
          console.log(`   ✨ ${year}: Créé avec Engagé ${amounts.engineered}€, Facturé ${amounts.invoiced}€`)
        }
      }

      // S'assurer qu'il y a au moins une année 2024 et 2025
      for (const year of [2024, 2025]) {
        const hasYear = line.yearlyBudgets.some(yb => yb.year === year) || yearlyData.has(year)

        if (!hasYear) {
          await prisma.yearlyBudget.create({
            data: {
              budgetLineId: line.id,
              year,
              budget: 0,
              engineered: 0,
              invoiced: 0,
            }
          })
          console.log(`   ➕ ${year}: Année créée avec budget 0€`)
        }
      }
    }

    console.log('\n\n✅ Recalcul terminé avec succès!')
    console.log('\n💡 Conseil: Va dans "Suivi budgétaire" et définis les budgets pour chaque année')

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

recalculateBudgets()
