'use client'

import { useState, useEffect, memo, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  BarChart3,
  FileText,
  DollarSign,
  Database,
  Upload,
  LayoutDashboard,
  Settings,
  Table,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: any
  badge?: number
}

interface NavGroup {
  label: string
  items: NavItem[]
  defaultOpen?: boolean
  adminOnly?: boolean
}

const navGroups: NavGroup[] = [
  {
    label: 'Tableau de bord',
    defaultOpen: true,
    items: [
      { href: '/cockpit', label: 'Cockpit', icon: BarChart3 },
      { href: '/rapports', label: 'Rapports', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Gestion',
    defaultOpen: true,
    items: [
      { href: '/contrats', label: 'Contrats', icon: FileText },
      { href: '/factures', label: 'Factures', icon: DollarSign },
      { href: '/bons-commande', label: 'Bons de Commande', icon: Package },
      { href: '/lignes-budgetaires', label: 'Lignes Budgétaires', icon: Table },
      { href: '/structure-budgetaire', label: 'Budget Prévisionnel', icon: Database },
      { href: '/suivi-budgetaire', label: 'Budget Réel', icon: DollarSign },
    ]
  },
  {
    label: 'Configuration',
    defaultOpen: false,
    items: [
      { href: '/services', label: 'Services & Pôles', icon: Building2 },
      { href: '/imports', label: 'Imports', icon: Upload },
      { href: '/referentiels', label: 'Référentiels', icon: Database },
    ]
  },
  {
    label: 'Administration',
    defaultOpen: false,
    adminOnly: true,
    items: [
      { href: '/admin', label: 'Utilisateurs', icon: Users },
      { href: '/admin/organizations', label: 'Organisations', icon: Building2 },
      { href: '/admin/settings', label: 'Paramètres', icon: Settings },
    ]
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>(['Tableau de bord', 'Gestion', 'Configuration', 'Administration'])

  // Prefetch toutes les routes principales au montage
  useEffect(() => {
    const routes = ['/cockpit', '/rapports', '/contrats', '/factures', '/bons-commande', '/lignes-budgetaires', '/structure-budgetaire', '/suivi-budgetaire', '/services', '/imports', '/referentiels']
    routes.forEach(route => {
      router.prefetch(route)
    })
  }, [router])

  // Charger l'état collapsed depuis localStorage au montage initial uniquement
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved) setCollapsed(JSON.parse(saved))
  }, [])

  // Ouvrir automatiquement le groupe qui contient l'élément actif
  useEffect(() => {
    const activeGroup = navGroups.find(group =>
      group.items.some(item => pathname === item.href)
    )
    if (activeGroup) {
      // Garder uniquement les groupes qui sont dans openGroups ET ne pas fermer ceux ouverts manuellement
      // Mais s'assurer que le groupe actif est ouvert
      setOpenGroups(prev => {
        if (prev.includes(activeGroup.label)) {
          return prev // Déjà ouvert, ne rien faire
        }
        return [...prev, activeGroup.label] // Ajouter le groupe actif
      })
    }
  }, [pathname])

  // Sauvegarder l'état collapsed uniquement
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed))
  }, [collapsed])

  const toggleGroup = (label: string) => {
    setOpenGroups(prev =>
      prev.includes(label)
        ? prev.filter(g => g !== label)
        : [...prev, label]
    )
  }

  const isAdmin = session?.user?.role === 'admin'

  return (
    <aside
      className={cn(
        "bg-slate-900 border-r border-slate-800 h-screen fixed left-0 top-0 pt-16 transition-all duration-300 ease-in-out z-40 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-slate-800 border border-slate-700 rounded-full p-1.5 hover:bg-slate-700 transition-colors z-50"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3 text-slate-400" />
        ) : (
          <ChevronLeft className="h-3 w-3 text-slate-400" />
        )}
      </button>

      <nav className={cn("p-3 space-y-1 flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']", collapsed && "px-2")}>
        {navGroups.map((group) => {
          // Masquer les groupes admin pour les non-admins
          if (group.adminOnly && !isAdmin) return null

          const isGroupOpen = openGroups.includes(group.label)
          const hasActiveItem = group.items.some(item => pathname === item.href)

          return (
            <div key={group.label} className="mb-2">
              {/* Group Header */}
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors",
                    hasActiveItem ? "text-cyan-400" : "text-slate-500 hover:text-slate-400"
                  )}
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      isGroupOpen ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
              )}

              {/* Group Items */}
              <div className={cn(
                "space-y-1 overflow-hidden transition-all duration-200",
                !collapsed && !isGroupOpen && "h-0",
                collapsed && "mt-2"
              )}>
                {group.items.map((item) => {
                  const Icon = item.icon
                  // Correspondance exacte uniquement pour éviter les conflits
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg transition-all duration-200 group relative",
                        collapsed ? "px-3 py-3 justify-center" : "px-3 py-2.5",
                        isActive
                          ? "bg-cyan-500/10 text-cyan-400 shadow-sm"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      )}
                    >
                      {/* Active Indicator */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r-full" />
                      )}

                      <Icon className={cn(
                        "flex-shrink-0 transition-transform duration-200",
                        collapsed ? "h-5 w-5" : "h-4 w-4",
                        !isActive && "group-hover:scale-110"
                      )} />

                      {!collapsed && (
                        <span className="font-medium text-sm truncate">{item.label}</span>
                      )}

                      {/* Badge */}
                      {item.badge && item.badge > 0 && (
                        <span className={cn(
                          "bg-red-500 text-white text-xs font-bold rounded-full",
                          collapsed ? "absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-[10px]" : "ml-auto px-1.5 py-0.5"
                        )}>
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}

                      {/* Tooltip for collapsed state */}
                      {collapsed && (
                        <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-slate-200 text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="flex-shrink-0 p-4">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-xs font-semibold text-slate-400">ICL BUDGET</p>
            <p className="text-[10px] text-slate-600">v1.0.0</p>
          </div>
        </div>
      )}
    </aside>
  )
}
