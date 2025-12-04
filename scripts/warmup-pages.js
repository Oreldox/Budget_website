/**
 * Script de pré-compilation (warm-up) des pages principales
 * Lance des requêtes vers toutes les pages pour forcer leur compilation
 */

const http = require('http')

const pages = [
  '/cockpit',
  '/suivi-budgetaire',
  '/contrats',
  '/factures',
  '/api/budget-types',
  '/api/budget-domains',
  '/api/budget-lines?page=1&pageSize=100',
  '/api/auth/session',
]

async function warmupPage(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      console.log(`✓ ${path} - ${res.statusCode}`)
      resolve()
    })

    req.on('error', (err) => {
      console.log(`✗ ${path} - ${err.message}`)
      resolve()
    })

    req.setTimeout(30000, () => {
      req.destroy()
      console.log(`⏱ ${path} - timeout`)
      resolve()
    })
  })
}

async function warmup() {
  console.log('🔥 Pré-compilation des pages principales...\n')

  // Warmer les pages en parallèle
  await Promise.all(pages.map(page => warmupPage(page)))

  console.log('\n✨ Pré-compilation terminée! Le site devrait être plus rapide maintenant.')
}

// Attendre 3 secondes que le serveur démarre
setTimeout(warmup, 3000)
