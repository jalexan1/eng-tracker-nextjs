import { NextResponse } from 'next/server'
import { createServerClient } from '@lib/supabase/server'

/**
 * OAuth2 callback — Supabase PKCE flow.
 * Supabase redirige aquí después de Google OAuth con ?code=...
 */
export async function GET(request: Request) {
  const url          = new URL(request.url)
  const code         = url.searchParams.get('code')
  const redirectTo   = url.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(redirectTo, url.origin))
    }
  }

  // Error — redirige a login con mensaje
  return NextResponse.redirect(new URL('/login?error=auth_callback', url.origin))
}
