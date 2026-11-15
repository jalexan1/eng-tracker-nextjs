'use client'
/**
 * @file src/modules/dashboard/components/RecentActivity.tsx
 * @description Lista de actividad reciente cross-módulo (read-only, no cruza datos).
 */
interface ActivityItem {
  type:  'english_review' | 'spanish_review' | 'bbc_episode'
  label: string
  date:  Date
}

interface Props {
  items: ActivityItem[]
}

const TYPE_CONFIG = {
  english_review: { icon: '🇬🇧', color: 'text-english' },
  spanish_review: { icon: '🇪🇸', color: 'text-spanish' },
  bbc_episode:    { icon: '📻', color: 'text-blue-500' },
}

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60)   return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24)   return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export function RecentActivity({ items }: Props) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Actividad reciente</h3>
        <p className="text-sm text-gray-400 text-center py-6">
          Sin actividad todavía — ¡empieza a estudiar! 🚀
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">Actividad reciente</h3>
      <ul className="space-y-3">
        {items.map((item, i) => {
          const cfg = TYPE_CONFIG[item.type]
          return (
            <li key={i} className="flex items-center justify-between gap-3">
              <span className="text-lg">{cfg.icon}</span>
              <span className={`flex-1 text-sm ${cfg.color}`}>{item.label}</span>
              <span className="text-xs text-gray-400 shrink-0">{timeAgo(item.date)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
