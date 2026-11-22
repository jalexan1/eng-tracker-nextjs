/**
 * @file src/app/(app)/english/irregular-verbs/video/page.tsx
 * @description Player del video rap de verbos irregulares.
 */
import type { Metadata } from 'next'
import { createServerClient } from '@lib/supabase/server'
import { redirect }           from 'next/navigation'
import { VideoLearning }      from '@english/irregular-verbs'

export const metadata: Metadata = { title: 'Video Rap — Verbos Irregulares | LangTracker' }

export default async function VideoPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <VideoLearning />
}
