/**
 * @file src/shared/components/Sidebar.tsx
 * @description Sidebar de navegación — links a todas las apps de la plataforma.
 *   Soporta items colapsables para sub-secciones (ej: Verbos Irregulares).
 */
'use client'

import Link      from 'next/link'
import { usePathname } from 'next/navigation'
import { useState }    from 'react'
import { logoutAction } from '@modules/auth'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface NavLeaf {
  kind?: 'leaf'
  href: string
  label: string
  icon: string
  disabled?: boolean
  badge?: string
}

interface NavGroup {
  kind: 'group'
  key: string
  label: string
  icon: string
  disabled?: boolean
  children: NavLeaf[]
}

type NavItem = NavLeaf | NavGroup

interface NavSection {
  section: string
  color?: string
  items: NavItem[]
}

// ── Datos ────────────────────────────────────────────────────────────────────

const navSections: NavSection[] = [
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
      {
        kind:  'group',
        key:   'irregular-verbs',
        label: 'Verbos Irregulares',
        icon:  '📚',
        children: [
          { href: '/english/irregular-verbs',       label: 'Hub principal',  icon: '🏠' },
          { href: '/english/irregular-verbs/video', label: 'Ver Video Rap',  icon: '🎬' },
          { href: '/english/irregular-verbs/practice', label: 'Flip Cards', icon: '🃏', disabled: true, badge: 'Soon' },
          { href: '/english/irregular-verbs/groups',   label: 'Grupos Sonoros', icon: '🔊', disabled: true, badge: 'Soon' },
          { href: '/english/irregular-verbs/progress', label: 'Mi Progreso',    icon: '📊', disabled: true, badge: 'Soon' },
        ],
      },
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

// ── Componente ───────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname()

  // grupos colapsados/expandidos. Se expande auto si la ruta está dentro.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    navSections.forEach(sec => {
      sec.items.forEach(item => {
        if (item.kind === 'group') {
          const isInside = item.children.some(c => pathname.startsWith(c.href))
          init[item.key] = isInside
        }
      })
    })
    return init
  })

  function toggleGroup(key: string) {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

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
        {navSections.map((sec) => (
          <div key={sec.section}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${sec.color ?? 'text-gray-500'}`}>
              {sec.section}
            </p>
            <ul className="space-y-0.5">
              {sec.items.map((item) => {

                // ── Item colapsable (grupo con hijos) ──
                if (item.kind === 'group') {
                  const open       = openGroups[item.key] ?? false
                  const groupActive = item.children.some(c => isActive(c.href))

                  return (
                    <li key={item.key}>
                      {/* Cabecera del grupo */}
                      <button
                        onClick={() => toggleGroup(item.key)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          groupActive
                            ? 'bg-english/10 text-english'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span className="flex-1 text-left">{item.label}</span>
                        <span
                          className={`text-xs transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                        >
                          ›
                        </span>
                      </button>

                      {/* Hijos (expandibles) */}
                      {open && (
                        <ul className="mt-0.5 ml-4 pl-3 border-l border-border space-y-0.5">
                          {item.children.map(child => (
                            <li key={child.href}>
                              {child.disabled ? (
                                <span className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-gray-600 cursor-not-allowed text-xs">
                                  <span className="grayscale opacity-50">{child.icon}</span>
                                  <span>{child.label}</span>
                                  {child.badge && (
                                    <span className="ml-auto text-[10px] bg-gray-800 text-gray-600 px-1.5 py-0.5 rounded-full">
                                      {child.badge}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <Link
                                  href={child.href as never}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                                    isActive(child.href)
                                      ? 'bg-english/20 text-english'
                                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                  }`}
                                >
                                  <span>{child.icon}</span>
                                  <span>{child.label}</span>
                                </Link>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                }

                // ── Item simple ──
                const leaf = item as NavLeaf
                if (leaf.disabled) {
                  return (
                    <li key={leaf.href}>
                      <span className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 cursor-not-allowed text-sm">
                        <span>{leaf.icon}</span>
                        <span>{leaf.label}</span>
                        <span className="ml-auto text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                          Soon
                        </span>
                      </span>
                    </li>
                  )
                }

                return (
                  <li key={leaf.href}>
                    <Link
                      href={leaf.href as never}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive(leaf.href)
                          ? 'bg-english/20 text-english'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>{leaf.icon}</span>
                      <span>{leaf.label}</span>
                    </Link>
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
