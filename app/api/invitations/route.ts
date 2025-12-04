import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const invitationSchema = z.object({
  email: z.string().email('Email invalide'),
  role: z.enum(['admin', 'manager', 'viewer']),
  name: z.string().min(1, 'Le nom est requis').optional(),
  note: z.string().optional(),
})

// GET /api/invitations - Liste des invitations (retourne les utilisateurs de l'organisation)
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Récupérer tous les utilisateurs de l'organisation (comme des "invitations utilisées")
    const users = await prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    // Transformer en format "invitation"
    const invitations = users.map(user => ({
      id: user.id,
      code: `USER-${user.id.substring(0, 8).toUpperCase()}`,
      role: user.role,
      email: user.email,
      note: user.name,
      usedBy: user.email,
      usedAt: user.createdAt.toISOString(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      createdAt: user.createdAt.toISOString(),
    }))

    return NextResponse.json(invitations)
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/invitations - Créer une invitation
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Seuls les admins peuvent inviter
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Seuls les administrateurs peuvent inviter des utilisateurs' }, { status: 403 })
    }

    const body = await req.json()
    const data = invitationSchema.parse(body)

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà' }, { status: 400 })
    }

    // Créer l'utilisateur directement (invitation implicite)
    const userName = data.name || data.note || data.email.split('@')[0]

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: userName,
        role: data.role,
        organizationId: session.user.organizationId,
        // Pas de mot de passe pour l'instant, il sera défini à la première connexion
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        changes: JSON.stringify({ email: user.email, role: user.role }),
        organizationId: session.user.organizationId,
      },
    })

    // Retourner au format attendu par la page (comme une invitation)
    return NextResponse.json({
      id: user.id,
      code: `USER-${user.id.substring(0, 8).toUpperCase()}`, // Code fictif pour l'affichage
      role: user.role,
      email: user.email,
      note: userName,
      usedBy: user.email, // Déjà utilisé car créé directement
      usedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides', details: error.errors }, { status: 400 })
    }
    console.error('Error creating invitation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
