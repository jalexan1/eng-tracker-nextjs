/**
 * @file src/modules/auth/actions/auth.actions.ts
 * @description Server Actions para autenticación con Supabase.
 */
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@lib/supabase/server'
import { loginSchema, signupSchema } from '@lib/validations/auth'
import { fail, ok, type ActionResult } from '@shared/types'

// ── Login con email/password ───────────────────────────────────
export async function loginAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    email:    formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return fail(
      error.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos'
        : 'Error al iniciar sesión. Intenta de nuevo.'
    )
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// ── Registro con email/password ────────────────────────────────
export async function signupAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    fullName:        formData.get('fullName'),
    email:           formData.get('email'),
    password:        formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  }

  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signUp({
    email:    parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
    },
  })

  if (error) {
    return fail('Error al crear la cuenta. Intenta de nuevo.')
  }

  return ok(undefined, 'Cuenta creada. Revisa tu correo para confirmar.')
}

// ── Login con Google OAuth ─────────────────────────────────────
export async function loginWithGoogleAction(): Promise<ActionResult<{ url: string }>> {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error || !data.url) {
    return fail('Error al conectar con Google.')
  }

  return ok({ url: data.url })
}

// ── Logout ─────────────────────────────────────────────────────
export async function logoutAction(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
