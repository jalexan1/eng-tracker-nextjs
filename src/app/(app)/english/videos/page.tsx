'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface VideoCard {
  id:           string
  title:        string
  category:     string | null
  thumbnailUrl: string | null
  status:       string
  createdAt:    string
}

export default function VideoGalleryPage() {
  const [videos,  setVideos]  = useState<VideoCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/english/videos')
      .then((r) => r.json())
      .then((d: { videos?: VideoCard[] }) => { setVideos(d.videos ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Visualizador de Videos
        </h1>
        <Link
          href="/english/videos/import"
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
        >
          + Importar Video
        </Link>
      </div>

      {loading && (
        <p className="text-sm text-gray-400">Cargando videos…</p>
      )}

      {!loading && videos.length === 0 && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <p className="text-4xl mb-3">🎬</p>
          <p className="text-sm">Aún no has importado ningún video.</p>
          <Link href="/english/videos/import" className="mt-4 inline-block text-blue-500 underline text-sm">
            Importar tu primer video →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {videos.map((v) => (
          <Link key={v.id} href={`/english/videos/${v.id}`} className="group block">
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700
                            bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
              {v.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={v.thumbnailUrl}
                  alt={v.title}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-3xl">🎬</span>
                </div>
              )}

              <div className="p-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight">
                  {v.title}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  {v.category && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300
                                     rounded-full px-2 py-0.5">
                      {v.category}
                    </span>
                  )}
                  {v.status === 'processing' && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">⏳ Procesando…</span>
                  )}
                  {v.status === 'error' && (
                    <span className="text-xs text-red-500">❌ Error</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
