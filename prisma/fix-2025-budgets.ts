import { prisma } from '../lib/prisma'

async function fix2025Budgets() {
  try {
    console.log('🔧 Correction des yearlyBudgets 2025...\n')

    // Récupérer toutes les lignes budgétaires
    const budgetLines = await prisma.budgetLine.findMany()

    for (const line of budgetLines) {
      console.log(`\n📌 ${line.label}`)

      // Récupérer tous les contrats et factures 2025 pour cette ligne
      const [contracts2025, invoices2025] = await Promise.all([
        prisma.contract.findMany({
          where: {
            budgetLineId: line.id,
            startDate: {
              gte: new Date('2025-01-01'),
              lt: new Date('2026-01-01'),
            }
          }
        }),
        prisma.invoice.findMany({
          where: {
            budgetLineId: line.id,
            invoiceYear: 2025,
          }
        })
      ])

      const engineered = contracts2025.reduce((sum, c) => sum + c.amount, 0)
      const invoiced = invoices2025.reduce((sum, i) => sum + i.amount, 0)

      console.log(`   - ${contracts2025.length} contrats → ${engineered}€ engagé`)
      console.log(`   - ${invoices2025.length} factures → ${invoiced}€ facturé`)

      // Trouver le yearlyBudget 2025 pour cette ligne
      const yearlyBudget2025 = await prisma.yearlyBudget.findFirst({
        where: {
          budgetLineId: line.id,
          year: 2025,
        }
      })

      if (yearlyBudget2025) {
        // Mettre à jour
        await prisma.yearlyBudget.update({
          where: { id: yearlyBudget2025.id },
          data: {
            engineered,
            invoiced,
          }
        })
        console.log(`   ✅ YearlyBudget 2025 mis à jour`)
      } else {
        // Créer
        await prisma.yearlyBudget.create({
          data: {
            budgetLineId: line.id,
            year: 2025,
            budget: 300000, // Budget par défaut
            engineered,
            invoiced,
          }
        })
        console.log(`   ✨ YearlyBudget 2025 créé`)
      }
    }

    console.log('\n\n✅ Tous les yearlyBudgets 2025 sont à jour!')

    // Afficher le résumé
    const summary = await prisma.yearlyBudget.findMany({
      where: { year: 2025 },
      include: {
        budgetLine: {
          select: { label: true }
        }
      }
    })

    console.log('\n📊 Résumé 2025:')
    let totalBudget = 0
    let totalEngineered = 0
    let totalInvoiced = 0

    for (const yb of summary) {
      console.log(`   ${yb.budgetLine.label}:`)
      console.log(`      Budget: ${yb.budget}€, Engagé: ${yb.engineered}€, Facturé: ${yb.invoiced}€`)
      totalBudget += yb.budget
      totalEngineered += yb.engineered
      totalInvoiced += yb.invoiced
    }

    console.log(`\n   TOTAL 2025:`)
    console.log(`      Budget: ${totalBudget}€`)
    console.log(`      Engagé: ${totalEngineered}€`)
    console.log(`      Facturé: ${totalInvoiced}€`)
    console.log(`      Disponible: ${totalBudget - totalEngineered}€`)

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fix2025Budgets()
