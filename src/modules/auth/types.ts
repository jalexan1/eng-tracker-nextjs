/**
 * @file src/modules/auth/types.ts
 * @description Tipos del módulo de autenticación.
 */
import type { User, Session } from '@supabase/supabase-js'

export type { User, Session }

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export interface OAuthProvider {
  name: 'google'
  label: string
  icon: string
}
