import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Routes publiques
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/api/auth')

  // Vérifier si l'utilisateur est connecté via le cookie de session
  const sessionToken = request.cookies.get('authjs.session-token') ||
                       request.cookies.get('__Secure-authjs.session-token')

  const isLoggedIn = !!sessionToken

  // Rediriger vers /login si non connecté et route protégée
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Rediriger vers /cockpit si connecté et sur /login
  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/cockpit', request.url))
  }

  // Rediriger / vers /cockpit si connecté
  if (isLoggedIn && pathname === '/') {
    return NextResponse.redirect(new URL('/cockpit', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
