import type { Metadata } from 'next'
import { createServerClient } from '@lib/supabase/server'
import { redirect }           from 'next/navigation'
import { getEpisodesAction }  from '@english/bbc/actions/bbc.actions'

export const metadata: Metadata = { title: 'BBC Learning English' }

export default async function BbcPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const result = await getEpisodesAction()

  if (!result.success) {
    return (
      <div className="card max-w-lg mx-auto text-center py-12">
        <p className="text-red-500">{result.error}</p>
      </div>
    )
  }

  const episodes = result.data

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">BBC Learning English</h1>
        <p className="text-sm text-gray-500 mt-1">
          Episodios disponibles: {episodes.length}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {episodes.map(ep => {
          const statusColor = {
            not_started: 'bg-gray-100 text-gray-600',
            in_progress: 'bg-english/10 text-english',
            completed:   'bg-green-100 text-green-700',
          }[ep.progress?.status ?? 'not_started']

          return (
            <div key={ep.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-medium text-english uppercase tracking-wide">
                    {ep.series}
                  </span>
                  <h3 className="mt-1 font-semibold text-gray-900 leading-snug">{ep.title}</h3>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                  {ep.cefrLevel}
                </span>
              </div>

              {ep.progress && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Comprensión</span>
                    <span>{ep.progress.comprehension ?? 0}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-english transition-all"
                      style={{ width: `${ep.progress.comprehension ?? 0}%` }}
                    />
                  </div>
                </div>
              )}

              {ep.audioUrl && (
                <a
                  href={ep.audioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center text-xs text-english hover:underline"
                >
                  🎧 Escuchar episodio
                </a>
              )}
            </div>
          )
        })}
      </div>

      {episodes.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-400">No hay episodios aún. Corre el seed SQL.</p>
        </div>
      )}
    </div>
  )
}
