async function clearCache() {
  try {
    console.log('🗑️  Vidage du cache...\n')

    const response = await fetch('http://localhost:3000/api/cache/clear', {
      method: 'POST',
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅', data.message)
      console.log('\n💡 Le cache a été vidé. Rafraîchis maintenant la page du suivi budgétaire!')
    } else {
      console.error('❌ Erreur:', response.statusText)
    }
  } catch (error) {
    console.error('❌ Erreur de connexion:', error)
    console.log('\n⚠️  Assure-toi que le serveur Next.js tourne sur http://localhost:3000')
  }
}

clearCache()
