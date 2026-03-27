// =============================================================================
// Next.js Middleware – Authentication guard
//
// MIGRATION NOTE (Next.js 16+):
// The middleware API is deprecated starting in Next.js 16. When migrating,
// replace this file with the new `instrumentation.ts` hooks or use the
// built-in `next.config.ts` `rewrites`/`redirects` for simple cases.
// For auth guards, consider using a Server Component layout wrapper or
// the new `unstable_after` / route handler approach.
// See: https://nextjs.org/docs/app/building-your-application/upgrading
//
// This middleware still works in Next.js 16 via the compatibility layer,
// so no immediate migration is required.
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Paths that should never require authentication
const PUBLIC_PATHS = ['/login', '/api/']

// Paths allowed when must_change_password is true (avoid redirect loops)
const PASSWORD_CHANGE_ALLOWED_PATHS = ['/change-password']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip auth check for public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // In mock mode, allow all routes without authentication
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (useMock || !supabaseUrl || supabaseUrl === '' || supabaseUrl.includes('placeholder')) {
    return NextResponse.next()
  }

  // Create a response that we can modify (to refresh cookies if needed)
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update request cookies for downstream server components
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          // Re-create response with updated request cookies
          supabaseResponse = NextResponse.next({
            request: { headers: request.headers },
          })
          // Also set cookies on the response so they persist in the browser
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Do NOT use getSession() here - it reads from storage without
  // verifying the JWT. getUser() sends a request to the Supabase Auth server
  // to validate the token.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Redirect to login if no valid session
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ---------------------------------------------------------------------------
  // B-003: Enforce password change – prevent bypass via direct URL access
  // ---------------------------------------------------------------------------
  const isOnAllowedPath = PASSWORD_CHANGE_ALLOWED_PATHS.some((p) =>
    pathname.startsWith(p)
  )

  if (!isOnAllowedPath) {
    const { data: profile } = await supabase
      .from('users')
      .select('must_change_password')
      .eq('id', user.id)
      .single()

    if (profile?.must_change_password) {
      const changePasswordUrl = new URL('/change-password', request.url)
      return NextResponse.redirect(changePasswordUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login, change-password (auth pages)
     * - api/auth (auth API routes)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|login|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
