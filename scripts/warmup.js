/**
 * Script de préchauffage pour Next.js en développement
 * Visite toutes les pages principales pour forcer la compilation
 */

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

async function warmup() {
  console.log('\n🔥 Préchauffage du serveur Next.js...\n')

  // Attendre que le serveur soit prêt
  let serverReady = false
  let attempts = 0
  const maxAttempts = 30

  while (!serverReady && attempts < maxAttempts) {
    try {
      const response = await fetch('http://localhost:3000')
      if (response.ok || response.status === 404) {
        serverReady = true
      }
    } catch (error) {
      attempts++
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  if (!serverReady) {
    console.error('❌ Le serveur n\'a pas démarré à temps')
    process.exit(1)
  }

  console.log('✅ Serveur prêt, début de la compilation des pages...\n')

  // Visiter chaque route pour forcer la compilation
  for (const route of routes) {
    try {
      console.log(`📄 Compilation de ${route}...`)
      const start = Date.now()

      const response = await fetch(`http://localhost:3000${route}`, {
        headers: {
          'Cookie': 'next-auth.session-token=warmup-token',
        },
      })

      const duration = Date.now() - start
      console.log(`   ✓ Compilé en ${(duration / 1000).toFixed(1)}s\n`)
    } catch (error) {
      console.log(`   ⚠️  Erreur (probablement auth): ${error.message}\n`)
    }
  }

  console.log('🎉 Préchauffage terminé! Le site devrait être rapide maintenant.\n')
}

warmup().catch(console.error)
