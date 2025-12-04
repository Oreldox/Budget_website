import { prisma } from '../lib/prisma'

async function checkTypes() {
  try {
    const types = await prisma.budgetType.findMany({
      orderBy: { name: 'asc' }
    })

    console.log('\n=== BUDGET TYPES ===')
    console.log('Total types:', types.length)

    const typesByOrg = new Map<string, typeof types>()
    types.forEach(t => {
      const key = `${t.organizationId}-${t.name}`
      if (!typesByOrg.has(key)) {
        typesByOrg.set(key, [])
      }
      typesByOrg.get(key)!.push(t)
    })

    typesByOrg.forEach((typs, key) => {
      if (typs.length > 1) {
        console.log(`\nDUPLICATE: ${key}`)
        typs.forEach(t => console.log(`  - ID: ${t.id}, Name: ${t.name}`))
      }
    })

    // List all types
    console.log('\n=== ALL TYPES ===')
    types.forEach(t => {
      console.log(`ID: ${t.id} | Name: ${t.name} | Org: ${t.organizationId}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTypes()
