'use client'

import { useEffect, useState } from 'react'

interface Parameter {
  key:   string
  value: string
  label: string
}

export default function SettingsPage() {
  const [activeTab,  setActiveTab]  = useState<'en' | 'es'>('en')
  const [params,     setParams]     = useState<Parameter[]>([])
  const [edited,     setEdited]     = useState<Record<string, string>>({})
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [savedMsg,   setSavedMsg]   = useState('')

  useEffect(() => {
    setLoading(true)
    setEdited({})
    fetch(`/api/settings?language=${activeTab}`)
      .then((r) => r.json())
      .then((d: { parameters?: Parameter[] }) => {
        setParams(d.parameters ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [activeTab])

  function handleChange(key: string, value: string) {
    setEdited((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (Object.keys(edited).length === 0) return
    setSaving(true)
    setSavedMsg('')

    const parameters = Object.entries(edited).map(([key, value]) => ({ key, value }))
    const res = await fetch('/api/settings', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ language: activeTab, parameters }),
    })

    setSaving(false)
    if (res.ok) {
      setParams((prev) =>
        prev.map((p) => (edited[p.key] !== undefined ? { ...p, value: edited[p.key]! } : p)),
      )
      setEdited({})
      setSavedMsg('✅ Guardado')
      setTimeout(() => setSavedMsg(''), 3000)
    } else {
      setSavedMsg('❌ Error al guardar')
    }
  }

  const getValue = (p: Parameter) => edited[p.key] ?? p.value

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Parámetros del sistema
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {(['en', 'es'] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => setActiveTab(lang)}
            className={`px-5 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              activeTab === lang
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {lang === 'en' ? '🇺🇸 English' : '🇪🇸 Español'}
          </button>
        ))}
      </div>

      {activeTab === 'es' && (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700
                        p-8 text-center text-gray-400 dark:text-gray-600">
          <p className="text-2xl mb-2">🚧</p>
          <p className="text-sm">Próximamente — configuración para módulo de Español</p>
        </div>
      )}

      {activeTab === 'en' && (
        <>
          {loading ? (
            <p className="text-sm text-gray-400">Cargando parámetros…</p>
          ) : (
            <div className="space-y-5">
              {params.map((p) => (
                <div key={p.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {p.label}
                  </label>
                  <input
                    type="text"
                    value={getValue(p)}
                    onChange={(e) => handleChange(p.key, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {p.key === 'spaced_repetition_days' && (
                    <p className="text-xs text-gray-400 mt-1">
                      Intervalos separados por coma, en días (ej: 1,3,7,14,30)
                    </p>
                  )}
                </div>
              ))}

              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || Object.keys(edited).length === 0}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                             text-white px-6 py-2 text-sm font-medium transition-colors"
                >
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
                {savedMsg && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">{savedMsg}</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
