'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Upload, Download, FileSpreadsheet, X, FileText, Lightbulb, CheckCircle2
} from 'lucide-react'

type ImportType = 'invoices' | 'contracts' | 'budget-lines' | 'forecast-budget-lines'

interface PreviewData {
  headers: string[]
  rows: string[][]
  totalRows: number
}

interface ImportHistoryItem {
  id: string
  filename: string
  type: ImportType
  status: 'success' | 'partial' | 'error'
  linesCount: number
  errorsCount: number
  date: string
  errors?: string[]
}

export default function ImportsPage() {
  const [importType, setImportType] = useState<ImportType>('invoices')
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<ImportHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]

    // Vérifier le type de fichier
    if (!file.name.match(/\.(xlsx|csv|json)$/i)) {
      toast.error('Format non supporté. Utilisez XLSX, CSV ou JSON.')
      return
    }

    // Vérifier la taille
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Fichier trop volumineux. Maximum 50 MB.')
      return
    }

    setPreviewFile(file)

    // Lire le fichier pour la prévisualisation
    if (file.name.endsWith('.csv')) {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      // Détecter le séparateur (point-virgule ou virgule)
      const separator = lines[0].includes(';') ? ';' : ','
      const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''))
      const rows = lines.slice(1).map(line =>
        line.split(separator).map(cell => cell.trim().replace(/"/g, ''))
      )
      setPreviewData({
        headers,
        rows,
        totalRows: lines.length - 1,
      })
    } else if (file.name.endsWith('.json')) {
      const text = await file.text()
      try {
        const json = JSON.parse(text)
        const data = Array.isArray(json) ? json : [json]
        const headers = Object.keys(data[0] || {})
        const rows = data.map(item =>
          headers.map(h => String(item[h] || ''))
        )
        setPreviewData({
          headers,
          rows,
          totalRows: data.length,
        })
      } catch {
        toast.error('Fichier JSON invalide')
        setPreviewFile(null)
      }
    } else {
      // Pour XLSX, on ne fait pas de preview côté client
      setPreviewData({
        headers: ['Fichier Excel détecté'],
        rows: [['Les données seront analysées lors de l\'import']],
        totalRows: 0,
      })
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImport = async () => {
    if (!previewFile) return

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', previewFile)
      formData.append('type', importType)

      const response = await fetch('/api/imports', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Import failed')
      }

      const result = await response.json()

      // Ajouter à l'historique local
      const newEntry: ImportHistoryItem = {
        id: result.id || Date.now().toString(),
        filename: previewFile.name,
        type: importType,
        status: result.errorsCount > 0 ? 'partial' : 'success',
        linesCount: result.linesCount || 0,
        errorsCount: result.errorsCount || 0,
        date: new Date().toISOString().split('T')[0],
        errors: result.errors,
      }

      setUploadedFiles(prev => [newEntry, ...prev])
      setPreviewFile(null)
      setPreviewData(null)

      if (result.errorsCount > 0) {
        toast.warning(`Import partiel : ${result.linesCount} lignes importées, ${result.errorsCount} erreurs`)
      } else {
        toast.success(`Import réussi : ${result.linesCount} lignes importées`)
      }
    } catch (error) {
      toast.error('Erreur lors de l\'import')
      console.error('Import error:', error)
    } finally {
      setLoading(false)
    }
  }

  const cancelPreview = () => {
    setPreviewFile(null)
    setPreviewData(null)
  }

  const downloadTemplate = (type: ImportType) => {
    let csvContent = ''
    let filename = ''

    switch (type) {
      case 'invoices':
        csvContent = 'Code fournisseur [OBLIGATOIRE];Num Ligne [OBLIGATOIRE];Date [OBLIGATOIRE];Année [OBLIGATOIRE];N° KIM [OBLIGATOIRE];Description [OBLIGATOIRE];Montant code comptable [OBLIGATOIRE];Imputation [OBLIGATOIRE];Montant TTC [OBLIGATOIRE];Fournisseur;Pointée;N° commande;Type suivi budget;Domaine suivi budget;Lignes detail suivi budget\n'
        csvContent += 'MSFT-001;L001;2025-01-15;2025;FAC-2025-001;Licence Office 365 (1 an);1000.00;LIC-OFFICE;1200.00;Microsoft;Non;;Logiciels;Innovation;Licences logicielles 2025\n'
        csvContent += 'AWS-001;L001;2025-01-20;2025;FAC-2025-002;Hébergement cloud mensuel;708.75;CLOUD-AWS;850.50;Amazon AWS;Oui;CMD-2025-012;Infrastructure;Innovation;Infrastructure cloud\n'
        csvContent += 'DELL-001;L001;2025-01-10;2025;FAC-2025-003;Serveurs rack pour datacenter;15000.00;SRV-RACK;18000.00;Dell;Non;CMD-2025-008;Infrastructure;Innovation;Matériel serveurs'
        filename = 'modele_factures.csv'
        break
      case 'contracts':
        csvContent = '# IMPORTANT : Type, Domaine et Pôle doivent correspondre EXACTEMENT aux noms dans votre site\n'
        csvContent += 'Numéro contrat [OBLIGATOIRE];Nom du contrat [OBLIGATOIRE];Fournisseur [OBLIGATOIRE];Date début [OBLIGATOIRE];Date fin [OBLIGATOIRE];Montant [OBLIGATOIRE];Statut;Type;Domaine;Service/Pôle;Description;Code comptable;Code imputation\n'
        csvContent += 'CTR-2025-001;Maintenance annuelle serveurs;Dell Technologies;2025-01-01;2025-12-31;50000.00;Actif;Infrastructure;Innovation;DSI/Infrastructure;Support et maintenance 24/7 des serveurs physiques;6130-01;SUPPORT-IT\n'
        csvContent += 'CTR-2025-002;Licences Microsoft Enterprise;Microsoft;2025-01-01;2026-12-31;120000.00;Actif;Logiciels;Innovation;DSI/Infrastructure;Pack Office 365 E3 pour 500 utilisateurs;6120-02;LIC-OFFICE'
        filename = 'modele_contrats.csv'
        break
      case 'budget-lines':
        csvContent = '# IMPORTANT : Type, Domaine et Pôle doivent correspondre EXACTEMENT aux noms dans votre site\n'
        csvContent += 'Libellé [OBLIGATOIRE];Type [OBLIGATOIRE];Domaine [OBLIGATOIRE];Budget [OBLIGATOIRE];Année [OBLIGATOIRE];Engagé;Facturé;Code comptable;Nature;Service/Pôle;Description\n'
        csvContent += 'Licences logicielles 2025;Logiciels;Innovation;100000.00;2025;75000.00;60000.00;6190-01;Fonctionnement;DSI/Infrastructure;Budget alloué pour les licences logicielles\n'
        csvContent += 'Infrastructure cloud;Infrastructure;Innovation;50000.00;2025;30000.00;25000.00;6130-05;Fonctionnement;DSI/Infrastructure;Hébergement et services cloud'
        filename = 'modele_lignes_budgetaires.csv'
        break
      case 'forecast-budget-lines':
        csvContent = '# IMPORTANT : Type, Domaine et Pôle doivent correspondre EXACTEMENT aux noms dans votre site. Nature : Fonctionnement ou Investissement\n'
        csvContent += 'Catégorie [OBLIGATOIRE];Nom [OBLIGATOIRE];Montant [OBLIGATOIRE];Année [OBLIGATOIRE];Type;Domaine;Pôle;Code comptable;Nature;Description\n'
        csvContent += 'LIGNE;Licences antivirus entreprise;120000;2025;Infrastructure;Innovation;DSI/Cybersécurité;6120-SEC;Fonctionnement;Budget total licences antivirus\n'
        csvContent += 'DEPENSE;License Kaspersky;30000;2025;;;;;;Licence antivirus Kaspersky pour 100 postes\n'
        csvContent += 'DEPENSE;EDR CrowdStrike;30000;2025;;;;;;Solution EDR pour protection avancée\n'
        csvContent += 'DEPENSE;Audit sécurité;30000;2025;;;;;;Audit de sécurité informatique annuel\n'
        csvContent += 'DEPENSE;Formation équipe;30000;2025;;;;;;Formation cybersécurité pour le personnel\n'
        csvContent += 'LIGNE;Hébergement cloud AWS;80000;2025;Logiciels;Innovation;DSI/Infrastructure;6130-CLOUD;Fonctionnement;Budget annuel hébergement cloud\n'
        csvContent += 'DEPENSE;Serveurs EC2;40000;2025;;;;;;Instances de calcul Amazon EC2\n'
        csvContent += 'DEPENSE;Base de données RDS;40000;2025;;;;;;Services de base de données managée RDS'
        filename = 'modele_budget_previsionnel.csv'
        break
    }

    // Ajouter BOM UTF-8 pour Excel
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()

    // Cleanup immédiat pour éviter les fuites mémoire
    URL.revokeObjectURL(link.href)
  }

  const typeLabels: Record<ImportType, string> = {
    invoices: 'Factures',
    contracts: 'Contrats',
    'budget-lines': 'Lignes budgétaires',
    'forecast-budget-lines': 'Budget Prévisionnel',
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-50">Import de Données</h2>
          <p className="text-slate-400 mt-2">Importez vos factures, contrats et lignes budgétaires en masse</p>
        </div>

        {/* Section Préparation - Workflow en 3 étapes */}
        <Card className="border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800/50 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-cyan-600/20 rounded-lg flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-50">Première importation ?</h3>
                <p className="text-sm text-slate-400">Suivez ce processus en 3 étapes pour importer vos données rapidement</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Étape 1 */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl opacity-20 group-hover:opacity-30 transition blur"></div>
                <div className="relative bg-slate-800 p-5 rounded-xl border border-slate-700 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      1
                    </div>
                    <h4 className="font-semibold text-slate-50">Télécharger</h4>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">
                    Choisissez le type de données et téléchargez le modèle CSV avec un exemple pré-rempli
                  </p>
                  <div className="flex gap-2">
                    <Select value={importType} onValueChange={(v) => setImportType(v as ImportType)}>
                      <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-100 flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invoices">📄 Factures</SelectItem>
                        <SelectItem value="contracts">📑 Contrats</SelectItem>
                        <SelectItem value="budget-lines">💰 Lignes budgétaires</SelectItem>
                        <SelectItem value="forecast-budget-lines">📊 Budget Prévisionnel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => downloadTemplate(importType)}
                    className="w-full mt-3 bg-cyan-600 hover:bg-cyan-700 text-white"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger le modèle
                  </Button>
                </div>
              </div>

              {/* Étape 2 */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl opacity-20 group-hover:opacity-30 transition blur"></div>
                <div className="relative bg-slate-800 p-5 rounded-xl border border-slate-700 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      2
                    </div>
                    <h4 className="font-semibold text-slate-50">Remplir</h4>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">
                    Ouvrez le fichier avec Excel ou Google Sheets et remplissez vos données ligne par ligne
                  </p>
                  <div className="space-y-2 text-xs text-slate-500">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>Suivez les colonnes du modèle</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>Respectez le format des dates</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>Ne modifiez pas les en-têtes</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Étape 3 */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl opacity-20 group-hover:opacity-30 transition blur"></div>
                <div className="relative bg-slate-800 p-5 rounded-xl border border-slate-700 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      3
                    </div>
                    <h4 className="font-semibold text-slate-50">Importer</h4>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">
                    Glissez-déposez votre fichier ci-dessous ou parcourez vos fichiers pour l'importer
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
                    <span>CSV, XLSX ou JSON</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <FileText className="h-4 w-4 text-amber-400" />
                    <span>Maximum 50 MB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Informations détaillées selon le type sélectionné */}
            <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-slate-200 mb-2">
                    {importType === 'invoices' && 'Format des Factures'}
                    {importType === 'contracts' && 'Format des Contrats'}
                    {importType === 'budget-lines' && 'Format des Lignes Budgétaires'}
                  </h5>
                  <div className="text-xs text-slate-400 space-y-1">
                    {importType === 'invoices' && (
                      <>
                        <p className="text-emerald-400 font-medium mb-2">📌 Colonnes obligatoires :</p>
                        <p className="ml-4">• <strong className="text-slate-300">Code fournisseur</strong> - Code unique du fournisseur</p>
                        <p className="ml-4">• <strong className="text-slate-300">Num Ligne</strong> - Numéro de ligne</p>
                        <p className="ml-4">• <strong className="text-slate-300">Date</strong> - Format YYYY-MM-DD (ex: 2025-01-15)</p>
                        <p className="ml-4">• <strong className="text-slate-300">Année</strong> - Année de la facture (ex: 2025)</p>
                        <p className="ml-4">• <strong className="text-slate-300">N° KIM</strong> - Numéro de facture unique (ex: FAC-2025-001)</p>
                        <p className="ml-4">• <strong className="text-slate-300">Description</strong> - Description de la facture</p>
                        <p className="ml-4">• <strong className="text-slate-300">Montant code comptable</strong> - Montant HT (ex: 1000.00)</p>
                        <p className="ml-4">• <strong className="text-slate-300">Imputation</strong> - Code d'imputation</p>
                        <p className="ml-4">• <strong className="text-slate-300">Montant TTC</strong> - Décimal avec point (ex: 1234.56)</p>
                        <p className="text-slate-500 font-medium mt-2 mb-2">🔖 Colonnes optionnelles (laissez vides si non nécessaires) :</p>
                        <p className="ml-4 text-slate-500">Fournisseur, Pointée (Oui/Non), N° commande, Type suivi budget (si vide, le premier type sera utilisé), Domaine suivi budget (si vide, le premier domaine sera utilisé), Lignes detail suivi budget</p>
                      </>
                    )}
                    {importType === 'contracts' && (
                      <>
                        <p className="text-emerald-400 font-medium mb-2">📌 Colonnes obligatoires :</p>
                        <p className="ml-4">• <strong className="text-slate-300">Numéro contrat</strong> - Ex: CTR-2024-001</p>
                        <p className="ml-4">• <strong className="text-slate-300">Nom du contrat</strong> - Ex: Maintenance annuelle</p>
                        <p className="ml-4">• <strong className="text-slate-300">Fournisseur</strong> - Ex: Dell, IBM</p>
                        <p className="ml-4">• <strong className="text-slate-300">Date début</strong> - Format YYYY-MM-DD</p>
                        <p className="ml-4">• <strong className="text-slate-300">Date fin</strong> - Format YYYY-MM-DD</p>
                        <p className="ml-4">• <strong className="text-slate-300">Montant</strong> - Décimal avec point</p>
                        <p className="text-slate-500 font-medium mt-2 mb-2">🔖 Colonnes optionnelles :</p>
                        <p className="ml-4 text-slate-500">Statut, Type ID, Domaine ID, Description, Code comptable, Code imputation</p>
                      </>
                    )}
                    {importType === 'budget-lines' && (
                      <>
                        <p className="text-emerald-400 font-medium mb-2">📌 Colonnes obligatoires :</p>
                        <p className="ml-4">• <strong className="text-slate-300">Libellé</strong> - Nom de la ligne budgétaire</p>
                        <p className="ml-4">• <strong className="text-slate-300">Type ID</strong> - Identifiant du type (ex: type-1)</p>
                        <p className="ml-4">• <strong className="text-slate-300">Domaine ID</strong> - Identifiant du domaine (ex: domain-1)</p>
                        <p className="ml-4">• <strong className="text-slate-300">Budget</strong> - Montant alloué (décimal)</p>
                        <p className="text-slate-500 font-medium mt-2 mb-2">🔖 Colonnes optionnelles :</p>
                        <p className="ml-4 text-slate-500">Engagé, Facturé, Code comptable, Nature, Description</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Divider avec texte */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-slate-950 text-slate-400 font-medium">Import de fichier</span>
          </div>
        </div>

        {/* Zone de dépôt ou prévisualisation */}
        {!previewData ? (
          <Card
            className="border-2 border-dashed border-slate-700 bg-slate-900/50 cursor-pointer hover:border-cyan-600/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFileSelect(e.dataTransfer.files)
            }}
          >
            <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center">
              <Upload className="text-slate-500 mb-4" size={48} />
              <p className="text-lg font-medium text-slate-50 mb-2">Déposez votre fichier ici</p>
              <p className="text-slate-400 mb-6">ou</p>
              <Button
                className="bg-cyan-600 hover:bg-cyan-700"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Parcourir les fichiers
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv,.json"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <p className="text-xs text-slate-500 mt-6">XLSX, CSV, JSON • Max 50 MB</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-cyan-700 bg-slate-900/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-6 w-6 text-cyan-400" />
                  <div>
                    <p className="font-medium text-slate-50">{previewFile?.name}</p>
                    <p className="text-sm text-slate-400">
                      {previewData.totalRows > 0 ? `${previewData.totalRows} lignes détectées` : 'Fichier Excel'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={cancelPreview}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Prévisualisation du tableau */}
              <div className="relative mb-4">
                <div
                  className="overflow-x-auto overflow-y-scroll h-96 border border-slate-700 rounded-lg"
                  style={{
                    overscrollBehavior: 'contain',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-900 z-10">
                      <tr className="border-b border-slate-700">
                        {previewData.headers.map((header, i) => (
                          <th key={i} className="text-left p-2 text-slate-400 font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.map((row, i) => (
                        <tr key={i} className="border-b border-slate-800">
                          {row.map((cell, j) => (
                            <td key={j} className="p-2 text-slate-300 truncate max-w-[200px]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.totalRows > previewData.rows.length && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none flex items-center justify-center">
                    <span className="text-xs text-slate-400">↓ Scroller pour voir plus ↓</span>
                  </div>
                )}
              </div>

              {previewData.totalRows > previewData.rows.length && (
                <p className="text-xs text-slate-500 mb-4 mt-2">
                  {previewData.rows.length} lignes affichées sur {previewData.totalRows}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleImport}
                  disabled={loading}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Import en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importer comme {typeLabels[importType]}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={cancelPreview} disabled={loading}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </MainLayout>
  )
}
