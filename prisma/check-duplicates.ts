import { prisma } from '../lib/prisma'

async function checkDuplicates() {
  try {
    // Check domains
    const domains = await prisma.budgetStructureDomain.findMany({
      orderBy: { name: 'asc' }
    })

    console.log('\n=== DOMAINS ===')
    console.log('Total domains:', domains.length)

    const domainsByOrg = new Map<string, typeof domains>()
    domains.forEach(d => {
      const key = `${d.organizationId}-${d.name}`
      if (!domainsByOrg.has(key)) {
        domainsByOrg.set(key, [])
      }
      domainsByOrg.get(key)!.push(d)
    })

    domainsByOrg.forEach((doms, key) => {
      if (doms.length > 1) {
        console.log(`\nDUPLICATE: ${key}`)
        doms.forEach(d => console.log(`  - ID: ${d.id}, Name: ${d.name}`))
      }
    })

    // List all domains
    console.log('\n=== ALL DOMAINS ===')
    domains.forEach(d => {
      console.log(`ID: ${d.id} | Name: ${d.name} | Org: ${d.organizationId}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDuplicates()
