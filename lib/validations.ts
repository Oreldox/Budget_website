import { z } from 'zod'

// Common schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Invoice query schema
export const invoiceQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  vendor: z.string().optional(),
  domain: z.string().optional(),
  nature: z.string().optional(),
  year: z.coerce.number().int().optional(),
  unpointedOnly: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

// Invoice create schema
export const invoiceBodySchema = z.object({
  number: z.string().min(1, 'Numéro requis'),
  lineNumber: z.string().optional(),
  contractId: z.string().optional(),
  vendor: z.string().min(1, 'Fournisseur requis'),
  supplierCode: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().positive('Montant doit être positif'),
  amountHT: z.number().optional(),
  dueDate: z.string().min(1, 'Date d\'échéance requise'),
  invoiceDate: z.string().min(1, 'Date de facture requise'),
  invoiceYear: z.number().int().optional(),
  paymentDate: z.string().optional(),
  status: z.string().min(1, 'Statut requis'),
  comment: z.string().optional(),
  domainId: z.string().min(1, 'Domaine requis'),
  typeId: z.string().min(1, 'Type requis'),
  nature: z.string().min(1, 'Nature requise'),
  budgetLineId: z.string().optional(),
  accountingCode: z.string().optional(),
  allocationCode: z.string().optional(),
  commandNumber: z.string().optional(),
  pointed: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

// Contract query schema
export const contractQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  type: z.string().optional(),
  vendor: z.string().optional(),
  search: z.string().optional(),
})

// Contract create schema
export const contractBodySchema = z.object({
  number: z.string().min(1, 'Numéro requis'),
  label: z.string().min(1, 'Libellé requis'),
  vendor: z.string().min(1, 'Fournisseur requis'),
  providerName: z.string().optional(),
  startDate: z.string().min(1, 'Date de début requise'),
  endDate: z.string().min(1, 'Date de fin requise'),
  amount: z.number().positive('Montant doit être positif'),
  typeId: z.string().min(1, 'Type requis'),
  domainId: z.string().min(1, 'Domaine requis'),
  budgetLineId: z.string().optional(),
  status: z.string().min(1, 'Statut requis'),
  description: z.string().optional(),
  constraints: z.string().optional(),
  accountingCode: z.string().optional(),
  allocationCode: z.string().optional(),
  yearlyAmounts: z.array(z.object({
    year: z.number().int(),
    amount: z.number(),
  })).optional(),
})

// Budget line query schema
export const budgetLineQuerySchema = paginationSchema.extend({
  domain: z.string().optional(),
  type: z.string().optional(),
})

// Budget line create schema
export const budgetLineBodySchema = z.object({
  typeId: z.string().min(1, 'Type requis'),
  domainId: z.string().min(1, 'Domaine requis'),
  label: z.string().min(1, 'Libellé requis'),
  description: z.string().optional(),
  budget: z.number().min(0, 'Budget doit être positif ou nul'),
  engineered: z.number().optional(),
  invoiced: z.number().optional(),
  accountingCode: z.string().optional(),
})

// Vendor schemas
export const vendorCreateSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  code: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  siret: z.string().optional(),
  contactName: z.string().optional(),
  notes: z.string().optional(),
})

export const vendorUpdateSchema = vendorCreateSchema.partial()

// Invoice update schema (partial of body schema)
export const invoiceUpdateSchema = invoiceBodySchema.partial()

// Contract update schema (partial of body schema)
export const contractUpdateSchema = contractBodySchema.partial()

// Budget line update schema (partial of body schema)
export const budgetLineUpdateSchema = budgetLineBodySchema.partial()

// User update schema
export const userUpdateSchema = z.object({
  name: z.string().min(2, 'Nom trop court').optional(),
  email: z.string().email('Email invalide').optional(),
  password: z.string().min(8, 'Mot de passe trop court (min 8 caractères)').optional(),
  role: z.enum(['admin', 'manager', 'viewer']).optional(),
  isActive: z.boolean().optional(),
})

// Organization update schema
export const organizationUpdateSchema = z.object({
  name: z.string().min(1, 'Nom requis').optional(),
  description: z.string().optional(),
  settings: z.record(z.any()).optional(),
})

// Invitation update schema
export const invitationUpdateSchema = z.object({
  note: z.string().optional(),
})

// Auth schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Nom trop court'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe trop court (min 8 caractères)'),
  role: z.enum(['admin', 'user', 'viewer']).default('user'),
})

// Search schema
export const searchSchema = z.object({
  q: z.string().min(1, 'Recherche requise'),
  type: z.enum(['all', 'invoices', 'contracts', 'budget-lines']).default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

// Helper function to validate request body
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { data, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { data: null, error: messages }
    }
    return { data: null, error: 'Données invalides' }
  }
}

// Helper function to validate query params
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { data: T; error: null } | { data: null; error: string } {
  try {
    const params: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      params[key] = value
    })
    const data = schema.parse(params)
    return { data, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { data: null, error: messages }
    }
    return { data: null, error: 'Paramètres invalides' }
  }
}
