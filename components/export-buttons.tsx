'use client'

import { forwardRef } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ExportButtonsProps {
  year?: number
}

export function ExportButtons({ year }: ExportButtonsProps) {
  const handleExport = async (type: string) => {
    const url = `/api/exports?type=${type}${year ? `&year=${year}` : ''}`

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename="')[1]?.replace('"', '')
        : `export_${type}.csv`

      // Créer un lien de téléchargement
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Export error:', error)
      alert('Erreur lors de l\'export')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Exporter en CSV</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport('summary')}>
          Récapitulatif global
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('invoices')}>
          Factures{year ? ` (${year})` : ''}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('contracts')}>
          Contrats
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('budget-lines')}>
          Lignes budgétaires
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
