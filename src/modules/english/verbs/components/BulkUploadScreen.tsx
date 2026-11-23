'use client'

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle,
  AlertTriangle, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type UploadMode = 'verbs' | 'sentences'

interface VerbRow {
  base: string; past: string; participle: string
  spanish: string; type: 'regular' | 'irregular'
  group?: string; difficulty?: number
  _errors: string[]
}

interface SentenceRow {
  verbBase: string; form: 'base' | 'past' | 'participle'
  sentence: string; sentenceEs?: string
  _errors: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function validateVerb(raw: Record<string, string>): VerbRow {
  const errors: string[] = []
  const base       = (raw['Base'] ?? raw['base'] ?? '').trim().toLowerCase()
  const past       = (raw['Pasado'] ?? raw['Past'] ?? raw['past'] ?? '').trim().toLowerCase()
  const participle = (raw['Participio'] ?? raw['Participle'] ?? raw['participle'] ?? '').trim().toLowerCase()
  const spanish    = (raw['Español'] ?? raw['Spanish'] ?? raw['spanish'] ?? '').trim()
  const rawType    = (raw['Tipo'] ?? raw['Type'] ?? raw['type'] ?? '').trim().toLowerCase()
  const type       = rawType === 'irregular' ? 'irregular' : 'regular'

  if (!base)       errors.push('Base vacía')
  if (!past)       errors.push('Pasado vacío')
  if (!participle) errors.push('Participio vacío')
  if (!spanish)    errors.push('Español vacío')

  return { base, past, participle, spanish, type, group: raw['Grupo'] ?? undefined, _errors: errors }
}

function validateSentence(raw: Record<string, string>): SentenceRow {
  const errors: string[] = []
  const verbBase  = (raw['Verbo'] ?? raw['VerbBase'] ?? raw['verb_base'] ?? '').trim().toLowerCase()
  const rawForm   = (raw['Forma'] ?? raw['Form'] ?? raw['form'] ?? '').trim().toLowerCase()
  const form      = (['base', 'past', 'participle'].includes(rawForm) ? rawForm : '') as 'base' | 'past' | 'participle'
  const sentence  = (raw['Oración'] ?? raw['Sentence'] ?? raw['sentence'] ?? '').trim()
  const sentenceEs = (raw['Traducción'] ?? raw['Translation'] ?? '').trim()

  if (!verbBase) errors.push('Verbo vacío')
  if (!form)     errors.push('Forma inválida (debe ser: base, past o participle)')
  if (!sentence) errors.push('Oración vacía')

  return { verbBase, form, sentence, sentenceEs: sentenceEs || undefined, _errors: errors }
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function BulkUploadScreen() {
  const [mode, setMode]           = useState<UploadMode>('verbs')
  const [verbRows, setVerbRows]   = useState<VerbRow[]>([])
  const [sentRows, setSentRows]   = useState<SentenceRow[]>([])
  const [fileName, setFileName]   = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult]       = useState<{ ok: boolean; inserted: number; errors: { row: number; error: string }[] } | null>(null)
  const [showAll, setShowAll]     = useState(false)
  const [isDrag, setIsDrag]       = useState(false)

  const rows      = mode === 'verbs' ? verbRows : sentRows
  const hasErrors = rows.some((r) => r._errors.length > 0)
  const validRows = rows.filter((r) => r._errors.length === 0)
  const PREVIEW   = showAll ? rows.length : Math.min(rows.length, 15)

  // ── Parseo del archivo ────────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('Solo se aceptan archivos .xlsx o .xls')
      return
    }
    setFileName(file.name)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const data       = new Uint8Array(e.target!.result as ArrayBuffer)
      const wb         = XLSX.read(data, { type: 'array' })
      const sheetName = wb.SheetNames[0]
      if (!sheetName) return
      const ws = wb.Sheets[sheetName]
      if (!ws) return
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })

      if (mode === 'verbs') {
        setVerbRows(json.map(validateVerb))
        setSentRows([])
      } else {
        setSentRows(json.map(validateSentence))
        setVerbRows([])
      }
    }
    reader.readAsArrayBuffer(file)
  }, [mode])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDrag(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }, [parseFile])

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!validRows.length || uploading) return
    setUploading(true)
    setResult(null)

    try {
      const payload = mode === 'verbs'
        ? validRows.map((r) => { const { _errors, ...rest } = r as VerbRow; return rest })
        : validRows.map((r) => { const { _errors, ...rest } = r as SentenceRow; return rest })

      const res  = await fetch('/api/english/verbs/bulk-upload', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: mode, rows: payload }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ ok: false, inserted: 0, errors: [{ row: 0, error: 'Error de red' }] })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📥</span>
          <h1 className="text-2xl font-bold text-white">Cargue Masivo</h1>
        </div>
        <p className="text-gray-400 text-sm">
          Sube verbos y oraciones en lote desde Excel. Descarga la plantilla, llénala y cárgala aquí.
        </p>
      </div>

      {/* Selector de modo */}
      <div className="flex gap-3">
        {(['verbs', 'sentences'] as UploadMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setVerbRows([]); setSentRows([]); setFileName(''); setResult(null) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              mode === m
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-surface border-border text-gray-400 hover:border-indigo-500/50'
            }`}
          >
            {m === 'verbs' ? '📚 Verbos' : '💬 Oraciones'}
          </button>
        ))}
      </div>

      {/* Columnas esperadas */}
      <div className="bg-surface rounded-xl border border-border p-4 text-sm">
        <p className="text-gray-400 font-medium mb-2">
          Columnas esperadas en el Excel ({mode === 'verbs' ? 'verbos' : 'oraciones'}):
        </p>
        {mode === 'verbs' ? (
          <div className="flex flex-wrap gap-2">
            {['Español*', 'Base*', 'Pasado*', 'Participio*', 'Tipo (regular/irregular)*', 'Grupo'].map((c) => (
              <span key={c} className={`px-2 py-1 rounded text-xs font-mono ${c.includes('*') ? 'bg-indigo-500/20 text-indigo-300' : 'bg-gray-700/50 text-gray-400'}`}>
                {c}
              </span>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {['Verbo*', 'Forma* (base/past/participle)', 'Oración*', 'Traducción'].map((c) => (
              <span key={c} className={`px-2 py-1 rounded text-xs font-mono ${c.includes('*') ? 'bg-indigo-500/20 text-indigo-300' : 'bg-gray-700/50 text-gray-400'}`}>
                {c}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-600 mt-2">* Requerido</p>
      </div>

      {/* Zona de arrastre */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDrag(true) }}
        onDragLeave={() => setIsDrag(false)}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          isDrag ? 'border-indigo-500 bg-indigo-500/10' : 'border-border hover:border-indigo-500/50'
        }`}
      >
        <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-gray-500" />
        <p className="text-gray-300 font-medium mb-1">Arrastra tu archivo Excel aquí</p>
        <p className="text-gray-500 text-sm mb-4">o</p>
        <label className="cursor-pointer">
          <span className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
            Seleccionar archivo .xlsx
          </span>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f) }}
          />
        </label>
        {fileName && (
          <p className="mt-3 text-sm text-indigo-400">📄 {fileName}</p>
        )}
      </div>

      {/* Preview tabla */}
      {rows.length > 0 && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white">{rows.length} filas detectadas</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${hasErrors ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
                {validRows.length} válidas · {rows.length - validRows.length} con errores
              </span>
            </div>
            {hasErrors && (
              <div className="flex items-center gap-1 text-xs text-amber-400">
                <AlertTriangle className="w-3 h-3" /> Las filas con errores serán omitidas
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-gray-500 font-medium w-10">#</th>
                  {mode === 'verbs' ? (
                    <>
                      <th className="px-3 py-2 text-left text-gray-500">Base</th>
                      <th className="px-3 py-2 text-left text-gray-500">Pasado</th>
                      <th className="px-3 py-2 text-left text-gray-500">Participio</th>
                      <th className="px-3 py-2 text-left text-gray-500">Español</th>
                      <th className="px-3 py-2 text-left text-gray-500">Tipo</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-left text-gray-500">Verbo</th>
                      <th className="px-3 py-2 text-left text-gray-500">Forma</th>
                      <th className="px-3 py-2 text-left text-gray-500">Oración</th>
                    </>
                  )}
                  <th className="px-3 py-2 text-left text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW).map((row, i) => {
                  const v = row as VerbRow
                  const s = row as SentenceRow
                  const ok = row._errors.length === 0
                  return (
                    <tr key={i} className={`border-b border-border/50 ${ok ? '' : 'bg-red-500/5'}`}>
                      <td className="px-3 py-2 text-gray-600">{i + 2}</td>
                      {mode === 'verbs' ? (
                        <>
                          <td className="px-3 py-2 text-white font-mono">{v.base || <span className="text-red-400">—</span>}</td>
                          <td className="px-3 py-2 text-gray-300 font-mono">{v.past}</td>
                          <td className="px-3 py-2 text-gray-300 font-mono">{v.participle}</td>
                          <td className="px-3 py-2 text-gray-300">{v.spanish}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${v.type === 'irregular' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                              {v.type}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 text-white font-mono">{s.verbBase}</td>
                          <td className="px-3 py-2 text-gray-300">{s.form}</td>
                          <td className="px-3 py-2 text-gray-300 max-w-xs truncate">{s.sentence}</td>
                        </>
                      )}
                      <td className="px-3 py-2">
                        {ok
                          ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                          : (
                            <div className="flex items-center gap-1">
                              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                              <span className="text-red-400 text-xs">{row._errors.join(', ')}</span>
                            </div>
                          )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {rows.length > 15 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2 text-xs text-gray-500 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-1"
            >
              {showAll ? <><ChevronUp className="w-3 h-3" /> Ver menos</> : <><ChevronDown className="w-3 h-3" /> Ver las {rows.length - 15} filas restantes</>}
            </button>
          )}

          {/* Botón cargar */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Se cargarán <strong className="text-white">{validRows.length}</strong> {mode === 'verbs' ? 'verbos' : 'oraciones'} válidos
              {rows.length - validRows.length > 0 && ` · ${rows.length - validRows.length} omitidos por errores`}
            </p>
            <button
              onClick={handleUpload}
              disabled={validRows.length === 0 || uploading}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors font-medium text-sm"
            >
              {uploading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</>
                : <><Upload className="w-4 h-4" /> Cargar a BD</>}
            </button>
          </div>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className={`rounded-xl border p-5 ${result.ok ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <div className="flex items-center gap-2 mb-3">
            {result.ok
              ? <CheckCircle2 className="w-5 h-5 text-green-400" />
              : <AlertTriangle className="w-5 h-5 text-amber-400" />}
            <span className={`font-medium ${result.ok ? 'text-green-300' : 'text-amber-300'}`}>
              {result.ok ? '¡Cargue exitoso!' : 'Cargue completado con errores'}
            </span>
          </div>
          <p className="text-sm text-gray-300">
            ✅ <strong>{result.inserted}</strong> registros guardados en BD
            {result.errors.length > 0 && ` · ❌ ${result.errors.length} errores`}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-3 space-y-1">
              {result.errors.slice(0, 10).map((e, i) => (
                <li key={i} className="text-xs text-red-400">Fila {e.row}: {e.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
