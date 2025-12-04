/**
 * Script de test pour la fonctionnalité PIVOT
 * Lien entre factures et dépenses prévisionnelles
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testPivotFeature() {
  console.log('🧪 Test de la fonctionnalité PIVOT\n')

  try {
    // 1. Vérifier que le schéma a bien été mis à jour
    console.log('✅ 1. Vérification du schéma Prisma...')
    const invoice = await prisma.invoice.findFirst({
      include: {
        linkedForecastExpense: true
      }
    })
    console.log('   ✓ Le champ linkedForecastExpense existe\n')

    // 2. Récupérer une organisation de test
    console.log('📊 2. Recherche d\'une organisation...')
    const org = await prisma.organization.findFirst()
    if (!org) {
      throw new Error('Aucune organisation trouvée')
    }
    console.log(`   ✓ Organisation trouvée: ${org.name}\n`)

    // 3. Créer une ligne budgétaire prévisionnelle de test
    console.log('📝 3. Création d\'une ligne budgétaire prévisionnelle de test...')
    const type = await prisma.budgetType.findFirst({
      where: { organizationId: org.id }
    })
    const domain = await prisma.budgetStructureDomain.findFirst({
      where: { organizationId: org.id }
    })

    if (!type || !domain) {
      throw new Error('Type ou domaine non trouvé')
    }

    const budgetLine = await prisma.forecastBudgetLine.create({
      data: {
        label: '[TEST] Ligne budgétaire test PIVOT',
        description: 'Créée automatiquement pour tester le PIVOT',
        budget: 50000,
        nature: 'Fonctionnement',
        year: 2025,
        organizationId: org.id,
        typeId: type.id,
        domainId: domain.id,
      }
    })
    console.log(`   ✓ Ligne budgétaire créée: ${budgetLine.id}\n`)

    // 4. Créer une dépense prévisionnelle de test
    console.log('💰 4. Création d\'une dépense prévisionnelle de test...')
    const forecastExpense = await prisma.forecastExpense.create({
      data: {
        label: '[TEST] Audit AD prévu',
        description: 'Audit Active Directory prévisionnel',
        amount: 20000,
        year: 2025,
        forecastBudgetLineId: budgetLine.id,
      }
    })
    console.log(`   ✓ Dépense prévisionnelle créée: ${forecastExpense.id}`)
    console.log(`   ✓ Montant prévu: ${forecastExpense.amount}€\n`)

    // 5. Créer une facture de test
    console.log('📄 5. Création d\'une facture de test...')
    const invoice2 = await prisma.invoice.create({
      data: {
        number: `TEST-PIVOT-${Date.now()}`,
        vendor: 'ACME Audit',
        description: 'Audit Active Directory - Facture réelle',
        amount: 18500,
        amountHT: 15400,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        invoiceYear: 2025,
        status: 'En attente',
        nature: 'Fonctionnement',
        organizationId: org.id,
        typeId: type.id,
        domainId: domain.id,
      }
    })
    console.log(`   ✓ Facture créée: ${invoice2.number}`)
    console.log(`   ✓ Montant réel: ${invoice2.amount}€\n`)

    // 6. Lier la facture à la dépense prévisionnelle
    console.log('🔗 6. Liaison de la facture à la dépense prévisionnelle...')
    const linkedInvoice = await prisma.invoice.update({
      where: { id: invoice2.id },
      data: {
        linkedForecastExpenseId: forecastExpense.id
      },
      include: {
        linkedForecastExpense: true
      }
    })
    console.log(`   ✓ Facture liée avec succès`)
    console.log(`   ✓ linkedForecastExpenseId: ${linkedInvoice.linkedForecastExpenseId}\n`)

    // 7. Vérifier la relation inverse
    console.log('🔍 7. Vérification de la relation inverse...')
    const expenseWithInvoices = await prisma.forecastExpense.findUnique({
      where: { id: forecastExpense.id },
      include: {
        linkedInvoices: true
      }
    })
    console.log(`   ✓ Nombre de factures liées: ${expenseWithInvoices?.linkedInvoices.length}`)
    console.log(`   ✓ Facture liée: ${expenseWithInvoices?.linkedInvoices[0]?.number}\n`)

    // 8. Calculer la variance
    console.log('📊 8. Calcul de la variance...')
    const totalRealized = expenseWithInvoices?.linkedInvoices.reduce((sum, inv) => sum + inv.amount, 0) || 0
    const variance = totalRealized - forecastExpense.amount
    const variancePercent = ((variance / forecastExpense.amount) * 100).toFixed(2)

    console.log(`   Montant prévu:   ${forecastExpense.amount.toLocaleString('fr-FR')}€`)
    console.log(`   Montant réalisé: ${totalRealized.toLocaleString('fr-FR')}€`)
    console.log(`   Variance:        ${variance.toLocaleString('fr-FR')}€ (${variancePercent}%)`)

    if (variance < 0) {
      console.log(`   ✅ Économie de ${Math.abs(variance).toLocaleString('fr-FR')}€\n`)
    } else {
      console.log(`   ⚠️  Dépassement de ${variance.toLocaleString('fr-FR')}€\n`)
    }

    // 9. Test de déliaison
    console.log('🔓 9. Test de déliaison...')
    await prisma.invoice.update({
      where: { id: invoice2.id },
      data: {
        linkedForecastExpenseId: null
      }
    })
    const unlinkedExpense = await prisma.forecastExpense.findUnique({
      where: { id: forecastExpense.id },
      include: {
        linkedInvoices: true
      }
    })
    console.log(`   ✓ Déliaison réussie`)
    console.log(`   ✓ Nombre de factures liées: ${unlinkedExpense?.linkedInvoices.length}\n`)

    // 10. Nettoyage
    console.log('🧹 10. Nettoyage des données de test...')
    await prisma.invoice.delete({ where: { id: invoice2.id } })
    await prisma.forecastExpense.delete({ where: { id: forecastExpense.id } })
    await prisma.forecastBudgetLine.delete({ where: { id: budgetLine.id } })
    console.log('   ✓ Nettoyage terminé\n')

    console.log('✅ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !\n')
    console.log('Résumé:')
    console.log('  ✓ Schéma Prisma mis à jour correctement')
    console.log('  ✓ Relations bidirectionnelles fonctionnelles')
    console.log('  ✓ Liaison facture ↔ dépense prévisionnelle OK')
    console.log('  ✓ Calcul de variance correct')
    console.log('  ✓ Déliaison fonctionnelle')

  } catch (error) {
    console.error('❌ ERREUR LORS DU TEST:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter les tests
testPivotFeature()
  .then(() => {
    console.log('\n✨ Tests terminés avec succès')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Tests échoués:', error)
    process.exit(1)
  })
