import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // In mock mode, allow all routes without authentication
  if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') {
    return NextResponse.next()
  }

  // In production, check for Supabase session cookie
  const supabaseAuthToken = request.cookies.get('sb-access-token')?.value
    ?? request.cookies.getAll().find(c => c.name.includes('auth-token'))?.value

  if (!supabaseAuthToken) {
    // Redirect to login if no auth token found
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/(main)/:path*'],
}
