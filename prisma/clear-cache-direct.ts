import { clearAllCache } from '../lib/cache-utils'

async function clearCacheDirect() {
  try {
    console.log('🗑️  Vidage du cache en mémoire...\n')

    clearAllCache()

    console.log('✅ Cache vidé avec succès!')
    console.log('\n💡 Prochaines étapes:')
    console.log('   1. Lance le serveur: npm run dev')
    console.log('   2. Va sur la page Suivi budgétaire')
    console.log('   3. Sélectionne l\'année 2025')
    console.log('   4. Tu devrais voir: Budget 1,200,000€, Facturé 87,000€')

  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

clearCacheDirect()
