'use client'

import { useState, useRef } from 'react'
import { Send, Loader2, Bot, Zap, Copy, Check, AlertTriangle } from 'lucide-react'

type Meta = {
  provider: 'groq' | 'gemini'
  model:    string
  tokens:   number | null
  latencyMs: number
}

const SUGGESTIONS = [
  'Genera 5 oraciones en inglés usando el verbo "go" en pasado simple.',
  'Explica la diferencia entre "make" y "do" en inglés con ejemplos.',
  'Dame 3 oraciones con el verbo "take" en base, pasado y participio.',
  '¿Cuál es la regla del grupo sonoro i→a→u? Dame ejemplos.',
  'Genera una oración de contexto para el verbo "break" en cada una de sus 3 formas.',
]

export function AiChatScreen() {
  const [prompt, setPrompt]     = useState('')
  const [response, setResponse] = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [meta, setMeta]         = useState<Meta | null>(null)
  const [copied, setCopied]     = useState(false)
  const textareaRef             = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!prompt.trim() || loading) return

    setLoading(true)
    setError(null)
    setResponse(null)
    setMeta(null)

    try {
      const res = await fetch('/api/english/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt: prompt.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Error desconocido')
      }

      setResponse(data.response)
      setMeta({
        provider:  data.provider,
        model:     data.model,
        tokens:    data.usage?.total_tokens ?? null,
        latencyMs: data.latencyMs,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consultar la IA')
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestion = (s: string) => {
    setPrompt(s)
    textareaRef.current?.focus()
  }

  const handleCopy = () => {
    if (!response) return
    navigator.clipboard.writeText(response)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const providerBadge = meta?.provider === 'groq'
    ? { label: '⚡ Groq — LLaMA 3.1 70B', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' }
    : { label: '✨ Gemini 1.5 Flash',      color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🤖</span>
          <h1 className="text-2xl font-bold text-white">Asistente IA</h1>
        </div>
        <p className="text-gray-400 text-sm">
          IA integrada con <strong className="text-purple-400">Groq (LLaMA 3.1 70B)</strong> como proveedor
          principal y <strong className="text-blue-400">Gemini 1.5 Flash</strong> como respaldo — ambos gratuitos.
          Úsala para generar oraciones, explicar gramática o cualquier consulta de inglés.
        </p>
      </div>

      {/* Provider badges */}
      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium border border-purple-500/30">
          ⚡ Groq — 14 400 req/día gratis
        </span>
        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium border border-blue-500/30">
          ✨ Gemini — 60 req/min gratis
        </span>
        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium border border-green-500/30">
          ✅ Sin costo
        </span>
      </div>

      {/* Sugerencias rápidas */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Sugerencias rápidas:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
              className="text-xs px-3 py-1.5 bg-surface hover:bg-white/5 border border-border hover:border-indigo-500/50 text-gray-300 rounded-lg transition-colors text-left"
            >
              {s.length > 55 ? s.slice(0, 55) + '…' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit}>
        <div className="bg-surface rounded-xl border border-border p-4 focus-within:border-indigo-500/60 transition-colors">
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
            Tu pregunta o prompt
          </label>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: Genera 3 oraciones con el verbo 'go' en pasado simple con su traducción al español..."
            className="w-full bg-transparent text-white placeholder-gray-600 resize-none focus:outline-none min-h-[120px] text-sm leading-relaxed"
            disabled={loading}
          />
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
            <span className="text-xs text-gray-600">
              {prompt.length} chars · <kbd className="text-gray-500">Ctrl+Enter</kbd> para enviar
            </span>
            <button
              type="submit"
              disabled={!prompt.trim() || loading}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors font-medium text-sm"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Consultando IA…</>
                : <><Send className="w-4 h-4" /> Enviar</>}
            </button>
          </div>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium mb-1">Error al consultar la IA</p>
            <p className="text-red-300/80">{error}</p>
            <p className="text-xs mt-2 text-red-400/60">
              Verifica que <code>GROQ_API_KEY</code> o <code>GEMINI_API_KEY</code> estén configuradas
              en las variables de entorno de Vercel.
            </p>
          </div>
        </div>
      )}

      {/* Respuesta */}
      {response && (
        <div className="bg-surface rounded-xl border border-indigo-500/30 overflow-hidden">
          {/* Meta bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-white/[0.02]">
            <Bot className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-sm text-indigo-400 font-medium">Respuesta</span>
            {meta && (
              <>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs border ${providerBadge.color}`}>
                  {providerBadge.label}
                </span>
                <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
                  {meta.tokens && <span>🔢 {meta.tokens} tokens</span>}
                  <span>⏱️ {(meta.latencyMs / 1000).toFixed(1)}s</span>
                </div>
              </>
            )}
            <button
              onClick={handleCopy}
              className="ml-2 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Copiar respuesta"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          {/* Body */}
          <div className="p-5 text-gray-200 whitespace-pre-wrap leading-relaxed text-sm">
            {response}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!response && !error && !loading && (
        <div className="text-center py-16 text-gray-600">
          <Bot className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="text-sm">Escribe tu pregunta y presiona Enviar</p>
          <p className="text-xs mt-1 text-gray-700">
            O elige una sugerencia rápida de arriba
          </p>
        </div>
      )}
    </div>
  )
}
