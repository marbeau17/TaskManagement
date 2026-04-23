// =============================================================================
// Next.js Proxy – Defense-in-depth authentication layer
//
// Primary auth checks (login redirect, must_change_password enforcement) live
// in the (main)/layout.tsx Server Component. This proxy is a defense-in-depth
// layer that:
//   1. Refreshes Supabase session cookies on every request
//   2. Catches unauthenticated requests before they reach server components
//
// Renamed from middleware.ts in Next.js 16 per the proxy file convention
// (B-028). API surface is identical; runtime defaults to Node.js.
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Paths that should never require authentication
const PUBLIC_PATHS = ['/login', '/api/', '/form', '/book']

// Paths allowed when must_change_password is true (avoid redirect loops)
const PASSWORD_CHANGE_ALLOWED_PATHS = ['/change-password']

export async function proxy(request: NextRequest) {
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
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user ?? null
  } catch (authError) {
    console.error('Auth check failed:', authError)
    // On auth failure, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

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
