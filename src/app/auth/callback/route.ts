import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)

    if (user) {
      // Check if profile exists
      const { data: profile, error: profileCheckError } = await supabase
        .from('profiles')
        .select()
        .eq('id', user.id)
        .single()

      // If no profile exists and there was no error checking, create one
      if (!profile && !profileCheckError) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              full_name: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])

        if (profileError) {
          console.error('Error creating profile in callback:', profileError)
          // Redirect to error page or show error message
          return NextResponse.redirect(new URL('/error?message=profile-creation-failed', requestUrl.origin))
        }
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
} 