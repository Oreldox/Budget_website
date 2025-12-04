'use client'

import { ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'
import { DataProvider } from '@/lib/data-context'
import { ToastProvider } from '@/components/ui/toast'
import { QueryProvider } from '@/lib/query-provider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SessionProvider>
        <DataProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </DataProvider>
      </SessionProvider>
    </QueryProvider>
  )
}
