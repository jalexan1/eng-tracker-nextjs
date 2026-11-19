/**
 * @file src/modules/auth/components/SignupForm.tsx
 * @description Formulario de registro — nombre, email, contraseña.
 */
'use client'

import { useState, useTransition } from 'react'
import { signupAction } from '../actions/auth.actions'

export function SignupForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError]             = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess]         = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setFieldErrors({})
    setSuccess(null)

    startTransition(async () => {
      const result = await signupAction(formData)
      if (result.success) {
        setSuccess(result.message ?? 'Cuenta creada. Revisa tu correo para confirmar.')
      } else {
        setError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
      }
    })
  }

  if (success) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl">
          <div className="text-4xl mb-3">✉️</div>
          <h2 className="text-xl font-semibold text-white mb-2">¡Cuenta creada!</h2>
          <p className="text-gray-400 text-sm">{success}</p>
        </div>
        <a
          href="/login"
          className="block w-full px-4 py-3 bg-english hover:bg-english-dark text-white font-semibold rounded-lg transition-colors text-center"
        >
          Ir a iniciar sesión
        </a>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Crear cuenta</h1>
        <p className="text-gray-400 text-sm">Empieza a aprender idiomas hoy</p>
      </div>

      {/* Form */}
      <form action={handleSubmit} className="space-y-4">
        {/* Full name */}
        <div className="space-y-1">
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-300">
            Nombre completo
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-english/50 focus:border-english/50 transition"
            placeholder="Juan Pérez"
          />
          {fieldErrors.fullName && (
            <p className="text-xs text-red-400">{fieldErrors.fullName[0]}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-english/50 focus:border-english/50 transition"
            placeholder="tu@correo.com"
          />
          {fieldErrors.email && (
            <p className="text-xs text-red-400">{fieldErrors.email[0]}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium text-gray-300">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-english/50 focus:border-english/50 transition"
            placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
          />
          {fieldErrors.password && (
            <p className="text-xs text-red-400">{fieldErrors.password[0]}</p>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-english/50 focus:border-english/50 transition"
            placeholder="Repite tu contraseña"
          />
          {fieldErrors.confirmPassword && (
            <p className="text-xs text-red-400">{fieldErrors.confirmPassword[0]}</p>
          )}
        </div>

        {/* Error global */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full px-4 py-3 bg-english hover:bg-english-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        ¿Ya tienes cuenta?{' '}
        <a href="/login" className="text-english hover:text-english-light transition-colors">
          Inicia sesión
        </a>
      </p>
    </div>
  )
}
