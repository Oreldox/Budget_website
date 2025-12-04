'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import {
  Search,
  FileText,
  FileStack,
  BookOpen,
  User,
  LogOut,
  Settings,
  Bell,
  Command,
  Building2,
  ChevronDown
} from 'lucide-react'
import { LaristoLogo } from '@/components/logo'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SearchResultsDrawer } from '@/components/drawers/search-results'
import { useGlobalSearch } from '@/lib/hooks'
import { cn } from '@/lib/utils'

export function Header() {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const { searchAll, results } = useGlobalSearch()

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  // Fetch alert count - DISABLED FOR PERFORMANCE
  // useEffect(() => {
  //   const fetchAlerts = async () => {
  //     try {
  //       const res = await fetch('/api/alerts')
  //       if (res.ok) {
  //         const data = await res.json()
  //         setAlertCount(data.filter((a: any) => a.type === 'danger' || a.type === 'warning').length)
  //       }
  //     } catch (error) {
  //       console.error('Error fetching alerts:', error)
  //     }
  //   }
  //   fetchAlerts()
  //   const interval = setInterval(fetchAlerts, 60000) // Refresh every minute
  //   return () => clearInterval(interval)
  // }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      searchAll(searchQuery)
    }
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('global-search')?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (value.trim()) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 flex items-center px-4 z-50">
        <div className="w-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/cockpit" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <LaristoLogo className="w-9 h-9" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-50 tracking-tight">ICL</h1>
              <p className="text-xs text-cyan-400 font-medium tracking-wide -mt-1">BUDGET</p>
            </div>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-lg mx-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={16} />
              <Input
                id="global-search"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery && setIsOpen(true)}
                className="pl-9 pr-20 h-9 bg-slate-800/50 border-slate-700 text-slate-50 placeholder-slate-500 focus:bg-slate-800 focus:border-cyan-500/50 transition-all text-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-slate-500">
                <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-700 rounded border border-slate-600">
                  <Command className="h-2.5 w-2.5 inline" />
                </kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-700 rounded border border-slate-600">K</kbd>
              </div>

              {/* Search Results Dropdown */}
              {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-80 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {results.slice(0, 6).map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => setIsOpen(false)}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-700/50 border-b border-slate-700/50 last:border-b-0 flex items-center gap-3 transition-colors"
                    >
                      <div className={cn(
                        "p-1.5 rounded-md",
                        result.type === 'invoice' ? "bg-blue-500/10" :
                        result.type === 'contract' ? "bg-cyan-500/10" : "bg-green-500/10"
                      )}>
                        {result.type === 'invoice' ? (
                          <FileText className="h-3.5 w-3.5 text-blue-400" />
                        ) : result.type === 'contract' ? (
                          <FileStack className="h-3.5 w-3.5 text-cyan-400" />
                        ) : (
                          <BookOpen className="h-3.5 w-3.5 text-green-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-200 truncate">{result.title}</p>
                        <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                      </div>
                    </button>
                  ))}
                  {results.length > 6 && (
                    <div className="px-3 py-2 text-xs text-slate-500 bg-slate-800/50 border-t border-slate-700">
                      Appuyez sur Entrée pour voir {results.length - 6} autres résultats
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Link
              href="/cockpit"
              className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors"
              title="Alertes"
            >
              <Bell className="h-5 w-5 text-slate-400" />
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {session?.user && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-slate-800 rounded-lg px-2 py-1.5 outline-none transition-colors">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <span className="text-white font-semibold text-xs">
                      {session.user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-slate-200 leading-tight">{session.user.name || 'Utilisateur'}</p>
                    <p className="text-[10px] text-slate-500">{session.user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</p>
                  </div>
                  <ChevronDown className="h-3 w-3 text-slate-500 hidden md:block" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-56 bg-slate-800 border-slate-700">
                  <DropdownMenuLabel className="text-slate-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {session.user.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">{session.user.name}</p>
                        <p className="text-xs text-slate-500">{session.user.email}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700" />

                  {session.user.role === 'admin' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center cursor-pointer text-slate-300 hover:bg-slate-700 hover:text-slate-200">
                          <User className="mr-2 h-4 w-4" />
                          <span>Utilisateurs</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/organizations" className="flex items-center cursor-pointer text-slate-300 hover:bg-slate-700 hover:text-slate-200">
                          <Building2 className="mr-2 h-4 w-4" />
                          <span>Organisations</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-700" />
                    </>
                  )}

                  <DropdownMenuItem
                    onSelect={handleSignOut}
                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Se déconnecter</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <SearchResultsDrawer query={searchQuery} results={results} open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
