/**
 * @file src/shared/components/Topbar.tsx
 * @description Barra superior con breadcrumb y avatar del usuario.
 */
'use client'

import { usePathname } from 'next/navigation'

const breadcrumbMap: Record<string, string> = {
  '/dashboard':          'Dashboard',
  '/english/bbc':        'BBC Learning English',
  '/english/decks':      'Mis Flashcards',
  '/spanish':            'App Español',
}

interface TopbarProps {
  userEmail?: string
  userAvatarUrl?: string
}

export function Topbar({ userEmail, userAvatarUrl }: TopbarProps) {
  const pathname = usePathname()

  // Buscar el título de la página actual
  const title = Object.entries(breadcrumbMap).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1] ?? 'Plataforma de Idiomas'

  const initials = userEmail
    ? userEmail.substring(0, 2).toUpperCase()
    : 'U'

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6">
      {/* Breadcrumb / Title */}
      <div>
        <h1 className="text-white font-semibold">{title}</h1>
        <p className="text-gray-500 text-xs">{new Date().toLocaleDateString('es-CO', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })}</p>
      </div>

      {/* User avatar */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm text-gray-300">{userEmail}</p>
        </div>
        {userAvatarUrl ? (
          <img
            src={userAvatarUrl}
            alt="Avatar"
            className="w-9 h-9 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-english/20 border border-english/30 flex items-center justify-center text-english text-sm font-bold">
            {initials}
          </div>
        )}
      </div>
    </header>
  )
}
