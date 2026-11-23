'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { signOut } from '@/modules/auth/actions'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface NavLeaf {
  kind?:     'leaf'
  href:      string
  label:     string
  icon:      string
  disabled?: boolean
  badge?:    string
}

interface NavGroup {
  kind:     'group'
  key:      string
  label:    string
  icon:     string
  children: NavLeaf[]
}

type NavItem = NavLeaf | NavGroup

interface NavSection {
  title: string
  items: NavItem[]
}

// ─── Navegación ───────────────────────────────────────────────────────────────
const NAV: NavSection[] = [
  {
    title: 'General',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    title: 'App Inglés',
    items: [
      { href: '/english/bbc', label: 'BBC Learning',  icon: '📺' },
      { href: '/english/decks',        label: 'Flashcards',    icon: '🃏' },
      {
        kind:  'group',
        key:   'irregular-verbs',
        label: 'Verbos Irregulares',
        icon:  '📚',
        children: [
          { href: '/english/irregular-verbs',              label: 'Hub principal',   icon: '🏠' },
          { href: '/english/irregular-verbs/video',        label: 'Ver Video Rap',   icon: '🎬' },
          { href: '/english/irregular-verbs/practice',     label: 'Flip Cards',      icon: '🃏', disabled: true, badge: 'Soon' },
          { href: '/english/irregular-verbs/groups',       label: 'Grupos Sonoros',  icon: '🔊', disabled: true, badge: 'Soon' },
          { href: '/english/irregular-verbs/progress',     label: 'Mi Progreso',     icon: '📈', disabled: true, badge: 'Soon' },
          { href: '/english/irregular-verbs/import-video', label: 'Importar Video',  icon: '🎥', disabled: true, badge: 'Soon' },
          { href: '/english/verbs/bulk-upload',            label: 'Cargar Verbos',   icon: '📥' },
        ],
      },
      { href: '/english/ai', label: 'Asistente IA', icon: '🤖' },
    ],
  },
  {
    title: 'App Español',
    items: [
      { href: '/spanish', label: 'Próximamente', icon: '🇪🇸', disabled: true, badge: 'Soon' },
    ],
  },
]

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function LeafItem({ item, active }: { item: NavLeaf; active: boolean }) {
  if (item.disabled) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 cursor-not-allowed select-none">
        <span className="text-sm">{item.icon}</span>
        <span className="text-sm flex-1">{item.label}</span>
        {item.badge && (
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-500 rounded-full font-medium">
            {item.badge}
          </span>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href as never}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        active
          ? 'bg-indigo-600/20 text-indigo-300 font-medium'
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <span className="text-sm">{item.icon}</span>
      <span className="text-sm flex-1">{item.label}</span>
      {item.badge && (
        <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full font-medium">
          {item.badge}
        </span>
      )}
    </Link>
  )
}

function GroupItem({
  group,
  pathname,
  open,
  onToggle,
}: {
  group:    NavGroup
  pathname: string
  open:     boolean
  onToggle: () => void
}) {
  const isChildActive = group.children.some((c) => pathname.startsWith(c.href))

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isChildActive
            ? 'text-indigo-300 bg-indigo-600/10'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }`}
      >
        <span className="text-sm">{group.icon}</span>
        <span className="text-sm flex-1 text-left">{group.label}</span>
        <span
          className="text-gray-500 text-xs transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ›
        </span>
      </button>

      {open && (
        <div className="ml-4 pl-3 border-l border-border mt-0.5 space-y-0.5">
          {group.children.map((child) => (
            <LeafItem
              key={child.href}
              item={child}
              active={pathname === child.href || pathname.startsWith(child.href + '/')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar principal ────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname()

  // Inicializa grupos abiertos si la ruta actual está dentro de ellos
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    NAV.forEach((section) =>
      section.items.forEach((item) => {
        if (item.kind === 'group') {
          const active = item.children.some((c) => pathname.startsWith(c.href))
          if (active) init[item.key] = true
        }
      }),
    )
    return init
  })

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <aside className="w-56 bg-surface border-r border-border flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <span className="text-lg font-bold text-white">L</span>
        <span className="text-sm font-semibold text-white ml-1">LangTracker</span>
        <p className="text-[10px] text-gray-500 mt-0.5">Tu plataforma de idiomas</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                if (item.kind === 'group') {
                  return (
                    <GroupItem
                      key={item.key}
                      group={item}
                      pathname={pathname}
                      open={!!openGroups[item.key]}
                      onToggle={() => toggleGroup(item.key)}
                    />
                  )
                }
                const leaf = item as NavLeaf
                return (
                  <LeafItem
                    key={leaf.href}
                    item={leaf}
                    active={pathname === leaf.href || pathname.startsWith(leaf.href + '/')}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Cerrar sesión */}
      <div className="px-2 py-3 border-t border-border">
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:bg-white/5 hover:text-white transition-colors text-sm"
          >
            <span>🚪</span> Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  )
}
