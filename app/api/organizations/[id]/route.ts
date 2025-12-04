import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateOrgSchema = z.object({
  name: z.string().min(1),
})

// PATCH /api/organizations/[id] - Modifier une organisation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const data = updateOrgSchema.parse(body)

    // Vérifier que l'organisation existe
    const existingOrg = await prisma.organization.findUnique({
      where: { id },
    })

    if (!existingOrg) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    // Si admin d'une org, vérifier qu'on modifie sa propre org
    if (session.user.organizationId && existingOrg.id !== session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: { name: data.name },
      include: {
        _count: {
          select: {
            users: true,
            invoices: true,
            contracts: true,
            budgetLines: true,
          },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'Organization',
        entityId: organization.id,
        changes: JSON.stringify({ name: data.name }),
        organizationId: organization.id,
      },
    })

    return NextResponse.json(organization)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides', details: error.errors }, { status: 400 })
    }
    console.error('Error updating organization:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/organizations/[id] - Supprimer une organisation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    // Seul un super admin peut supprimer une organisation
    if (!session?.user || session.user.role !== 'admin' || session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const existingOrg = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    })

    if (!existingOrg) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    if (existingOrg._count.users > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer une organisation avec des utilisateurs. Supprimez d\'abord tous les utilisateurs.' },
        { status: 400 }
      )
    }

    await prisma.organization.delete({
      where: { id },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entity: 'Organization',
        entityId: id,
        changes: JSON.stringify({ name: existingOrg.name, slug: existingOrg.slug }),
      },
    })

    return NextResponse.json({ message: 'Organisation supprimée avec succès' })
  } catch (error) {
    console.error('Error deleting organization:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET /api/organizations/[id]/invite-code - Obtenir le code d'invitation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: { inviteCode: true },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ inviteCode: organization.inviteCode })
  } catch (error) {
    console.error('Error fetching invite code:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
