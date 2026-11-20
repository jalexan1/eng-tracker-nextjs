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
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
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
