import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

// Optimisations SQLite au démarrage
if (!globalForPrisma.prisma) {
  // Utiliser $queryRawUnsafe car PRAGMA retourne des résultats
  prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;').catch(() => {})
  prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;').catch(() => {})
  prisma.$queryRawUnsafe('PRAGMA cache_size = 10000;').catch(() => {})
  prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;').catch(() => {})
  prisma.$queryRawUnsafe('PRAGMA mmap_size = 30000000000;').catch(() => {})
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
