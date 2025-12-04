// Utilitaire pour gérer le cache partagé entre les APIs

export const budgetLinesCache = new Map<string, { data: any; timestamp: number }>()

export function clearBudgetLinesCache(organizationId: string) {
  for (const key of budgetLinesCache.keys()) {
    if (key.startsWith(organizationId + ':')) {
      budgetLinesCache.delete(key)
    }
  }
}

export function clearAllCache() {
  budgetLinesCache.clear()
}
