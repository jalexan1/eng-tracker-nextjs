/**
 * @file src/lib/supabase/client.ts
 * @description Cliente Supabase para Client Components ('use client').
 *
 * Singleton pattern — una sola instancia por browser tab.
 * Para server-side, usar server.ts.
 */
'use client'

import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}
