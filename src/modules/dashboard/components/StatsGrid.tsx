'use client'
/**
 * @file src/modules/dashboard/components/StatsGrid.tsx
 * @description Grid de métricas — inglés (indigo) y español (amber), aislados visualmente.
 */
import type { ModuleStats } from '../services/DashboardService'

interface Props {
  english: ModuleStats
  spanish: ModuleStats
}

function StatCard({
  label, value, sub, color,
}: {
  label: string
  value: number | string
  sub?:  string
  color: 'english' | 'spanish'
}) {
  const accent = color === 'english'
    ? 'border-english bg-english/5 text-english'
    : 'border-spanish bg-spanish/5 text-spanish'

  return (
    <div className={`rounded-xl border-2 ${accent} p-4`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color === 'english' ? 'text-english' : 'text-spanish'}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export function StatsGrid({ english: eng, spanish: spa }: Props) {
  return (
    <div className="space-y-6">
      {/* Inglés */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-english uppercase tracking-widest">
          🇬🇧 English
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Mazos"      value={eng.totalDecks}    color="english" />
          <StatCard label="Tarjetas"   value={eng.totalCards}    color="english" />
          <StatCard label="Pendientes" value={eng.dueCards}      color="english" />
          <StatCard label="Racha"      value={`${eng.streakDays}d`} sub="días consecutivos" color="english" />
        </div>
      </div>

      {/* Español */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-spanish uppercase tracking-widest">
          🇪🇸 Español
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Mazos"      value={spa.totalDecks}    color="spanish" />
          <StatCard label="Tarjetas"   value={spa.totalCards}    color="spanish" />
          <StatCard label="Pendientes" value={spa.dueCards}      color="spanish" />
          <StatCard label="Racha"      value={`${spa.streakDays}d`} sub="días consecutivos" color="spanish" />
        </div>
      </div>
    </div>
  )
}
