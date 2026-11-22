/**
 * @file src/app/(app)/english/irregular-verbs/page.tsx
 * @description Hub de Verbos Irregulares — punto de entrada del módulo.
 */
import type { Metadata } from 'next'
import { createServerClient } from '@lib/supabase/server'
import { redirect }           from 'next/navigation'
import { IrregularVerbsHub }  from '@english/irregular-verbs'

export const metadata: Metadata = { title: 'Verbos Irregulares | LangTracker' }

export default async function IrregularVerbsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <IrregularVerbsHub />
}
