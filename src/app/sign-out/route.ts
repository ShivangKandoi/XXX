import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  
  // Sign out the user
  await supabase.auth.signOut()
  
  // Redirect to sign-in page
  return NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
} 