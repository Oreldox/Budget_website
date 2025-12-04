import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du seeding de la base de données...')

  // Créer une organisation de démonstration
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-dsi' },
    update: {},
    create: {
      name: 'DSI Démo',
      slug: 'demo-dsi',
      settings: '{}',
    },
  })
  console.log('✅ Organisation créée:', demoOrg.name)

  // Créer un super admin (sans organisation)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@budget-dsi.fr' },
    update: {},
    create: {
      email: 'admin@budget-dsi.fr',
      name: 'Super Admin',
      password: await hash('admin123', 12),
      role: 'admin',
      isActive: true,
    },
  })
  console.log('✅ Super Admin créé:', superAdmin.email, '/ mot de passe: admin123')

  // Créer un admin de l'organisation
  const orgAdmin = await prisma.user.upsert({
    where: { email: 'admin@demo-dsi.fr' },
    update: {},
    create: {
      email: 'admin@demo-dsi.fr',
      name: 'Admin DSI',
      password: await hash('admin123', 12),
      role: 'admin',
      isActive: true,
      organizationId: demoOrg.id,
    },
  })
  console.log('✅ Admin organisation créé:', orgAdmin.email, '/ mot de passe: admin123')

  // Créer un utilisateur standard
  const user = await prisma.user.upsert({
    where: { email: 'user@demo-dsi.fr' },
    update: {},
    create: {
      email: 'user@demo-dsi.fr',
      name: 'Utilisateur DSI',
      password: await hash('user123', 12),
      role: 'user',
      isActive: true,
      organizationId: demoOrg.id,
    },
  })
  console.log('✅ Utilisateur créé:', user.email, '/ mot de passe: user123')

  // Créer un lecteur
  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@demo-dsi.fr' },
    update: {},
    create: {
      email: 'viewer@demo-dsi.fr',
      name: 'Lecteur DSI',
      password: await hash('viewer123', 12),
      role: 'viewer',
      isActive: true,
      organizationId: demoOrg.id,
    },
  })
  console.log('✅ Lecteur créé:', viewer.email, '/ mot de passe: viewer123')

  // Créer les types de budget
  const budgetTypes = [
    { name: 'Logiciels', color: '#3b82f6' },
    { name: 'Infrastructure', color: '#10b981' },
    { name: 'Maintenance', color: '#f59e0b' },
    { name: 'Télécom', color: '#8b5cf6' },
    { name: 'Divers', color: '#6b7280' },
  ]

  const createdTypes = []
  for (const type of budgetTypes) {
    const budgetType = await prisma.budgetType.upsert({
      where: {
        organizationId_name: {
          organizationId: demoOrg.id,
          name: type.name,
        },
      },
      update: {},
      create: {
        name: type.name,
        color: type.color,
        organizationId: demoOrg.id,
      },
    })
    createdTypes.push(budgetType)
  }
  console.log('✅ Types de budget créés:', createdTypes.length)

  // Créer les domaines pour chaque type
  const domainNames = ['Opérations', 'Développement', 'Support', 'Innovation']
  const createdDomains = []

  for (const type of createdTypes) {
    for (const domainName of domainNames) {
      const domain = await prisma.budgetStructureDomain.upsert({
        where: {
          organizationId_typeId_name: {
            organizationId: demoOrg.id,
            typeId: type.id,
            name: domainName,
          },
        },
        update: {},
        create: {
          name: domainName,
          typeId: type.id,
          organizationId: demoOrg.id,
        },
      })
      createdDomains.push(domain)
    }
  }
  console.log('✅ Domaines créés:', createdDomains.length)

  // Créer quelques lignes budgétaires de démonstration
  const sampleBudgetLines = [
    {
      label: 'Licences Microsoft 365',
      description: 'Suite bureautique pour tous les employés',
      budget: 150000,
      nature: 'Fonctionnement' as const,
      accountingCode: 'LOG-001',
    },
    {
      label: 'Serveurs Cloud AWS',
      description: 'Infrastructure cloud pour applications métier',
      budget: 250000,
      nature: 'Fonctionnement' as const,
      accountingCode: 'INF-001',
    },
    {
      label: 'Support SAP',
      description: 'Maintenance et support annuel SAP',
      budget: 180000,
      nature: 'Fonctionnement' as const,
      accountingCode: 'MAI-001',
    },
    {
      label: 'Fibres optiques',
      description: 'Liaison réseau inter-sites',
      budget: 120000,
      nature: 'Fonctionnement' as const,
      accountingCode: 'TEL-001',
    },
  ]

  const createdBudgetLines = []
  for (let i = 0; i < sampleBudgetLines.length; i++) {
    const line = sampleBudgetLines[i]
    const domain = createdDomains[i % createdDomains.length]

    const budgetLine = await prisma.budgetLine.create({
      data: {
        ...line,
        typeId: domain.typeId,
        domainId: domain.id,
        organizationId: demoOrg.id,
      },
    })
    createdBudgetLines.push(budgetLine)
  }
  console.log('✅ Lignes budgétaires créées:', createdBudgetLines.length)

  // Créer quelques contrats de démonstration
  const sampleContracts = [
    {
      number: 'CONT-2024-001',
      label: 'Contrat Microsoft Enterprise',
      vendor: 'Microsoft Corporation',
      providerName: 'Microsoft France',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      amount: 150000,
      status: 'Actif' as const,
      description: 'Licences Microsoft 365 pour l\'entreprise',
    },
    {
      number: 'CONT-2024-002',
      label: 'Infrastructure AWS',
      vendor: 'Amazon Web Services',
      providerName: 'AWS France',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-12-31'),
      amount: 500000,
      status: 'Actif' as const,
      description: 'Services cloud AWS',
    },
  ]

  const createdContracts = []
  for (let i = 0; i < sampleContracts.length; i++) {
    const contractData = sampleContracts[i]
    const budgetLine = createdBudgetLines[i]

    const contract = await prisma.contract.create({
      data: {
        ...contractData,
        typeId: budgetLine.typeId,
        domainId: budgetLine.domainId,
        budgetLineId: budgetLine.id,
        organizationId: demoOrg.id,
        yearlyAmounts: {
          create: [
            { year: 2024, amount: contractData.amount },
          ],
        },
      },
    })
    createdContracts.push(contract)

    // Mettre à jour le montant engagé de la ligne budgétaire
    await prisma.budgetLine.update({
      where: { id: budgetLine.id },
      data: { engineered: { increment: contractData.amount } },
    })
  }
  console.log('✅ Contrats créés:', createdContracts.length)

  // Créer quelques factures de démonstration
  const sampleInvoices = [
    {
      number: 'FACT-2024-001',
      description: 'Licence Microsoft 365 - Janvier 2024',
      amount: 12500,
      amountHT: 10416.67,
      invoiceDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-15'),
      paymentDate: new Date('2024-02-10'),
      status: 'Payée' as const,
      nature: 'Fonctionnement' as const,
      pointed: true,
    },
    {
      number: 'FACT-2024-002',
      description: 'AWS Services - Janvier 2024',
      amount: 25000,
      amountHT: 20833.33,
      invoiceDate: new Date('2024-01-20'),
      dueDate: new Date('2024-02-20'),
      status: 'En attente' as const,
      nature: 'Fonctionnement' as const,
      pointed: false,
    },
  ]

  for (let i = 0; i < sampleInvoices.length; i++) {
    const invoiceData = sampleInvoices[i]
    const contract = createdContracts[i]
    const budgetLine = createdBudgetLines[i]

    const invoice = await prisma.invoice.create({
      data: {
        ...invoiceData,
        vendor: contract.vendor,
        contractId: contract.id,
        typeId: contract.typeId,
        domainId: contract.domainId,
        budgetLineId: budgetLine.id,
        organizationId: demoOrg.id,
        invoiceYear: invoiceData.invoiceDate.getFullYear(),
      },
    })

    // Mettre à jour le montant facturé de la ligne budgétaire
    await prisma.budgetLine.update({
      where: { id: budgetLine.id },
      data: { invoiced: { increment: invoiceData.amount } },
    })
  }
  console.log('✅ Factures créées:', sampleInvoices.length)

  console.log('\n🎉 Seeding terminé avec succès!')
  console.log('\n📋 Informations de connexion:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Super Admin  : admin@budget-dsi.fr / admin123')
  console.log('Admin Org    : admin@demo-dsi.fr / admin123')
  console.log('Utilisateur  : user@demo-dsi.fr / user123')
  console.log('Lecteur      : viewer@demo-dsi.fr / viewer123')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n📝 Code d\'invitation organisation:', demoOrg.inviteCode)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Erreur lors du seeding:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
