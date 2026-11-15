import type { Metadata } from 'next'
import { createServerClient } from '@lib/supabase/server'
import { redirect }           from 'next/navigation'
import { decksRepository }    from '@english/decks/services/DecksRepository'
import Link                   from 'next/link'

export const metadata: Metadata = { title: 'Mazos de inglés' }

export default async function DecksPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const decks = await decksRepository.findByUserId(user.id)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mazos · Inglés</h1>
          <p className="text-sm text-gray-500 mt-1">{decks.length} mazos activos</p>
        </div>
        {/* TODO: botón "Nuevo mazo" con modal o drawer */}
        <button className="btn-primary">+ Nuevo mazo</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map(deck => (
          <Link
            key={deck.id}
            href={`/english/decks/${deck.id}/review`}
            className="card hover:shadow-md transition-shadow cursor-pointer block"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{deck.coverEmoji ?? '📚'}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{deck.name}</h3>
                {deck.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{deck.description}</p>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>{deck.totalCards} tarjetas</span>
              {(deck.dueCards ?? 0) > 0 ? (
                <span className="font-semibold text-english">{deck.dueCards} pendientes</span>
              ) : (
                <span className="text-green-600">✓ Al día</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {decks.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-medium text-gray-700">No tienes mazos aún</p>
          <p className="text-sm text-gray-400 mt-1">Crea tu primer mazo para empezar a estudiar</p>
        </div>
      )}
    </div>
  )
}
