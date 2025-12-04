/**
 * Client IPC pour communiquer avec Electron
 * Remplace les appels fetch() aux API routes
 */

// Vérifier si on est dans Electron
const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron

// Stockage du token de session
let sessionToken: string | null = null

// Charger le token depuis localStorage au démarrage
if (typeof window !== 'undefined') {
  sessionToken = localStorage.getItem('session-token')
}

/**
 * Sauvegarde le token de session
 */
export function setSessionToken(token: string | null) {
  sessionToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('session-token', token)
    } else {
      localStorage.removeItem('session-token')
    }
  }
}

/**
 * Récupère le token de session
 */
export function getSessionToken(): string | null {
  return sessionToken
}

/**
 * Wrapper pour appeler un handler IPC
 */
async function invokeIPC(channel: string, ...args: any[]) {
  if (!isElectron) {
    throw new Error('Not running in Electron environment')
  }

  try {
    const result = await (window as any).electron.invoke(channel, ...args)

    // Si erreur côté serveur
    if (result.error) {
      const error: any = new Error(result.error)
      error.status = result.status
      throw error
    }

    return result
  } catch (error: any) {
    console.error(`IPC call failed [${channel}]:`, error)
    throw error
  }
}

/**
 * Wrapper pour les appels API (IPC ou fetch selon l'environnement)
 */
async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Si on est dans Electron, utiliser IPC
  if (isElectron) {
    // Convertir l'endpoint en channel IPC
    // Ex: /api/budget-types -> budget:getTypes
    const channel = endpointToIPCChannel(endpoint, options.method || 'GET')

    let body = null
    if (options.body) {
      body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body
    }

    const result = await invokeIPC(channel, sessionToken, body)

    // Simuler une Response pour compatibilité
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      json: async () => result.data || result,
      text: async () => JSON.stringify(result.data || result),
    } as Response
  }

  // Sinon, utiliser fetch normal (mode dev avec Next.js)
  return fetch(endpoint, options)
}

/**
 * Convertit un endpoint REST en channel IPC
 */
function endpointToIPCChannel(endpoint: string, method: string): string {
  // Retirer /api/ du début
  const path = endpoint.replace('/api/', '')

  // Mapping des endpoints vers les channels IPC
  const mappings: Record<string, string> = {
    // Auth
    'auth/register': 'auth:register',
    'auth/login': 'auth:login',
    'auth/logout': 'auth:logout',
    'auth/session': 'auth:session',

    // Budget
    'budget-types': 'budget:getTypes',
    'budget-domains': 'budget:getDomains',
    'budget-lines': method === 'POST' ? 'budget:createLine' : 'budget:getLines',
  }

  // Chercher une correspondance
  for (const [key, value] of Object.entries(mappings)) {
    if (path.startsWith(key)) {
      // Gérer les paramètres de route (ex: /budget-lines/123)
      const parts = path.split('/')
      if (parts.length > key.split('/').length) {
        const id = parts[parts.length - 1]
        // C'est une opération sur un élément spécifique
        if (method === 'PATCH' || method === 'PUT') {
          return value.replace('get', 'update')
        } else if (method === 'DELETE') {
          return value.replace('get', 'delete')
        }
      }
      return value
    }
  }

  console.warn(`No IPC mapping found for: ${method} ${endpoint}`)
  return path.replace('/', ':')
}

// ======================
// API AUTH
// ======================

export const ipcAuth = {
  register: async (data: { name: string; email: string; password: string; invitationCode?: string }) => {
    if (isElectron) {
      const result = await invokeIPC('auth:register', data)
      if (result.token) {
        setSessionToken(result.token)
      }
      return result
    }
    // Fallback pour dev
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  login: async (data: { email: string; password: string }) => {
    if (isElectron) {
      const result = await invokeIPC('auth:login', data)
      if (result.token) {
        setSessionToken(result.token)
      }
      return result
    }
    // Fallback pour dev
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  logout: async () => {
    if (isElectron) {
      const result = await invokeIPC('auth:logout', sessionToken)
      setSessionToken(null)
      return result
    }
    // Fallback pour dev
    setSessionToken(null)
    return { success: true }
  },

  getSession: async () => {
    if (isElectron) {
      return await invokeIPC('auth:session', sessionToken)
    }
    // Fallback pour dev
    const res = await fetch('/api/auth/session')
    return res.json()
  },
}

// ======================
// API BUDGET
// ======================

export const ipcBudget = {
  getTypes: async () => {
    if (isElectron) {
      const result = await invokeIPC('budget:getTypes', sessionToken)
      return result.data
    }
    const res = await fetch('/api/budget-types')
    return res.json()
  },

  getDomains: async () => {
    if (isElectron) {
      const result = await invokeIPC('budget:getDomains', sessionToken)
      return result.data
    }
    const res = await fetch('/api/budget-domains')
    return res.json()
  },

  getLines: async (params?: any) => {
    if (isElectron) {
      const result = await invokeIPC('budget:getLines', sessionToken, params)
      return result.data
    }
    const query = new URLSearchParams(params).toString()
    const res = await fetch(`/api/budget-lines?${query}`)
    return res.json()
  },

  createLine: async (data: any) => {
    if (isElectron) {
      const result = await invokeIPC('budget:createLine', sessionToken, data)
      return result.data
    }
    const res = await fetch('/api/budget-lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  updateLine: async (id: string, data: any) => {
    if (isElectron) {
      const result = await invokeIPC('budget:updateLine', sessionToken, id, data)
      return result.data
    }
    const res = await fetch(`/api/budget-lines/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  deleteLine: async (id: string) => {
    if (isElectron) {
      return await invokeIPC('budget:deleteLine', sessionToken, id)
    }
    const res = await fetch(`/api/budget-lines/${id}`, {
      method: 'DELETE',
    })
    return res.json()
  },
}

// ======================
// API CONTRACTS
// ======================

export const ipcContracts = {
  getAll: async (params?: any) => {
    if (isElectron) {
      const result = await invokeIPC('contracts:getAll', sessionToken, params)
      return result.data
    }
    const query = new URLSearchParams(params).toString()
    const res = await fetch(`/api/contracts?${query}`)
    return res.json()
  },

  get: async (id: string) => {
    if (isElectron) {
      const result = await invokeIPC('contracts:get', sessionToken, id)
      return result.data
    }
    const res = await fetch(`/api/contracts/${id}`)
    return res.json()
  },

  create: async (data: any) => {
    if (isElectron) {
      const result = await invokeIPC('contracts:create', sessionToken, data)
      return result.data
    }
    const res = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  update: async (id: string, data: any) => {
    if (isElectron) {
      const result = await invokeIPC('contracts:update', sessionToken, id, data)
      return result.data
    }
    const res = await fetch(`/api/contracts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  delete: async (id: string) => {
    if (isElectron) {
      return await invokeIPC('contracts:delete', sessionToken, id)
    }
    const res = await fetch(`/api/contracts/${id}`, {
      method: 'DELETE',
    })
    return res.json()
  },
}

// ======================
// API INVOICES
// ======================

export const ipcInvoices = {
  getAll: async (params?: any) => {
    if (isElectron) {
      const result = await invokeIPC('invoices:getAll', sessionToken, params)
      return result.data
    }
    const query = new URLSearchParams(params).toString()
    const res = await fetch(`/api/invoices?${query}`)
    return res.json()
  },

  get: async (id: string) => {
    if (isElectron) {
      const result = await invokeIPC('invoices:get', sessionToken, id)
      return result.data
    }
    const res = await fetch(`/api/invoices/${id}`)
    return res.json()
  },

  create: async (data: any) => {
    if (isElectron) {
      const result = await invokeIPC('invoices:create', sessionToken, data)
      return result.data
    }
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  update: async (id: string, data: any) => {
    if (isElectron) {
      const result = await invokeIPC('invoices:update', sessionToken, id, data)
      return result.data
    }
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  delete: async (id: string) => {
    if (isElectron) {
      return await invokeIPC('invoices:delete', sessionToken, id)
    }
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'DELETE',
    })
    return res.json()
  },

  getStats: async (params?: any) => {
    if (isElectron) {
      const result = await invokeIPC('invoices:stats', sessionToken, params)
      return result.data
    }
    const query = new URLSearchParams(params).toString()
    const res = await fetch(`/api/invoices/stats?${query}`)
    return res.json()
  },
}

// ======================
// API ADMIN
// ======================

export const ipcAdmin = {
  // Users
  getUsers: async () => {
    if (isElectron) {
      const result = await invokeIPC('admin:getUsers', sessionToken)
      return result.data
    }
    const res = await fetch('/api/admin/users')
    return res.json()
  },

  createUser: async (data: any) => {
    if (isElectron) {
      const result = await invokeIPC('admin:createUser', sessionToken, data)
      return result.data
    }
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  updateUser: async (id: string, data: any) => {
    if (isElectron) {
      const result = await invokeIPC('admin:updateUser', sessionToken, id, data)
      return result.data
    }
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  deleteUser: async (id: string) => {
    if (isElectron) {
      return await invokeIPC('admin:deleteUser', sessionToken, id)
    }
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
    })
    return res.json()
  },

  // Organization
  getOrganization: async () => {
    if (isElectron) {
      const result = await invokeIPC('admin:getOrganization', sessionToken)
      return result.data
    }
    const res = await fetch('/api/admin/organization')
    return res.json()
  },

  updateOrganization: async (data: any) => {
    if (isElectron) {
      const result = await invokeIPC('admin:updateOrganization', sessionToken, data)
      return result.data
    }
    const res = await fetch('/api/admin/organization', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  // Invitations
  getInvitations: async () => {
    if (isElectron) {
      const result = await invokeIPC('admin:getInvitations', sessionToken)
      return result.data
    }
    const res = await fetch('/api/admin/invitations')
    return res.json()
  },

  createInvitation: async (data: any) => {
    if (isElectron) {
      const result = await invokeIPC('admin:createInvitation', sessionToken, data)
      return result.data
    }
    const res = await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  deleteInvitation: async (id: string) => {
    if (isElectron) {
      return await invokeIPC('admin:deleteInvitation', sessionToken, id)
    }
    const res = await fetch(`/api/admin/invitations/${id}`, {
      method: 'DELETE',
    })
    return res.json()
  },
}

// ======================
// API VENDORS
// ======================

export const ipcVendors = {
  getAll: async () => {
    if (isElectron) {
      const result = await invokeIPC('vendors:getAll', sessionToken)
      return result.data
    }
    const res = await fetch('/api/vendors')
    return res.json()
  },

  create: async (data: any) => {
    if (isElectron) {
      const result = await invokeIPC('vendors:create', sessionToken, data)
      return result.data
    }
    const res = await fetch('/api/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  update: async (id: string, data: any) => {
    if (isElectron) {
      const result = await invokeIPC('vendors:update', sessionToken, id, data)
      return result.data
    }
    const res = await fetch(`/api/vendors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  delete: async (id: string) => {
    if (isElectron) {
      return await invokeIPC('vendors:delete', sessionToken, id)
    }
    const res = await fetch(`/api/vendors/${id}`, {
      method: 'DELETE',
    })
    return res.json()
  },
}

// Export du client API complet
export const ipcClient = {
  auth: ipcAuth,
  budget: ipcBudget,
  contracts: ipcContracts,
  invoices: ipcInvoices,
  admin: ipcAdmin,
  vendors: ipcVendors,
}

// Export aussi la fonction apiCall pour usage général
export { apiCall, isElectron }
