import { prisma } from './prisma'

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

interface AuditLogData {
  userId?: string
  action: AuditAction
  entity: string
  entityId: string
  changes?: any
  organizationId?: string
}

export async function createAuditLog(data: AuditLogData) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        changes: data.changes ? JSON.stringify(data.changes) : null,
        organizationId: data.organizationId,
      },
    })
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Failed to create audit log:', error)
  }
}

export async function getAuditLogs(options: {
  entity?: string
  entityId?: string
  userId?: string
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}) {
  const where: any = {}

  if (options.entity) where.entity = options.entity
  if (options.entityId) where.entityId = options.entityId
  if (options.userId) where.userId = options.userId
  if (options.from || options.to) {
    where.createdAt = {}
    if (options.from) where.createdAt.gte = options.from
    if (options.to) where.createdAt.lte = options.to
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    logs: logs.map(log => ({
      ...log,
      changes: log.changes ? JSON.parse(log.changes) : null,
    })),
    total,
  }
}
