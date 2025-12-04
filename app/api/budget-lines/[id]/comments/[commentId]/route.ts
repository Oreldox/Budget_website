import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/budget-lines/[id]/comments/[commentId] - Supprimer un commentaire
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Vérifier que le commentaire existe et appartient à l'organisation
    const comment = await prisma.budgetLineComment.findFirst({
      where: {
        id: params.commentId,
        budgetLineId: params.id,
        organizationId: session.user.organizationId,
      },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 })
    }

    // Vérifier que l'utilisateur est l'auteur du commentaire ou un admin
    if (comment.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Vous ne pouvez supprimer que vos propres commentaires' },
        { status: 403 }
      )
    }

    await prisma.budgetLineComment.delete({
      where: { id: params.commentId },
    })

    return NextResponse.json({ message: 'Commentaire supprimé avec succès' })
  } catch (error) {
    console.error('[DELETE /api/budget-lines/[id]/comments/[commentId]]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du commentaire' },
      { status: 500 }
    )
  }
}
