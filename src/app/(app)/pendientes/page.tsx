'use client'

import { useEffect, useState } from 'react'

interface PendingFeature {
  id:          string
  title:       string
  description: string | null
  context:     string | null
  status:      string
  createdAt:   string
}

const STATUS_LABEL: Record<string, string> = {
  pending:    '⏳ Pendiente',
  in_progress: '🔄 En progreso',
  done:       '✅ Listo',
  cancelled:  '❌ Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  pending:    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
  in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  done:       'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  cancelled:  'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
}

export default function PendientesPage() {
  const [items,   setItems]   = useState<PendingFeature[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pendientes')
      .then((r) => r.json())
      .then((d: { items?: PendingFeature[] }) => { setItems(d.items ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pendientes</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Videos y funcionalidades que no pudieron procesarse automáticamente.
      </p>

      {loading && <p className="text-sm text-gray-400">Cargando…</p>}

      {!loading && items.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-sm">No hay pendientes. ¡Todo en orden!</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white text-sm">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {item.description}
                  </p>
                )}
                {item.context && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic line-clamp-2">
                    {item.context}
                  </p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {formatDate(item.createdAt)}
                </p>
              </div>
              <span className={`shrink-0 text-xs font-medium rounded-full px-2.5 py-1 ${STATUS_COLOR[item.status] ?? STATUS_COLOR['pending']}`}>
                {STATUS_LABEL[item.status] ?? item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
