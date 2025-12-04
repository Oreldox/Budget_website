import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const joinSchema = z.object({
  inviteCode: z.string().min(1),
})

// POST /api/organizations/join - Rejoindre une organisation avec un code d'invitation
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { inviteCode } = joinSchema.parse(body)

    // Vérifier que l'utilisateur n'a pas déjà une organisation
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (user?.organizationId) {
      return NextResponse.json({ error: 'Vous appartenez déjà à une organisation' }, { status: 400 })
    }

    // Trouver l'organisation avec ce code d'invitation
    const organization = await prisma.organization.findUnique({
      where: { inviteCode },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Code d\'invitation invalide' }, { status: 404 })
    }

    // Ajouter l'utilisateur à l'organisation
    await prisma.user.update({
      where: { id: session.user.id },
      data: { organizationId: organization.id },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'User',
        entityId: session.user.id,
        changes: JSON.stringify({ joinedOrganization: organization.name }),
        organizationId: organization.id,
      },
    })

    return NextResponse.json({
      message: 'Vous avez rejoint l\'organisation avec succès',
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides', details: error.errors }, { status: 400 })
    }
    console.error('Error joining organization:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
