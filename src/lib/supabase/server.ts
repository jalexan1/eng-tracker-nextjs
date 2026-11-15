/**
 * @file src/lib/supabase/server.ts
 * @description Cliente Supabase para Server Components, Server Actions y Route Handlers.
 *
 * IMPORTANTE: Usar SOLO en contextos server-side (archivos con 'use server' o
 * componentes sin 'use client'). Para el cliente, usar client.ts.
 *
 * Maneja automáticamente:
 *   - Lectura/escritura de cookies para JWT
 *   - Refresco de sesión transparente
 *   - HttpOnly cookies (seguro contra XSS)
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll puede lanzar error en Server Components (read-only context)
            // Es seguro ignorarlo — el middleware maneja el refresco de sesión
          }
        },
      },
    }
  )
}
