import { prisma } from '../lib/prisma'

async function autoAssignBudgets() {
  try {
    console.log('🔄 Attribution automatique des factures et contrats aux lignes budgétaires...\n')

    // 1. Récupérer toutes les lignes budgétaires avec leurs domaines
    const budgetLines = await prisma.budgetLine.findMany({
      include: {
        domain: true,
      }
    })

    console.log(`📊 ${budgetLines.length} lignes budgétaires trouvées\n`)

    // Créer un mapping domainId -> budgetLineIds
    const domainToBudgetLines = new Map<string, string[]>()
    for (const line of budgetLines) {
      if (!domainToBudgetLines.has(line.domainId)) {
        domainToBudgetLines.set(line.domainId, [])
      }
      domainToBudgetLines.get(line.domainId)!.push(line.id)
    }

    // 2. Traiter les factures sans ligne budgétaire
    const invoicesWithoutBudgetLine = await prisma.invoice.findMany({
      where: {
        budgetLineId: null,
      },
      include: {
        domain: true,
      }
    })

    console.log(`📄 ${invoicesWithoutBudgetLine.length} factures sans ligne budgétaire\n`)

    let invoicesAssigned = 0
    for (const invoice of invoicesWithoutBudgetLine) {
      if (!invoice.domainId) {
        console.log(`⚠️  Facture ${invoice.number} sans domaine - ignorée`)
        continue
      }

      const budgetLineIds = domainToBudgetLines.get(invoice.domainId)
      if (!budgetLineIds || budgetLineIds.length === 0) {
        console.log(`⚠️  Facture ${invoice.number} - aucune ligne budgétaire pour le domaine ${invoice.domain?.name}`)
        continue
      }

      // Prendre la première ligne budgétaire du domaine
      const budgetLineId = budgetLineIds[0]

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { budgetLineId }
      })

      console.log(`✅ Facture ${invoice.number} (${invoice.amount}€) assignée à ligne budgétaire`)
      invoicesAssigned++
    }

    // 3. Traiter les contrats sans ligne budgétaire
    const contractsWithoutBudgetLine = await prisma.contract.findMany({
      where: {
        budgetLineId: null,
      },
      include: {
        domain: true,
      }
    })

    console.log(`\n📝 ${contractsWithoutBudgetLine.length} contrats sans ligne budgétaire\n`)

    let contractsAssigned = 0
    for (const contract of contractsWithoutBudgetLine) {
      if (!contract.domainId) {
        console.log(`⚠️  Contrat ${contract.number} sans domaine - ignoré`)
        continue
      }

      const budgetLineIds = domainToBudgetLines.get(contract.domainId)
      if (!budgetLineIds || budgetLineIds.length === 0) {
        console.log(`⚠️  Contrat ${contract.number} - aucune ligne budgétaire pour le domaine ${contract.domain?.name}`)
        continue
      }

      // Prendre la première ligne budgétaire du domaine
      const budgetLineId = budgetLineIds[0]

      await prisma.contract.update({
        where: { id: contract.id },
        data: { budgetLineId }
      })

      console.log(`✅ Contrat ${contract.number} (${contract.amount}€) assigné à ligne budgétaire`)
      contractsAssigned++
    }

    console.log(`\n\n📊 Résumé:`)
    console.log(`   ✅ ${invoicesAssigned} factures assignées`)
    console.log(`   ✅ ${contractsAssigned} contrats assignés`)

    // 4. Maintenant recalculer tous les montants
    console.log('\n\n🔄 Recalcul des montants engagés et facturés...\n')

    for (const line of budgetLines) {
      console.log(`\n📌 ${line.label}`)

      // Récupérer tous les contrats et factures liés
      const [contracts, invoices] = await Promise.all([
        prisma.contract.findMany({ where: { budgetLineId: line.id } }),
        prisma.invoice.findMany({ where: { budgetLineId: line.id } })
      ])

      console.log(`   - ${contracts.length} contrats`)
      console.log(`   - ${invoices.length} factures`)

      // Calculer les montants par année
      const yearlyData = new Map<number, { engineered: number; invoiced: number }>()

      // Contrats (engagé)
      for (const contract of contracts) {
        const startYear = new Date(contract.startDate).getFullYear()
        if (!yearlyData.has(startYear)) {
          yearlyData.set(startYear, { engineered: 0, invoiced: 0 })
        }
        yearlyData.get(startYear)!.engineered += contract.amount
      }

      // Factures (facturé)
      for (const invoice of invoices) {
        const invoiceYear = invoice.invoiceYear || new Date(invoice.invoiceDate).getFullYear()
        if (!yearlyData.has(invoiceYear)) {
          yearlyData.set(invoiceYear, { engineered: 0, invoiced: 0 })
        }
        yearlyData.get(invoiceYear)!.invoiced += invoice.amount
      }

      // Mettre à jour ou créer les yearlyBudgets
      const existingYearlyBudgets = await prisma.yearlyBudget.findMany({
        where: { budgetLineId: line.id }
      })

      for (const [year, amounts] of yearlyData.entries()) {
        const existing = existingYearlyBudgets.find(yb => yb.year === year)

        if (existing) {
          await prisma.yearlyBudget.update({
            where: { id: existing.id },
            data: {
              engineered: amounts.engineered,
              invoiced: amounts.invoiced,
            }
          })
          console.log(`   ✅ ${year}: Engagé ${amounts.engineered}€, Facturé ${amounts.invoiced}€`)
        } else {
          await prisma.yearlyBudget.create({
            data: {
              budgetLineId: line.id,
              year,
              budget: 0,
              engineered: amounts.engineered,
              invoiced: amounts.invoiced,
            }
          })
          console.log(`   ✨ ${year}: Créé - Engagé ${amounts.engineered}€, Facturé ${amounts.invoiced}€`)
        }
      }

      // Créer les années 2024 et 2025 si elles n'existent pas
      for (const year of [2024, 2025]) {
        const hasYear = existingYearlyBudgets.some(yb => yb.year === year) || yearlyData.has(year)
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
          console.log(`   ➕ ${year}: Année créée`)
        }
      }
    }

    console.log('\n\n✅ Attribution et recalcul terminés avec succès!')
    console.log('\n💡 Prochaines étapes:')
    console.log('   1. Rafraîchis la page du suivi budgétaire (F5)')
    console.log('   2. Clique sur "Budget Prévu" pour définir le budget de chaque année')
    console.log('   3. Les montants engagés et facturés sont maintenant à jour!')

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

autoAssignBudgets()
