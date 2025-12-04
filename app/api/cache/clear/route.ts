import { NextResponse } from 'next/server'
import { clearAllCache } from '@/lib/cache-utils'

export async function POST() {
  try {
    clearAllCache()
    console.log('✅ Cache vidé avec succès')

    return NextResponse.json({
      success: true,
      message: 'Cache vidé avec succès'
    })
  } catch (error) {
    console.error('❌ Erreur lors du vidage du cache:', error)
    return NextResponse.json(
      { error: 'Erreur lors du vidage du cache' },
      { status: 500 }
    )
  }
}
