'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ImportState = 'idle' | 'loading' | 'error' | 'pending'

export default function ImportVideoPage() {
  const router  = useRouter()
  const [url,   setUrl]   = useState('')
  const [state, setState] = useState<ImportState>('idle')
  const [msg,   setMsg]   = useState('')

  async function handleImport() {
    if (!url.trim()) return
    setState('loading')
    setMsg('')

    try {
      const res  = await fetch('/api/english/videos/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url }),
      })
      const data = await res.json() as { videoId?: string; pending?: boolean; error?: string }

      if (res.status === 422 && data.pending) {
        setState('pending')
        setMsg('Este video no tiene subtítulos disponibles. Se guardó como pendiente.')
        return
      }
      if (!res.ok) {
        setState('error')
        setMsg(data.error ?? 'Error desconocido al importar el video.')
        return
      }

      router.push(`/english/videos/${data.videoId}`)
    } catch {
      setState('error')
      setMsg('Error de red al importar el video.')
    }
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
        Importar Video
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Pega la URL de un video de YouTube con subtítulos en inglés.
        La IA extraerá verbos, frases clave y categoría automáticamente.
      </p>

      <div className="flex gap-2">
        <input
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleImport()}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleImport}
          disabled={state === 'loading' || !url.trim()}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                     text-white px-5 py-2 text-sm font-medium transition-colors"
        >
          {state === 'loading' ? 'Procesando…' : 'Importar'}
        </button>
      </div>

      {state === 'loading' && (
        <div className="mt-6 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="animate-spin text-blue-500">⏳</span>
          Extrayendo transcripción y analizando con IA… (puede tardar hasta 60 s)
        </div>
      )}

      {state === 'error' && (
        <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200
                        dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          ❌ {msg}
        </div>
      )}

      {state === 'pending' && (
        <div className="mt-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200
                        dark:border-yellow-700 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-200">
          <p className="font-semibold mb-1">⚠️ Video sin subtítulos</p>
          <p>{msg}</p>
          <button
            onClick={() => router.push('/pendientes')}
            className="mt-3 text-xs underline"
          >
            Ver lista de pendientes →
          </button>
        </div>
      )}
    </div>
  )
}
