import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addIndexes() {
  console.log('🔍 Ajout des indices pour optimiser les performances...')

  try {
    // Index pour les requêtes fréquentes sur BudgetLine
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_budget_line_org_created
      ON BudgetLine(organizationId, createdAt DESC)
    `
    console.log('✅ Index créé: BudgetLine(organizationId, createdAt)')

    // Index pour les requêtes par domaine
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_budget_line_domain
      ON BudgetLine(domainId, organizationId)
    `
    console.log('✅ Index créé: BudgetLine(domainId, organizationId)')

    // Index pour les requêtes par type
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_budget_line_type
      ON BudgetLine(typeId, organizationId)
    `
    console.log('✅ Index créé: BudgetLine(typeId, organizationId)')

    // Index pour les yearlyBudgets
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_yearly_budget_line_year
      ON YearlyBudget(budgetLineId, year)
    `
    console.log('✅ Index créé: YearlyBudget(budgetLineId, year)')

    // Index pour les factures par date
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_invoice_date
      ON Invoice(invoiceDate)
    `
    console.log('✅ Index créé: Invoice(invoiceDate)')

    // Index pour les factures par ligne budgétaire
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_invoice_budget_line
      ON Invoice(budgetLineId, invoiceDate DESC)
    `
    console.log('✅ Index créé: Invoice(budgetLineId, invoiceDate)')

    // Index pour les contrats par ligne budgétaire
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_contract_budget_line
      ON Contract(budgetLineId, startDate DESC)
    `
    console.log('✅ Index créé: Contract(budgetLineId, startDate)')

    console.log('\n✨ Tous les indices ont été ajoutés avec succès!')
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des indices:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addIndexes()
