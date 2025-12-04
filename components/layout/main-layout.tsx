'use client'

import { useState, useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { cn } from '@/lib/utils'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Sync with sidebar state - OPTIMIZED
  useEffect(() => {
    const checkSidebarState = () => {
      const saved = localStorage.getItem('sidebar-collapsed')
      if (saved) setSidebarCollapsed(JSON.parse(saved))
    }

    checkSidebarState()

    // Custom event for same-tab updates (pas de polling!)
    const handleSidebarChange = () => checkSidebarState()
    window.addEventListener('sidebar-change', handleSidebarChange)

    return () => {
      window.removeEventListener('sidebar-change', handleSidebarChange)
    }
  }, [])

  return (
    <SessionProvider>
      <div className="min-h-screen bg-slate-950">
        <Header />
        <Sidebar />
        <main className={cn(
          "mt-16 p-6 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SessionProvider>
  )
}
