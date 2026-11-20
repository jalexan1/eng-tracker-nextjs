/**
 * @file src/shared/components/Sidebar.tsx
 * @description Sidebar de navegación — links a todas las apps de la plataforma.
 */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@modules/auth'

const navItems = [
  {
    section: 'General',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    section: 'App Inglés',
    color: 'text-english',
    items: [
      { href: '/english/bbc',   label: 'BBC Learning', icon: '📻' },
      { href: '/english/decks', label: 'Flashcards',   icon: '🗂️' },
    ],
  },
  {
    section: 'App Español',
    color: 'text-spanish',
    items: [
      { href: '/spanish', label: 'Próximamente', icon: '🇪🇸', disabled: true },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 h-screen bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-english to-primary flex items-center justify-center text-white font-bold text-sm">
            L
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">LangTracker</h2>
            <p className="text-gray-500 text-xs">Tu plataforma de idiomas</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navItems.map((section) => (
          <div key={section.section}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${section.color ?? 'text-gray-500'}`}>
              {section.section}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <li key={item.href}>
                    {'disabled' in item && item.disabled ? (
                      <span className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 cursor-not-allowed text-sm">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                        <span className="ml-auto text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                          Soon
                        </span>
                      </span>
                    ) : (
                      <Link
                        href={item.href as never}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-english/20 text-english'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <span>🚪</span>
            <span>Cerrar sesión</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
