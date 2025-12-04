import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Ajout de factures supplémentaires...')

  // Récupérer l'organisation de démo
  const org = await prisma.organization.findUnique({
    where: { slug: 'demo-dsi' },
  })

  if (!org) {
    console.error('Organisation demo-dsi non trouvée')
    return
  }

  // Récupérer les types et domaines
  const types = await prisma.budgetType.findMany({
    where: { organizationId: org.id },
  })

  const domains = await prisma.budgetStructureDomain.findMany({
    where: { organizationId: org.id },
  })

  const budgetLines = await prisma.budgetLine.findMany({
    where: { organizationId: org.id },
  })

  const vendors = [
    'Microsoft Corporation',
    'Amazon Web Services',
    'Google Cloud',
    'Oracle Corporation',
    'IBM France',
    'SAP France',
    'Salesforce',
    'Adobe Systems',
    'VMware',
    'Red Hat',
    'Cisco Systems',
    'Dell Technologies',
    'HP Enterprise',
    'Lenovo France',
    'OVH Cloud',
  ]

  const descriptions = [
    'Licences logicielles mensuelles',
    'Services cloud infrastructure',
    'Support technique annuel',
    'Maintenance préventive',
    'Consultation et formation',
    'Hébergement serveurs',
    'Stockage cloud backup',
    'Sécurité et antivirus',
    'Monitoring et supervision',
    'Services réseau',
  ]

  const statuses = ['Payée', 'En attente', 'Retard']
  const natures = ['Investissement', 'Fonctionnement']

  const invoices = []
  const startDate = new Date('2024-01-01')

  for (let i = 3; i <= 42; i++) {
    const vendor = vendors[Math.floor(Math.random() * vendors.length)]
    const description = descriptions[Math.floor(Math.random() * descriptions.length)]
    const type = types[Math.floor(Math.random() * types.length)]
    const domain = domains.filter(d => d.typeId === type.id)[0] || domains[0]
    const budgetLine = budgetLines[Math.floor(Math.random() * budgetLines.length)]
    const nature = natures[Math.floor(Math.random() * natures.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]

    const amount = Math.floor(Math.random() * 50000) + 1000
    const amountHT = amount / 1.2

    const invoiceDate = new Date(startDate)
    invoiceDate.setDate(startDate.getDate() + (i * 7))

    const dueDate = new Date(invoiceDate)
    dueDate.setDate(invoiceDate.getDate() + 30)

    let paymentDate = null
    if (status === 'Payée') {
      paymentDate = new Date(invoiceDate)
      paymentDate.setDate(invoiceDate.getDate() + Math.floor(Math.random() * 25))
    }

    const invoice = await prisma.invoice.create({
      data: {
        number: `FACT-2024-${String(i).padStart(3, '0')}`,
        vendor,
        description: `${description} - ${vendor}`,
        amount,
        amountHT,
        invoiceDate,
        dueDate,
        paymentDate,
        status,
        nature,
        invoiceYear: invoiceDate.getFullYear(),
        typeId: type.id,
        domainId: domain.id,
        budgetLineId: budgetLine.id,
        organizationId: org.id,
        pointed: status === 'Payée',
      },
    })

    // Mettre à jour le montant facturé de la ligne budgétaire
    if (budgetLine) {
      await prisma.budgetLine.update({
        where: { id: budgetLine.id },
        data: {
          invoiced: {
            increment: amount,
          },
        },
      })
    }

    invoices.push(invoice)
  }

  console.log(`✅ ${invoices.length} factures ajoutées avec succès!`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Erreur:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
