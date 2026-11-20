import type { Metadata } from 'next'
import { createServerClient } from '@lib/supabase/server'
import { redirect }           from 'next/navigation'
import { getDueCardsAction }  from '@english/decks/actions/decks.actions'
import { decksRepository }    from '@english/decks/services/DecksRepository'

export const metadata: Metadata = { title: 'Revisión' }

interface Props {
  params: { deckId: string }
}

export default async function ReviewPage({ params }: Props) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [deck, sessionResult] = await Promise.all([
    decksRepository.findById(params.deckId),
    getDueCardsAction(params.deckId),
  ])

  if (!deck) redirect('/english/decks')

  if (!sessionResult.success) {
    return (
      <div className="card max-w-lg mx-auto text-center py-12">
        <p className="text-red-500">{sessionResult.error}</p>
      </div>
    )
  }

  const session = sessionResult.data

  if (session.cards.length === 0) {
    return (
      <div className="card max-w-lg mx-auto text-center py-12">
        <p className="text-4xl mb-3">🎉</p>
        <h2 className="text-xl font-bold text-gray-900">¡Mazo al día!</h2>
        <p className="text-sm text-gray-500 mt-2">
          No hay tarjetas pendientes en <strong>{deck.title}</strong>.
        </p>
        <a href="/english/decks" className="btn-primary mt-6 inline-block">
          Volver a mazos
        </a>
      </div>
    )
  }

  // El ReviewClient se encarga de la lógica de revisión interactiva
  // Se importa como Client Component porque necesita estado local
  const { ReviewClient } = await import('./ReviewClient')

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{deck.title}</h1>
        <p className="text-sm text-gray-500">
          {session.cards.length} tarjetas pendientes
        </p>
      </div>
      <ReviewClient session={session} />
    </div>
  )
}
