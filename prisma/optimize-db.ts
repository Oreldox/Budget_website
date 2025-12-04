import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function optimizeDatabase() {
  try {
    console.log('🔧 Optimisation de la base de données SQLite...\n')

    // 1. VACUUM - Compresse et défragmente la base
    console.log('1️⃣ VACUUM - Compression de la base...')
    await prisma.$executeRawUnsafe('VACUUM;')
    console.log('   ✅ Base compressée\n')

    // 2. ANALYZE - Met à jour les statistiques pour l'optimiseur de requêtes
    console.log('2️⃣ ANALYZE - Mise à jour des statistiques...')
    await prisma.$executeRawUnsafe('ANALYZE;')
    console.log('   ✅ Statistiques mises à jour\n')

    // 3. Activer WAL mode pour de meilleures performances
    console.log('3️⃣ Configuration du mode WAL...')
    const walMode: any = await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
    console.log(`   ✅ Mode WAL activé: ${walMode[0]?.journal_mode || 'OK'}\n`)

    // 4. Optimiser la taille du cache
    console.log('4️⃣ Configuration du cache...')
    await prisma.$queryRawUnsafe('PRAGMA cache_size = 10000;') // 10000 pages = ~40MB
    console.log('   ✅ Cache optimisé (40MB)\n')

    // 5. Configurer temp_store en mémoire pour les tables temporaires
    console.log('5️⃣ Configuration temp_store...')
    await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;')
    console.log('   ✅ Temp_store en mémoire\n')

    // 6. Vérifier les index existants
    console.log('6️⃣ Vérification des index...')
    const indexes: any = await prisma.$queryRawUnsafe(`
      SELECT name, tbl_name FROM sqlite_master
      WHERE type = 'index' AND sql IS NOT NULL
      ORDER BY tbl_name, name;
    `)

    const tableIndexes = new Map<string, string[]>()
    for (const idx of indexes) {
      if (!tableIndexes.has(idx.tbl_name)) {
        tableIndexes.set(idx.tbl_name, [])
      }
      tableIndexes.get(idx.tbl_name)!.push(idx.name)
    }

    console.log(`   ℹ️ Tables avec index:`)
    for (const [table, idxList] of tableIndexes) {
      console.log(`      ${table}: ${idxList.length} index`)
    }
    console.log()

    // 7. Statistiques de la base
    console.log('7️⃣ Statistiques de la base...')
    const stats: any = await prisma.$queryRawUnsafe(`
      SELECT
        (SELECT COUNT(*) FROM BudgetLine) as budgetLines,
        (SELECT COUNT(*) FROM Invoice) as invoices,
        (SELECT COUNT(*) FROM Contract) as contracts,
        (SELECT COUNT(*) FROM YearlyBudget) as yearlyBudgets;
    `)

    console.log(`   📊 Lignes budgétaires: ${stats[0].budgetLines}`)
    console.log(`   📄 Factures: ${stats[0].invoices}`)
    console.log(`   📝 Contrats: ${stats[0].contracts}`)
    console.log(`   📈 Budgets annuels: ${stats[0].yearlyBudgets}`)
    console.log()

    console.log('✅ Optimisation terminée!\n')
    console.log('💡 Recommandations:')
    console.log('   - Relance le serveur Next.js pour appliquer les changements')
    console.log('   - La base est maintenant en mode WAL pour de meilleures perfs')
    console.log('   - Le cache est optimisé à 40MB')

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

optimizeDatabase()
