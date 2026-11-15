'use client'
/**
 * @file src/modules/dashboard/components/WeeklyChart.tsx
 * @description Gráfica de barras apiladas — 7 días, inglés + español.
 * Sin dependencia de recharts u otras libs — SVG puro + Tailwind.
 */
import type { DailyProgressPoint } from '../services/DashboardService'

interface Props {
  data: DailyProgressPoint[]
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function WeeklyChart({ data }: Props) {
  const maxVal = Math.max(...data.map(d => d.englishCards + d.spanishCards), 1)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">Revisiones últimos 7 días</h3>

      {/* Leyenda */}
      <div className="mb-4 flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-english" />
          Inglés
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-spanish" />
          Español
        </span>
      </div>

      {/* Barras */}
      <div className="flex h-32 items-end gap-2">
        {data.map((day) => {
          const dayLabel = DAY_LABELS[new Date(day.date + 'T12:00:00').getDay()]
          const total    = day.englishCards + day.spanishCards
          const engPct   = total ? (day.englishCards / maxVal) * 100 : 0
          const spanPct  = total ? (day.spanishCards / maxVal) * 100 : 0

          return (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="relative flex w-full flex-col-reverse" style={{ height: '7rem' }}>
                {/* Spanish (arriba) */}
                {spanPct > 0 && (
                  <div
                    className="w-full rounded-t bg-spanish transition-all"
                    style={{ height: `${spanPct}%` }}
                    title={`${day.spanishCards} español`}
                  />
                )}
                {/* English (abajo) */}
                {engPct > 0 && (
                  <div
                    className="w-full bg-english transition-all"
                    style={{ height: `${engPct}%` }}
                    title={`${day.englishCards} inglés`}
                  />
                )}
                {/* Sin datos */}
                {total === 0 && (
                  <div className="w-full rounded bg-gray-100" style={{ height: '4px' }} />
                )}
              </div>
              <span className="text-[10px] text-gray-400">{dayLabel}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
