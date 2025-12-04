import * as XLSX from 'xlsx'
import type { Invoice, Contract, InvoiceNature, BudgetLine } from './types'

// IMPORT FUNCTIONS

export async function importInvoicesFromFile(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Lire les données brutes et nettoyer les noms de colonnes
        const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false })
        console.log('🔍 FACTURES DEBUG - Données brutes lues:', rawData)
        console.log('🔍 FACTURES DEBUG - Nombre de lignes:', rawData.length)

        const jsonData = rawData.map((row: any) => {
          const cleanedRow: any = {}
          Object.keys(row).forEach(key => {
            const cleanKey = key.replace(/\s*\[OBLIGATOIRE\]\s*/g, '').trim()
            cleanedRow[cleanKey] = row[key]
          })
          return cleanedRow
        })

        console.log('🔍 FACTURES DEBUG - Première ligne nettoyée:', jsonData[0])
        console.log('🔍 FACTURES DEBUG - Clés disponibles:', jsonData[0] ? Object.keys(jsonData[0]) : 'aucune')

        let successCount = 0
        const errors: string[] = []

        for (let i = 0; i < jsonData.length; i++) {
          const row: any = jsonData[i]
          if (onProgress) onProgress(i + 1, jsonData.length)

          try {
            console.log(`🔍 FACTURES DEBUG - Traitement ligne ${i + 1}:`, row)
            // Mapper les colonnes selon leur nom (nouveau template)
            const typeName = row['Type suivi budget'] || row['Type ID'] || ''
            const domainName = row['Domaine suivi budget'] || row['Domaine ID'] || ''
            const budgetLineName = row['Lignes detail suivi budget'] || row['Ligne budgétaire ID'] || ''

            // Résoudre les noms en IDs via l'API
            let typeId = ''
            let domainId = ''
            let budgetLineId = ''

            // Rechercher le type par nom
            if (typeName) {
              const typeResponse = await fetch(`/api/budget-types`)
              if (typeResponse.ok) {
                const types = await typeResponse.json()
                const foundType = types.find((t: any) => t.name === typeName)
                if (foundType) typeId = foundType.id
              }
            }

            // Rechercher le domaine par nom
            if (domainName) {
              const domainResponse = await fetch(`/api/budget-domains`)
              if (domainResponse.ok) {
                const domains = await domainResponse.json()
                const foundDomain = domains.find((d: any) => d.name === domainName)
                if (foundDomain) domainId = foundDomain.id
              }
            }

            // Rechercher la ligne budgétaire par nom
            if (budgetLineName) {
              const budgetLineResponse = await fetch(`/api/budget-lines`)
              if (budgetLineResponse.ok) {
                const budgetLines = await budgetLineResponse.json()
                if (budgetLines.data) {
                  const foundBudgetLine = budgetLines.data.find((bl: any) => bl.label === budgetLineName)
                  if (foundBudgetLine) budgetLineId = foundBudgetLine.id
                }
              }
            }

            // Vérifier les champs obligatoires (Code fournisseur à Montant TTC uniquement)
            const number = row['N° KIM'] || row['N° Facture'] || row['Numero'] || ''
            const lineNumber = row['Num Ligne'] || row['N° Ligne'] || row['Ligne'] || ''
            const vendor = row['Fournisseur'] || ''
            const supplierCode = row['Code fournisseur'] || row['Code Fournisseur'] || ''
            const description = row['Description'] || row['Libellé'] || ''
            const amountHT = parseFloat(row['Montant code comptable'] || row['Montant HT'] || '0')
            const allocationCode = row['Imputation'] || row['Code imputation'] || ''
            const amount = parseFloat(row['Montant TTC'] || row['Montant'] || '0')
            const invoiceDate = row['Date'] || row['Date facture'] || ''
            const invoiceYear = parseInt(row['Année'] || '')

            // Validation des champs obligatoires (seulement Code fournisseur à Montant TTC)
            if (!supplierCode) throw new Error('Code fournisseur obligatoire')
            if (!lineNumber) throw new Error('Num Ligne obligatoire')
            if (!invoiceDate) throw new Error('Date obligatoire')
            if (!invoiceYear) throw new Error('Année obligatoire')
            if (!number) throw new Error('N° KIM obligatoire')
            if (!description) throw new Error('Description obligatoire')
            if (!amountHT) throw new Error('Montant code comptable obligatoire')
            if (!allocationCode) throw new Error('Imputation obligatoire')
            if (!amount) throw new Error('Montant TTC obligatoire')

            // Type et Domaine sont optionnels, on utilise des valeurs par défaut s'ils sont absents
            if (!typeId && typeName) {
              throw new Error(`Type "${typeName}" introuvable`)
            }
            if (!domainId && domainName) {
              throw new Error(`Domaine "${domainName}" introuvable`)
            }

            // Si Type et Domaine ne sont pas fournis, récupérer les premiers disponibles
            if (!typeId) {
              const typeResponse = await fetch(`/api/budget-types`)
              if (typeResponse.ok) {
                const types = await typeResponse.json()
                if (types.length > 0) typeId = types[0].id
              }
            }
            if (!domainId) {
              const domainResponse = await fetch(`/api/budget-domains`)
              if (domainResponse.ok) {
                const domains = await domainResponse.json()
                if (domains.length > 0) domainId = domains[0].id
              }
            }

            // Vérifier qu'on a au moins un type et un domaine
            if (!typeId) throw new Error('Aucun type disponible dans le système')
            if (!domainId) throw new Error('Aucun domaine disponible dans le système')

            const invoiceData: any = {
              number,
              lineNumber,
              vendor: vendor || 'Non spécifié',
              supplierCode,
              description,
              amount,
              amountHT,
              dueDate: row['Date échéance'] || row['Echeance'] || invoiceDate,
              invoiceDate,
              invoiceYear,
              paymentDate: row['Date paiement'] || '',
              status: row['Statut'] || 'En attente',
              tags: row['Tags'] ? row['Tags'].split(',').map((t: string) => t.trim()) : [],
              comment: row['Commentaire'] || '',
              domainId,
              typeId,
              nature: row['Nature'] || 'Fonctionnement',
              budgetLineId: budgetLineId || undefined,
              accountingCode: row['Code comptable'] || '',
              allocationCode,
              commandNumber: row['N° commande'] || row['N° Commande'] || '',
              pointed: row['Pointée'] === 'Oui' || row['Pointé'] === 'Oui' || row['Pointée'] === true || row['Pointé'] === true,
            }

            // Créer la facture via l'API
            const response = await fetch('/api/invoices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(invoiceData),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'Erreur lors de la création')
            }

            successCount++
          } catch (error: any) {
            errors.push(`Ligne ${i + 2}: ${error.message}`)
          }
        }

        resolve({ success: successCount, errors })
      } catch (error: any) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'))
    reader.readAsBinaryString(file)
  })
}

export async function importContractsFromFile(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        let successCount = 0
        const errors: string[] = []

        for (let i = 0; i < jsonData.length; i++) {
          const row: any = jsonData[i]
          if (onProgress) onProgress(i + 1, jsonData.length)

          try {
            // Mapper les colonnes selon leur nom
            const contractData: any = {
              number: row['N° Contrat'] || row['Numero'] || '',
              label: row['Libellé'] || row['Label'] || '',
              vendor: row['Fournisseur'] || '',
              providerName: row['Nom Fournisseur'] || '',
              startDate: row['Date Début'] || row['Date debut'] || '',
              endDate: row['Date Fin'] || '',
              amount: parseFloat(row['Montant Total'] || row['Montant'] || '0'),
              typeId: row['Type ID'] || '',
              domainId: row['Domaine ID'] || '',
              budgetLineId: row['Ligne budgétaire ID'] || '',
              status: row['Statut'] || 'Actif',
              description: row['Description'] || '',
              constraints: row['Contraintes'] || row['Commentaire interne'] || '',
              accountingCode: row['Code Comptable'] || '',
              allocationCode: row['Code Allocation'] || row['Code imputation'] || '',
            }

            // Créer le contrat via l'API
            const response = await fetch('/api/contracts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(contractData),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'Erreur lors de la création')
            }

            successCount++
          } catch (error: any) {
            console.error(`❌ FACTURES DEBUG - Erreur ligne ${i + 2}:`, error.message)
            errors.push(`Ligne ${i + 2}: ${error.message}`)
          }
        }

        console.log('🔍 FACTURES DEBUG - Import terminé:', { successCount, errorsCount: errors.length })
        console.log('🔍 FACTURES DEBUG - Liste des erreurs:', errors)

        resolve({ success: successCount, errors })
      } catch (error: any) {
        console.error('❌ FACTURES DEBUG - Erreur globale:', error)
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'))
    reader.readAsBinaryString(file)
  })
}

// EXPORT FUNCTIONS

export function exportInvoicesToExcel(invoices: Invoice[], filename = 'factures.xlsx') {
  // Préparer les données pour l'export avec les nouveaux noms de colonnes
  const data = invoices.map((invoice) => ({
    'Code fournisseur': invoice.supplierCode || '',
    'Num Ligne': invoice.lineNumber || '',
    'Date': new Date(invoice.invoiceDate).toLocaleDateString('fr-FR'),
    'Année': invoice.invoiceYear || new Date(invoice.invoiceDate).getFullYear(),
    'N° KIM': invoice.number,
    'Description': invoice.description,
    'Montant code comptable': invoice.amountHT || '',
    'Imputation': invoice.allocationCode || '',
    'Montant TTC': invoice.amount,
    'Pointée': invoice.pointed ? 'Oui' : 'Non',
    'N° commande': invoice.commandNumber || '',
    'Type suivi budget': invoice.type?.name || '',
    'Domaine suivi budget': invoice.domain?.name || '',
    'Lignes detail suivi budget': invoice.budgetLine?.label || '',
  }))

  // Créer un workbook et une feuille
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Factures')

  // Télécharger le fichier
  XLSX.writeFile(workbook, filename)
}

export function exportInvoicesToCSV(invoices: Invoice[], filename = 'factures.csv') {
  // Préparer les données pour l'export avec les nouveaux noms de colonnes
  const data = invoices.map((invoice) => ({
    'Code fournisseur': invoice.supplierCode || '',
    'Num Ligne': invoice.lineNumber || '',
    'Date': new Date(invoice.invoiceDate).toLocaleDateString('fr-FR'),
    'Année': invoice.invoiceYear || new Date(invoice.invoiceDate).getFullYear(),
    'N° KIM': invoice.number,
    'Description': invoice.description,
    'Montant code comptable': invoice.amountHT || '',
    'Imputation': invoice.allocationCode || '',
    'Montant TTC': invoice.amount,
    'Pointée': invoice.pointed ? 'Oui' : 'Non',
    'N° commande': invoice.commandNumber || '',
    'Type suivi budget': invoice.type?.name || '',
    'Domaine suivi budget': invoice.domain?.name || '',
    'Lignes detail suivi budget': invoice.budgetLine?.label || '',
  }))

  // Créer un workbook et une feuille
  const worksheet = XLSX.utils.json_to_sheet(data)
  const csv = XLSX.utils.sheet_to_csv(worksheet)

  // Créer un blob et télécharger
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportContractsToExcel(contracts: Contract[], filename = 'contrats.xlsx') {
  // Préparer les données pour l'export
  const data = contracts.map((contract) => ({
    'N° Contrat': contract.number,
    'Libellé': contract.label,
    'Fournisseur': contract.vendor,
    'Nom Fournisseur': contract.providerName || '',
    'Type': contract.type?.name || '',
    'Domaine': contract.domain?.name || '',
    'Ligne Budgétaire': contract.budgetLine?.label || '',
    'Date Début': new Date(contract.startDate).toLocaleDateString('fr-FR'),
    'Date Fin': new Date(contract.endDate).toLocaleDateString('fr-FR'),
    'Montant Total': contract.amount,
    'Statut': contract.status,
    'Code Comptable': contract.accountingCode || '',
    'Code Allocation': contract.allocationCode || '',
    'Description': contract.description || '',
    'Contraintes': contract.constraints || '',
  }))

  // Créer un workbook et une feuille
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contrats')

  // Télécharger le fichier
  XLSX.writeFile(workbook, filename)
}

export function exportContractsToCSV(contracts: Contract[], filename = 'contrats.csv') {
  // Préparer les données pour l'export
  const data = contracts.map((contract) => ({
    'N° Contrat': contract.number,
    'Libellé': contract.label,
    'Fournisseur': contract.vendor,
    'Nom Fournisseur': contract.providerName || '',
    'Type': contract.type?.name || '',
    'Domaine': contract.domain?.name || '',
    'Ligne Budgétaire': contract.budgetLine?.label || '',
    'Date Début': new Date(contract.startDate).toLocaleDateString('fr-FR'),
    'Date Fin': new Date(contract.endDate).toLocaleDateString('fr-FR'),
    'Montant Total': contract.amount,
    'Statut': contract.status,
    'Code Comptable': contract.accountingCode || '',
    'Code Allocation': contract.allocationCode || '',
    'Description': contract.description || '',
    'Contraintes': contract.constraints || '',
  }))

  // Créer un workbook et une feuille
  const worksheet = XLSX.utils.json_to_sheet(data)
  const csv = XLSX.utils.sheet_to_csv(worksheet)

  // Créer un blob et télécharger
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// BUDGET LINES EXPORT

export function exportBudgetLinesToExcel(budgetLines: BudgetLine[], filename = 'structure-budgetaire.xlsx') {
  // Préparer les données pour l'export
  const data = budgetLines.map((line) => ({
    'Libellé': line.label,
    'Type': line.type?.name || '',
    'Domaine': line.domain?.name || '',
    'Nature': line.nature || '',
    'Code Comptable': line.accountingCode || '',
    'Description': line.description || '',
    'Budget': line.budget,
    'Engagé': line.engineered,
    'Facturé': line.invoiced,
  }))

  // Créer un workbook et une feuille
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Structure Budgétaire')

  // Télécharger le fichier
  XLSX.writeFile(workbook, filename)
}

export function exportBudgetLinesToCSV(budgetLines: BudgetLine[], filename = 'structure-budgetaire.csv') {
  // Préparer les données pour l'export
  const data = budgetLines.map((line) => ({
    'Libellé': line.label,
    'Type': line.type?.name || '',
    'Domaine': line.domain?.name || '',
    'Nature': line.nature || '',
    'Code Comptable': line.accountingCode || '',
    'Description': line.description || '',
    'Budget': line.budget,
    'Engagé': line.engineered,
    'Facturé': line.invoiced,
  }))

  // Créer un workbook et une feuille
  const worksheet = XLSX.utils.json_to_sheet(data)
  const csv = XLSX.utils.sheet_to_csv(worksheet)

  // Créer un blob et télécharger
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
