'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache les données pendant 5 minutes
            staleTime: 1000 * 60 * 5,
            // Garde les données en cache pendant 10 minutes même si pas utilisées
            gcTime: 1000 * 60 * 10,
            // Retry automatique en cas d'erreur
            retry: 1,
            // Refetch en arrière-plan quand la fenêtre reprend le focus
            refetchOnWindowFocus: false,
            // Refetch quand la connexion est rétablie
            refetchOnReconnect: true,
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
