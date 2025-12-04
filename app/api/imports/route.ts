import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Mapping des colonnes françaises vers les champs de la base de données
const COLUMN_MAPPING = {
  invoices: {
    // Nouvelles colonnes du template
    'Code fournisseur [OBLIGATOIRE]': 'supplierCode',
    'Code fournisseur': 'supplierCode',
    'supplierCode': 'supplierCode',
    'Num Ligne [OBLIGATOIRE]': 'lineNumber',
    'Num Ligne': 'lineNumber',
    'lineNumber': 'lineNumber',
    'Date [OBLIGATOIRE]': 'invoiceDate',
    'Date': 'invoiceDate',
    'Année [OBLIGATOIRE]': 'invoiceYear',
    'Année': 'invoiceYear',
    'invoiceYear': 'invoiceYear',
    'N° KIM [OBLIGATOIRE]': 'number',
    'N° KIM': 'number',
    'Description [OBLIGATOIRE]': 'description',
    'Description': 'description',
    'Montant code comptable [OBLIGATOIRE]': 'amountHT',
    'Montant code comptable': 'amountHT',
    'Imputation [OBLIGATOIRE]': 'allocationCode',
    'Imputation': 'allocationCode',
    'Montant TTC [OBLIGATOIRE]': 'amount',
    'Montant TTC': 'amount',
    'Fournisseur': 'vendor',
    'Pointée': 'pointed',
    'N° commande': 'commandNumber',
    'Type suivi budget': 'typeName',
    'Domaine suivi budget': 'domainName',
    'Lignes detail suivi budget': 'budgetLineName',

    // Anciennes colonnes (pour compatibilité)
    'Numéro facture [OBLIGATOIRE]': 'number',
    'Numéro facture': 'number',
    'number': 'number',
    'vendor': 'vendor',
    'description': 'description',
    'amount': 'amount',
    'Montant HT': 'amountHT',
    'amountHT': 'amountHT',
    'Avoir': 'isCredit',
    'isCredit': 'isCredit',
    'Date facturation [OBLIGATOIRE]': 'invoiceDate',
    'Date facturation': 'invoiceDate',
    'invoiceDate': 'invoiceDate',
    'Date échéance': 'dueDate',
    'dueDate': 'dueDate',
    'Date paiement': 'paymentDate',
    'paymentDate': 'paymentDate',
    'Statut': 'status',
    'status': 'status',
    'Nature': 'nature',
    'nature': 'nature',
    'Type ID': 'typeId',
    'typeId': 'typeId',
    'Domaine ID': 'domainId',
    'domainId': 'domainId',
    'Code comptable': 'accountingCode',
    'accountingCode': 'accountingCode',
    'allocationCode': 'allocationCode',
    'commandNumber': 'commandNumber',
    'pointed': 'pointed',
  },
  contracts: {
    'Numéro contrat [OBLIGATOIRE]': 'number',
    'Numéro contrat': 'number',
    'number': 'number',
    'Nom du contrat [OBLIGATOIRE]': 'label',
    'Nom du contrat': 'label',
    'label': 'label',
    'Fournisseur [OBLIGATOIRE]': 'vendor',
    'Fournisseur': 'vendor',
    'vendor': 'vendor',
    'Date début [OBLIGATOIRE]': 'startDate',
    'Date début': 'startDate',
    'startDate': 'startDate',
    'Date fin [OBLIGATOIRE]': 'endDate',
    'Date fin': 'endDate',
    'endDate': 'endDate',
    'Montant [OBLIGATOIRE]': 'amount',
    'Montant': 'amount',
    'amount': 'amount',
    'Statut': 'status',
    'status': 'status',
    'Type ID': 'typeId',
    'typeId': 'typeId',
    'Domaine ID': 'domainId',
    'domainId': 'domainId',
    'Description': 'description',
    'description': 'description',
    'Code comptable': 'accountingCode',
    'accountingCode': 'accountingCode',
    'Code imputation': 'allocationCode',
    'allocationCode': 'allocationCode',
  },
  'budget-lines': {
    'Libellé [OBLIGATOIRE]': 'label',
    'Libellé': 'label',
    'label': 'label',
    'Type [OBLIGATOIRE]': 'typeName',
    'Type': 'typeName',
    'Type ID [OBLIGATOIRE]': 'typeId',
    'Type ID': 'typeId',
    'typeId': 'typeId',
    'typeName': 'typeName',
    'Domaine [OBLIGATOIRE]': 'domainName',
    'Domaine': 'domainName',
    'Domaine ID [OBLIGATOIRE]': 'domainId',
    'Domaine ID': 'domainId',
    'domainId': 'domainId',
    'domainName': 'domainName',
    'Budget [OBLIGATOIRE]': 'budget',
    'Budget': 'budget',
    'budget': 'budget',
    'Année [OBLIGATOIRE]': 'year',
    'Année': 'year',
    'year': 'year',
    'Engagé': 'engineered',
    'engineered': 'engineered',
    'Facturé': 'invoiced',
    'invoiced': 'invoiced',
    'Code comptable': 'accountingCode',
    'accountingCode': 'accountingCode',
    'Nature': 'nature',
    'nature': 'nature',
    'Service': 'serviceName',
    'serviceName': 'serviceName',
    'Pôle': 'poleName',
    'poleName': 'poleName',
    'Description': 'description',
    'description': 'description',
  },
  'forecast-budget-lines': {
    'Catégorie [OBLIGATOIRE]': 'category',
    'Catégorie': 'category',
    'category': 'category',
    'Nom [OBLIGATOIRE]': 'name',
    'Nom': 'name',
    'name': 'name',
    'Montant [OBLIGATOIRE]': 'amount',
    'Montant': 'amount',
    'amount': 'amount',
    'Année [OBLIGATOIRE]': 'year',
    'Année': 'year',
    'year': 'year',
    'Type': 'typeName',
    'typeName': 'typeName',
    'Domaine': 'domainName',
    'domainName': 'domainName',
    'Pôle': 'pole',
    'pole': 'pole',
    'Code comptable': 'accountingCode',
    'accountingCode': 'accountingCode',
    'Nature': 'nature',
    'nature': 'nature',
    'Description': 'description',
    'description': 'description',
  },
}

// Fonction pour mapper une ligne CSV
function mapRow(row: any, mapping: Record<string, string>) {
  const mapped: any = {}
  for (const [csvColumn, value] of Object.entries(row)) {
    const dbField = mapping[csvColumn]
    if (dbField && value !== '' && value !== null && value !== undefined) {
      mapped[dbField] = value
    }
  }
  return mapped
}

// Fonction pour résoudre les noms en IDs (Types, Domaines, Services, Pôles)
async function resolveReferences(organizationId: string) {
  const [types, domains, services] = await Promise.all([
    prisma.budgetType.findMany({
      where: { organizationId },
      select: { id: true, name: true }
    }),
    prisma.budgetStructureDomain.findMany({
      where: { organizationId },
      select: { id: true, name: true }
    }),
    prisma.service.findMany({
      where: { organizationId },
      include: {
        poles: { select: { id: true, name: true } }
      }
    })
  ])

  // Créer des maps pour recherche rapide (case-insensitive)
  const typeMap = new Map(types.map(t => [t.name.toLowerCase(), t.id]))
  const domainMap = new Map(domains.map(d => [d.name.toLowerCase(), d.id]))
  const serviceMap = new Map(services.map(s => [s.name.toLowerCase(), s.id]))
  const poleMap = new Map()

  services.forEach(service => {
    service.poles.forEach(pole => {
      const key = `${service.name.toLowerCase()}:${pole.name.toLowerCase()}`
      poleMap.set(key, pole.id)
      // Aussi permettre juste le nom du pôle si unique
      poleMap.set(pole.name.toLowerCase(), pole.id)
    })
  })

  return { typeMap, domainMap, serviceMap, poleMap }
}

// GET /api/imports - Historique des imports (vide pour l'instant)
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Pour l'instant, retourner un tableau vide
    // TODO: Créer une table ImportHistory si nécessaire
    return NextResponse.json([])
  } catch (error) {
    console.error('Error fetching import history:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/imports - Import de données
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as 'invoices' | 'contracts' | 'budget-lines' | 'forecast-budget-lines'

    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    // Lire le contenu du fichier
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'))

    console.log('🔍 IMPORT DEBUG - Fichier:', file.name)
    console.log('🔍 IMPORT DEBUG - Type:', type)
    console.log('🔍 IMPORT DEBUG - Nombre de lignes:', lines.length)

    if (lines.length < 2) {
      return NextResponse.json({ error: 'Fichier vide ou invalide' }, { status: 400 })
    }

    // Détecter le séparateur
    const separator = lines[0].includes(';') ? ';' : ','

    // Parser l'en-tête
    const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''))

    console.log('🔍 IMPORT DEBUG - En-têtes détectés:', headers)

    // Parser les données
    const rows = lines.slice(1).map(line => {
      const values = line.split(separator).map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      return row
    })

    const mapping = COLUMN_MAPPING[type]
    const errors: string[] = []
    let successCount = 0

    // Charger les références pour résolution des noms (Types, Domaines, Pôles)
    const refs = await resolveReferences(session.user.organizationId)

    // Traiter chaque ligne avec batch processing (par blocs de 100)
    const BATCH_SIZE = 100
    for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
      const batch = rows.slice(batchStart, batchStart + BATCH_SIZE)

      for (let i = 0; i < batch.length; i++) {
        const globalIndex = batchStart + i
        try {
          const rawRow = batch[i]
          const mappedRow = mapRow(rawRow, mapping)

          if (globalIndex === 0) {
            console.log('🔍 IMPORT DEBUG - Première ligne brute:', rawRow)
            console.log('🔍 IMPORT DEBUG - Première ligne mappée:', mappedRow)
          }

          // Ajouter l'organisation ID
          mappedRow.organizationId = session.user.organizationId

          // Résoudre les noms en IDs si présents
          if (mappedRow.typeName && !mappedRow.typeId) {
            mappedRow.typeId = refs.typeMap.get(mappedRow.typeName.toLowerCase())
            if (!mappedRow.typeId) {
              errors.push(`Ligne ${globalIndex + 2}: Type "${mappedRow.typeName}" introuvable`)
              continue
            }
          }
          if (mappedRow.domainName && !mappedRow.domainId) {
            mappedRow.domainId = refs.domainMap.get(mappedRow.domainName.toLowerCase())
            if (!mappedRow.domainId) {
              errors.push(`Ligne ${globalIndex + 2}: Domaine "${mappedRow.domainName}" introuvable`)
              continue
            }
          }
          if (mappedRow.poleName || mappedRow.serviceName) {
            let poleKey = mappedRow.poleName?.toLowerCase()
            if (mappedRow.serviceName && mappedRow.poleName) {
              poleKey = `${mappedRow.serviceName.toLowerCase()}:${mappedRow.poleName.toLowerCase()}`
            }
            if (poleKey) {
              mappedRow.poleId = refs.poleMap.get(poleKey) || null
            }
          }

          // Résoudre la ligne budgétaire par nom si présent
          if (mappedRow.budgetLineName) {
            const budgetLines = await prisma.budgetLine.findMany({
              where: {
                organizationId: session.user.organizationId,
                label: { contains: mappedRow.budgetLineName }
              },
              select: { id: true }
            })
            if (budgetLines.length > 0) {
              mappedRow.budgetLineId = budgetLines[0].id
            }
            delete mappedRow.budgetLineName
          }

          // Import selon le type
          if (type === 'invoices') {
          // Validation des champs obligatoires (nouveau template)
          const requiredFields = ['supplierCode', 'lineNumber', 'invoiceDate', 'invoiceYear', 'number', 'description', 'amountHT', 'allocationCode', 'amount']
          const missingFields = requiredFields.filter(field => !mappedRow[field])

          if (missingFields.length > 0) {
            errors.push(`Ligne ${globalIndex + 2}: Champs obligatoires manquants: ${missingFields.join(', ')}`)
            continue
          }

          // Convertir les types
          mappedRow.amount = parseFloat(mappedRow.amount)
          mappedRow.amountHT = parseFloat(mappedRow.amountHT)
          if (mappedRow.invoiceYear) mappedRow.invoiceYear = parseInt(mappedRow.invoiceYear)

          // Convertir les dates en objets Date pour Prisma
          if (mappedRow.invoiceDate) {
            mappedRow.invoiceDate = new Date(mappedRow.invoiceDate)
          }
          if (mappedRow.dueDate) {
            mappedRow.dueDate = new Date(mappedRow.dueDate)
          }
          if (mappedRow.paymentDate) {
            mappedRow.paymentDate = new Date(mappedRow.paymentDate)
          }

          // Gérer le champ Pointée
          if (mappedRow.pointed) {
            const pointedValue = mappedRow.pointed.toString().toLowerCase()
            mappedRow.pointed = pointedValue === 'oui' || pointedValue === 'yes' || pointedValue === 'true' || pointedValue === '1'
          } else {
            mappedRow.pointed = false
          }

          // Gérer le champ isCredit (avoir): convertir en boolean
          if (mappedRow.isCredit) {
            const creditValue = mappedRow.isCredit.toString().toLowerCase()
            mappedRow.isCredit = creditValue === 'true' || creditValue === '1' || creditValue === 'oui' || creditValue === 'yes'
          } else {
            mappedRow.isCredit = false
          }

          // Calculer l'année de facturation si pas fournie
          if (!mappedRow.invoiceYear) {
            mappedRow.invoiceYear = new Date(mappedRow.invoiceDate).getFullYear()
          }

          // Si Type et Domaine ne sont pas fournis, utiliser les premiers disponibles
          if (!mappedRow.typeId && refs.typeMap.size > 0) {
            mappedRow.typeId = Array.from(refs.typeMap.values())[0]
          }
          if (!mappedRow.domainId && refs.domainMap.size > 0) {
            mappedRow.domainId = Array.from(refs.domainMap.values())[0]
          }

          // Vérifier qu'on a au moins un type et un domaine
          if (!mappedRow.typeId || !mappedRow.domainId) {
            errors.push(`Ligne ${globalIndex + 2}: Type ou Domaine manquant dans le système`)
            continue
          }

          // Valeurs par défaut
          if (!mappedRow.vendor) mappedRow.vendor = 'Non spécifié'
          if (!mappedRow.status) mappedRow.status = 'En attente'
          if (!mappedRow.nature) mappedRow.nature = 'Fonctionnement'
          if (!mappedRow.dueDate) mappedRow.dueDate = mappedRow.invoiceDate

          // Nettoyer les champs non utilisés
          delete mappedRow.typeName
          delete mappedRow.domainName

          await prisma.invoice.create({ data: mappedRow })
          successCount++

        } else if (type === 'contracts') {
          // Validation des champs obligatoires
          if (!mappedRow.number || !mappedRow.label || !mappedRow.vendor ||
              !mappedRow.startDate || !mappedRow.endDate || !mappedRow.amount) {
            errors.push(`Ligne ${globalIndex + 2}: Champs obligatoires manquants`)
            continue
          }

          // Convertir les types
          mappedRow.amount = parseFloat(mappedRow.amount)
          mappedRow.startDate = new Date(mappedRow.startDate)
          mappedRow.endDate = new Date(mappedRow.endDate)

          // Valeurs par défaut
          if (!mappedRow.status) mappedRow.status = 'Actif'

          await prisma.contract.create({ data: mappedRow })
          successCount++

        } else if (type === 'budget-lines') {
          // Validation des champs obligatoires
          if (!mappedRow.label || !mappedRow.typeId || !mappedRow.domainId || !mappedRow.budget || !mappedRow.year) {
            errors.push(`Ligne ${globalIndex + 2}: Champs obligatoires manquants`)
            continue
          }

          // Convertir les types
          const budget = parseFloat(mappedRow.budget)
          const engineered = mappedRow.engineered ? parseFloat(mappedRow.engineered) : 0
          const invoiced = mappedRow.invoiced ? parseFloat(mappedRow.invoiced) : 0
          const year = parseInt(mappedRow.year)

          // Valeurs par défaut
          if (!mappedRow.nature) mappedRow.nature = 'Fonctionnement'

          // Créer la ligne budgétaire et son yearly budget en une transaction
          await prisma.$transaction(async (tx) => {
            const budgetLine = await tx.budgetLine.create({
              data: {
                label: mappedRow.label,
                description: mappedRow.description || null,
                typeId: mappedRow.typeId,
                domainId: mappedRow.domainId,
                nature: mappedRow.nature,
                accountingCode: mappedRow.accountingCode || null,
                budget: 0,
                engineered: 0,
                invoiced: 0,
                poleId: mappedRow.poleId || null,
                organizationId: session.user.organizationId!,
              }
            })
            await tx.yearlyBudget.create({
              data: {
                budgetLineId: budgetLine.id,
                year,
                budget,
                engineered,
                invoiced,
              }
            })
          })
          successCount++

        } else if (type === 'forecast-budget-lines') {
          // On skip le traitement ligne par ligne pour ce type
          // Il sera traité en batch après la boucle
          continue
        }

        } catch (error: any) {
          console.error(`❌ IMPORT DEBUG - Erreur ligne ${globalIndex + 2}:`, error.message)
          errors.push(`Ligne ${globalIndex + 2}: ${error.message}`)
        }
      }
    }

    console.log('🔍 IMPORT DEBUG - Import terminé:', { successCount, errorsCount: errors.length })
    console.log('🔍 IMPORT DEBUG - Erreurs:', errors)

    // Traitement spécial pour forecast-budget-lines (LIGNE/DEPENSE)
    if (type === 'forecast-budget-lines') {
      let currentBudgetLine: any = null
      let currentBudgetLineId: string | null = null

      for (let i = 0; i < rows.length; i++) {
        try {
          const rawRow = rows[i]
          const mappedRow = mapRow(rawRow, mapping)

          // Validation des champs obligatoires
          if (!mappedRow.category || !mappedRow.name || !mappedRow.amount || !mappedRow.year) {
            errors.push(`Ligne ${i + 2}: Champs obligatoires manquants (Catégorie, Nom, Montant, Année)`)
            continue
          }

          const rowType = mappedRow.category.toUpperCase()

          if (rowType === 'LIGNE') {
            // Créer une nouvelle ligne budgétaire

            // Parser Pôle si présent (format: "Service/Pôle" ou juste "Pôle")
            let poleId = null
            if (mappedRow.pole) {
              const parts = mappedRow.pole.split('/')
              if (parts.length === 2) {
                const serviceName = parts[0].trim()
                const poleName = parts[1].trim()
                const poleKey = `${serviceName.toLowerCase()}:${poleName.toLowerCase()}`
                poleId = refs.poleMap.get(poleKey) || refs.poleMap.get(poleName.toLowerCase()) || null
              } else {
                poleId = refs.poleMap.get(mappedRow.pole.toLowerCase()) || null
              }
            }

            // Résoudre Type et Domaine (OBLIGATOIRES)
            let typeId = null
            let domainId = null
            if (mappedRow.typeName) {
              typeId = refs.typeMap.get(mappedRow.typeName.toLowerCase()) || null
            }
            if (mappedRow.domainName) {
              domainId = refs.domainMap.get(mappedRow.domainName.toLowerCase()) || null
            }

            // Vérifier que Type et Domaine sont trouvés
            if (!typeId) {
              errors.push(`Ligne ${i + 2}: Type "${mappedRow.typeName || 'vide'}" introuvable dans votre configuration`)
              continue
            }
            if (!domainId) {
              errors.push(`Ligne ${i + 2}: Domaine "${mappedRow.domainName || 'vide'}" introuvable dans votre configuration`)
              continue
            }

            // Valeurs par défaut
            if (!mappedRow.nature) mappedRow.nature = 'Fonctionnement'

            // Créer la ligne budgétaire
            const budgetLine = await prisma.forecastBudgetLine.create({
              data: {
                label: mappedRow.name,
                year: parseInt(mappedRow.year),
                typeId,
                domainId,
                nature: mappedRow.nature,
                accountingCode: mappedRow.accountingCode || null,
                budget: parseFloat(mappedRow.amount),
                poleId,
                description: mappedRow.description || null,
                organizationId: session.user.organizationId!,
              }
            })

            currentBudgetLine = budgetLine
            currentBudgetLineId = budgetLine.id
            successCount++

          } else if (rowType === 'DEPENSE') {
            // Créer une dépense liée à la ligne budgétaire courante
            if (!currentBudgetLineId) {
              errors.push(`Ligne ${i + 2}: DEPENSE sans LIGNE budgétaire précédente`)
              continue
            }

            await prisma.forecastExpense.create({
              data: {
                forecastBudgetLineId: currentBudgetLineId,
                label: mappedRow.name,
                amount: parseFloat(mappedRow.amount),
                year: parseInt(mappedRow.year),
                description: mappedRow.description || null,
              }
            })

            successCount++

          } else {
            errors.push(`Ligne ${i + 2}: Catégorie "${mappedRow.category}" invalide (doit être LIGNE ou DEPENSE)`)
          }

        } catch (error: any) {
          errors.push(`Ligne ${i + 2}: ${error.message}`)
        }
      }
    }

    return NextResponse.json({
      id: Date.now().toString(),
      linesCount: successCount,
      errorsCount: errors.length,
      errors: errors.slice(0, 10), // Limiter à 10 erreurs pour la réponse
    })

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({
      error: 'Erreur lors de l\'import',
      details: error.message
    }, { status: 500 })
  }
}
