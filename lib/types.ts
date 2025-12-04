export type BudgetTypeLabel = 'Logiciels' | 'Infrastructure' | 'Maintenance' | 'Télécom' | 'Divers'
export type BudgetDomain = 'Opérations' | 'Développement' | 'Support' | 'Innovation'
export type InvoiceNature = 'Investissement' | 'Fonctionnement'

export interface BudgetType {
  id: string
  name: BudgetTypeLabel
  color?: string
}

export interface BudgetStructureDomain {
  id: string
  typeId: string
  name: BudgetDomain
  description?: string
}

export interface YearlyBudget {
  year: number
  budget: number
  engineered: number
  invoiced: number
}

export interface BudgetLine {
  id: string
  typeId: string
  domainId: string
  label: string
  description?: string
  budget: number
  engineered: number
  invoiced: number
  accountingCode?: string
  type?: BudgetType
  domain?: BudgetStructureDomain
  nature?: InvoiceNature
  yearlyBudgets?: YearlyBudget[]
}

export interface ContractYearAmount {
  year: number
  amount: number
}

export interface Contract {
  id: string
  number: string
  label: string
  vendor: string
  providerName?: string
  startDate: string
  endDate: string
  amount: number
  typeId: string
  domainId: string
  budgetLineId?: string
  status: 'Actif' | 'Expirant' | 'Expiré'
  description?: string
  constraints?: string
  accountingCode?: string
  allocationCode?: string
  yearlyAmounts: ContractYearAmount[]
  totalInvoiced?: number
  createdAt: string
  updatedAt: string
  type?: BudgetType
  domain?: BudgetStructureDomain
  budgetLine?: BudgetLine
}

export interface Invoice {
  id: string
  number: string
  lineNumber?: string
  contractId?: string
  vendor: string
  supplierCode?: string
  description: string
  amount: number
  amountHT?: number
  dueDate: string
  invoiceDate: string
  invoiceYear: number
  paymentDate?: string
  status: 'Payée' | 'En attente' | 'Retard'
  tags: string[]
  comment?: string
  domainId: string
  typeId: string
  nature: InvoiceNature
  budgetLineId?: string
  accountingCode?: string
  allocationCode?: string
  commandNumber?: string
  pointed?: boolean
  createdAt: string
  updatedAt: string
  type?: BudgetType
  domain?: BudgetStructureDomain
  budgetLine?: BudgetLine
  contract?: Contract
}

export interface BudgetSummary {
  totalBudget: number
  totalEngineered: number
  totalInvoiced: number
  remaining: number
  percentageUsed: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'CONFIRMED' | 'DELIVERED' | 'INVOICED' | 'CANCELLED'

export interface PurchaseOrder {
  id: string
  number: string
  vendor: string
  orderDate: string
  expectedDeliveryDate?: string
  amount: number
  description?: string
  status: PurchaseOrderStatus
  linkedForecastExpenseId?: string
  tags?: string[]
  attachments?: string[]
  organizationId: string
  createdAt: string
  updatedAt: string
  linkedForecastExpense?: {
    id: string
    label: string
    amount: number
    forecastBudgetLine: {
      label: string
      nature: string
    }
  }
}

export interface PurchaseOrdersFilter {
  page?: number
  pageSize?: number
  status?: PurchaseOrderStatus
  vendor?: string
  search?: string
  unlinked?: boolean
  sortBy?: 'amount' | 'orderDate' | 'number'
  sortOrder?: 'asc' | 'desc'
}

export interface ContractsFilter {
  page?: number
  pageSize?: number
  status?: Contract['status']
  type?: string
  domain?: BudgetDomain
  vendor?: string
  year?: number
  dateFrom?: string
  dateTo?: string
  amountMin?: number
  amountMax?: number
  sortBy?: 'amount' | 'startDate' | 'endDate' | 'label' | 'number'
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface InvoicesFilter {
  page?: number
  pageSize?: number
  status?: Invoice['status']
  type?: string
  vendor?: string
  domain?: BudgetDomain
  nature?: InvoiceNature
  dateFrom?: string
  dateTo?: string
  year?: number
  unpointedOnly?: boolean
  withoutContract?: boolean
  sortBy?: 'amount' | 'dueDate' | 'invoiceDate' | 'number'
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface BudgetLinesFilter {
  page?: number
  pageSize?: number
  domain?: BudgetDomain
  type?: BudgetTypeLabel
  sortBy?: 'budget' | 'engineered' | 'invoiced' | 'label'
  sortOrder?: 'asc' | 'desc'
  search?: string
  year?: string
  nature?: string
}

export interface ImportHistoryEntry {
  id: string
  filename: string
  type: 'invoices' | 'contracts'
  linesCount: number
  status: 'success' | 'partial' | 'error'
  importedAt: string
  errors?: string[]
}

export interface SearchResult {
  type: 'invoice' | 'contract' | 'budget-line'
  id: string
  title: string
  subtitle?: string
  amount?: number
  date?: string
  metadata: Record<string, any>
}
