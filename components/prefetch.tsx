'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ROUTES_TO_PREFETCH = [
  '/cockpit',
  '/contrats',
  '/factures',
  '/lignes-budgetaires',
  '/structure-budgetaire',
  '/referentiels',
  '/imports',
  '/rapports',
  '/parametres',
]

export function Prefetch() {
  const router = useRouter()

  useEffect(() => {
    // Prefetch toutes les routes après un court délai
    const timer = setTimeout(() => {
      ROUTES_TO_PREFETCH.forEach((route) => {
        router.prefetch(route)
      })
      console.log('✅ Pages préchargées:', ROUTES_TO_PREFETCH.length)
    }, 100)

    return () => clearTimeout(timer)
  }, [router])

  return null
}
