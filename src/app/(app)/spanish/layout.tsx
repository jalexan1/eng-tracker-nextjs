import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'App Español' }

/**
 * Layout placeholder para el módulo Español.
 * Las páginas se implementan en la siguiente fase.
 */
export default function SpanishLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 rounded-lg border border-spanish/30 bg-spanish/5 px-4 py-3 text-sm text-amber-700">
        🚧 App Español — próximamente disponible
      </div>
      {children}
    </div>
  )
}
