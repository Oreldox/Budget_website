import { prisma } from '../lib/prisma'

async function removeDuplicates() {
  try {
    // Get all domains
    const domains = await prisma.budgetStructureDomain.findMany({
      orderBy: [{ organizationId: 'asc' }, { name: 'asc' }, { id: 'asc' }]
    })

    console.log('Total domains before cleanup:', domains.length)

    const seen = new Set<string>()
    const toDelete: string[] = []

    domains.forEach(d => {
      const key = `${d.organizationId}-${d.name}`
      if (seen.has(key)) {
        // This is a duplicate, mark for deletion
        toDelete.push(d.id)
        console.log(`Marking for deletion: ${d.id} (${d.name})`)
      } else {
        // First occurrence, keep it
        seen.add(key)
        console.log(`Keeping: ${d.id} (${d.name})`)
      }
    })

    console.log(`\nDomains to delete: ${toDelete.length}`)

    if (toDelete.length > 0) {
      // First, update any budget lines that reference these domains to use the kept ones
      const keptDomains = domains.filter(d => !toDelete.includes(d.id))

      for (const deleteId of toDelete) {
        const duplicateDomain = domains.find(d => d.id === deleteId)!
        const keptDomain = keptDomains.find(d =>
          d.organizationId === duplicateDomain.organizationId &&
          d.name === duplicateDomain.name
        )!

        console.log(`Updating budget lines from ${deleteId} to ${keptDomain.id}`)

        await prisma.budgetLine.updateMany({
          where: { domainId: deleteId },
          data: { domainId: keptDomain.id }
        })
      }

      // Now delete the duplicates
      const deleteResult = await prisma.budgetStructureDomain.deleteMany({
        where: {
          id: { in: toDelete }
        }
      })

      console.log(`\nDeleted ${deleteResult.count} duplicate domains`)
    }

    // Verify
    const remainingDomains = await prisma.budgetStructureDomain.findMany()
    console.log(`\nTotal domains after cleanup: ${remainingDomains.length}`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

removeDuplicates()
