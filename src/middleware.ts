import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const { data: { user } } = await supabase.auth.getUser()

  // Allow access to the root page and intro video
  if (req.nextUrl.pathname === '/' || req.nextUrl.pathname === '/intro.mp4') {
    return res
  }

  // If user is not signed in and the current path is not /sign-in or /sign-up,
  // redirect the user to /sign-in
  if (!user && !['/sign-in', '/sign-up'].includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  // If user is signed in and the current path is /sign-in or /sign-up,
  // redirect the user to /dashboard
  if (user && ['/sign-in', '/sign-up'].includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
} 