'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, AlertCircle, Info, X, Bell, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Alert {
  type: 'warning' | 'danger' | 'info'
  title: string
  message: string
  link?: string
}

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<number[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data)
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const dismissAlert = (index: number) => {
    setDismissed([...dismissed, index])
  }

  const visibleAlerts = alerts.filter((_, index) => !dismissed.includes(index))
  const dangerAlerts = visibleAlerts.filter(a => a.type === 'danger')
  const warningAlerts = visibleAlerts.filter(a => a.type === 'warning')
  const infoAlerts = visibleAlerts.filter(a => a.type === 'info')

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Bell className="h-4 w-4" />
          <span>Chargement des alertes...</span>
        </div>
      </div>
    )
  }

  if (visibleAlerts.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Bell className="h-4 w-4" />
          <span>Aucune alerte</span>
        </div>
      </div>
    )
  }

  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'danger':
        return <AlertCircle className="h-4 w-4 text-red-400" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />
      case 'info':
        return <Info className="h-4 w-4 text-cyan-400" />
    }
  }

  const displayedAlerts = expanded ? visibleAlerts : visibleAlerts.slice(0, 3)

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <Bell className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Alertes</span>
          <div className="flex items-center gap-1.5">
            {dangerAlerts.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400 rounded">
                {dangerAlerts.length}
              </span>
            )}
            {warningAlerts.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-400 rounded">
                {warningAlerts.length}
              </span>
            )}
            {infoAlerts.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-cyan-500/20 text-cyan-400 rounded">
                {infoAlerts.length}
              </span>
            )}
          </div>
        </div>
        {dismissed.length > 0 && (
          <button
            onClick={() => setDismissed([])}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Tout afficher
          </button>
        )}
      </div>

      {/* Alerts List */}
      <div className="divide-y divide-slate-800/50">
        {displayedAlerts.map((alert, index) => {
          const originalIndex = alerts.indexOf(alert)
          return (
            <div
              key={originalIndex}
              className={cn(
                "px-4 py-3 flex items-start gap-3 group hover:bg-slate-800/30 transition-colors",
                alert.type === 'danger' && "bg-red-500/5",
                alert.type === 'warning' && "bg-amber-500/5"
              )}
            >
              <div className="mt-0.5">{getIcon(alert.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">{alert.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{alert.message}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {alert.link && (
                  <Link
                    href={alert.link}
                    className="p-1 text-slate-500 hover:text-cyan-400 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
                <button
                  onClick={() => dismissAlert(originalIndex)}
                  className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Show More */}
      {visibleAlerts.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 transition-colors border-t border-slate-800/50"
        >
          {expanded ? 'Réduire' : `Voir ${visibleAlerts.length - 3} autres alertes`}
        </button>
      )}
    </div>
  )
}
