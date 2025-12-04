/**
 * Attend que le serveur Next.js soit prêt puis lance le warmup
 */

async function waitForServer() {
  console.log('\n⏳ Attente du démarrage du serveur Next.js...')

  let attempts = 0
  const maxAttempts = 60 // 60 secondes max

  while (attempts < maxAttempts) {
    try {
      const response = await fetch('http://localhost:3000')
      if (response.ok || response.status === 404) {
        console.log('✅ Serveur prêt!\n')
        // Attendre 2 secondes supplémentaires pour que Next.js soit complètement prêt
        await new Promise(resolve => setTimeout(resolve, 2000))
        return true
      }
    } catch (error) {
      // Serveur pas encore prêt
    }

    attempts++
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (attempts % 10 === 0) {
      console.log(`   ... toujours en attente (${attempts}s)`)
    }
  }

  console.error('❌ Le serveur n\'a pas démarré à temps')
  return false
}

async function warmupRoutes() {
  const routes = [
    '/cockpit',
    '/suivi-budgetaire',
    '/rapports',
    '/contrats',
    '/factures',
    '/structure-budgetaire',
    '/imports',
    '/referentiels',
    '/admin',
  ]

  console.log('🔥 Préchauffage: compilation des pages principales...\n')

  for (const route of routes) {
    try {
      console.log(`📄 ${route}...`)
      const start = Date.now()

      await fetch(`http://localhost:3000${route}`, {
        headers: {
          'User-Agent': 'Warmup-Script',
        },
      })

      const duration = Date.now() - start
      console.log(`   ✓ ${(duration / 1000).toFixed(1)}s\n`)
    } catch (error) {
      console.log(`   ⚠️  ${error.message}\n`)
    }
  }

  console.log('🎉 Préchauffage terminé! Toutes les pages devraient être rapides maintenant.\n')
}

async function main() {
  const serverReady = await waitForServer()
  if (serverReady) {
    await warmupRoutes()
  }
}

main().catch(console.error)
