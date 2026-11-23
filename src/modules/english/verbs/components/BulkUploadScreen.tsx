'use client'

import { useState, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle,
  AlertTriangle, Loader2, ChevronDown, ChevronUp,
  Search, Download, ChevronLeft, ChevronRight,
  RefreshCw, Database,
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

interface DbVerb {
  id: number
  base: string
  past: string
  participle: string
  spanish: string
  type: 'regular' | 'irregular'
  group: string | null
  difficulty: number | null
}

interface VerbsApiResponse {
  data: DbVerb[]
  total: number
  page: number
  totalPages: number
  limit: number
  groups: string[]
}

// ─── Helpers de validación ────────────────────────────────────────────────────
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
  const verbBase   = (raw['Verbo'] ?? raw['VerbBase'] ?? raw['verb_base'] ?? '').trim().toLowerCase()
  const rawForm    = (raw['Forma'] ?? raw['Form'] ?? raw['form'] ?? '').trim().toLowerCase()
  const form       = (['base', 'past', 'participle'].includes(rawForm) ? rawForm : '') as 'base' | 'past' | 'participle'
  const sentence   = (raw['Oración'] ?? raw['Sentence'] ?? raw['sentence'] ?? '').trim()
  const sentenceEs = (raw['Traducción'] ?? raw['Translation'] ?? '').trim()

  if (!verbBase) errors.push('Verbo vacío')
  if (!form)     errors.push('Forma inválida (debe ser: base, past o participle)')
  if (!sentence) errors.push('Oración vacía')

  return { verbBase, form, sentence, sentenceEs: sentenceEs || undefined, _errors: errors }
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function BulkUploadScreen() {
  // ── Estado Upload ──────────────────────────────────────────────────────────
  const [mode, setMode]           = useState<UploadMode>('verbs')
  const [verbRows, setVerbRows]   = useState<VerbRow[]>([])
  const [sentRows, setSentRows]   = useState<SentenceRow[]>([])
  const [fileName, setFileName]   = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult]       = useState<{ ok: boolean; inserted: number; errors: { row: number; error: string }[] } | null>(null)
  const [showAll, setShowAll]     = useState(false)
  const [isDrag, setIsDrag]       = useState(false)

  // ── Estado Tabla BD ────────────────────────────────────────────────────────
  const [dbVerbs, setDbVerbs]           = useState<DbVerb[]>([])
  const [dbTotal, setDbTotal]           = useState(0)
  const [dbPage, setDbPage]             = useState(1)
  const [dbTotalPages, setDbTotalPages] = useState(1)
  const [dbGroups, setDbGroups]         = useState<string[]>([])
  const [dbLoading, setDbLoading]       = useState(false)
  const [dbError, setDbError]           = useState('')
  const [dbDownloading, setDbDownloading] = useState(false)

  // Filtros
  const [search, setSearch]           = useState('')
  const [typeFilter, setTypeFilter]   = useState('')
  const [groupFilter, setGroupFilter] = useState('')

  const rows      = mode === 'verbs' ? verbRows : sentRows
  const hasErrors = rows.some((r) => r._errors.length > 0)
  const validRows = rows.filter((r) => r._errors.length === 0)
  const PREVIEW   = showAll ? rows.length : Math.min(rows.length, 15)

  // ── Cargar verbos de BD ────────────────────────────────────────────────────
  const loadDbVerbs = useCallback(async (page: number) => {
    setDbLoading(true)
    setDbError('')
    try {
      const params = new URLSearchParams({
        page:   String(page),
        limit:  '20',
        search,
        type:   typeFilter,
        group:  groupFilter,
      })
      const res = await fetch(`/api/english/verbs?${params}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = (await res.json()) as VerbsApiResponse
      setDbVerbs(json.data)
      setDbTotal(json.total)
      setDbPage(json.page)
      setDbTotalPages(json.totalPages)
      setDbGroups(json.groups)
    } catch (e) {
      setDbError((e as Error).message)
    } finally {
      setDbLoading(false)
    }
  }, [search, typeFilter, groupFilter])

  // Cargar al montar y al cambiar filtros
  useEffect(() => {
    void loadDbVerbs(1)
  }, [loadDbVerbs])

  // Recargar tabla después de un cargue exitoso
  useEffect(() => {
    if (result?.ok) void loadDbVerbs(1)
  }, [result, loadDbVerbs])

  // ── Descarga XLSX ──────────────────────────────────────────────────────────
  const handleDownload = async () => {
    setDbDownloading(true)
    try {
      const params = new URLSearchParams({
        download: '1',
        search,
        type:     typeFilter,
        group:    groupFilter,
      })
      const res  = await fetch(`/api/english/verbs?${params}`)
      const json = (await res.json()) as { data: DbVerb[] }

      const xlsRows = json.data.map((v) => ({
        Base:       v.base,
        Pasado:     v.past,
        Participio: v.participle,
        Español:    v.spanish,
        Tipo:       v.type,
        Grupo:      v.group ?? '',
        Dificultad: v.difficulty ?? 1,
      }))

      const ws = XLSX.utils.json_to_sheet(xlsRows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Verbos')

      ws['!cols'] = [
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 24 },
        { wch: 12 }, { wch: 20 }, { wch: 12 },
      ]

      const label = [
        search      ? `_${search}`                          : '',
        typeFilter  ? `_${typeFilter}`                      : '',
        groupFilter ? `_${groupFilter.replace(/\s+/g, '-')}` : '',
      ].join('')

      XLSX.writeFile(wb, `verbos${label}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e) {
      setDbError((e as Error).message)
    } finally {
      setDbDownloading(false)
    }
  }

  // ── Parseo del archivo ─────────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('Solo se aceptan archivos .xlsx o .xls')
      return
    }
    setFileName(file.name)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const data      = new Uint8Array(e.target!.result as ArrayBuffer)
      const wb        = XLSX.read(data, { type: 'array' })
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

  // ── Upload ─────────────────────────────────────────────────────────────────
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
      const data = (await res.json()) as { ok: boolean; inserted: number; errors: { row: number; error: string }[] }
      setResult(data)
    } catch {
      setResult({ ok: false, inserted: 0, errors: [{ row: 0, error: 'Error de red' }] })
    } finally {
      setUploading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📥</span>
          <h1 className="text-2xl font-bold text-white">Cargue Masivo</h1>
        </div>
        <p className="text-gray-400 text-sm">
          Sube verbos y oraciones en lote desde Excel. Llena la plantilla y cárgala aquí.
        </p>
      </div>

      {/* ── Selector de modo ──────────────────────────────────────────────── */}
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

      {/* ── Columnas esperadas ────────────────────────────────────────────── */}
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

      {/* ── Zona de arrastre ──────────────────────────────────────────────── */}
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

      {/* ── Preview tabla upload ───────────────────────────────────────────── */}
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
                  const v  = row as VerbRow
                  const s  = row as SentenceRow
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
              {showAll
                ? <><ChevronUp className="w-3 h-3" /> Ver menos</>
                : <><ChevronDown className="w-3 h-3" /> Ver las {rows.length - 15} filas restantes</>}
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

      {/* ── Resultado del cargue ───────────────────────────────────────────── */}
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

      {/* ══════════════════════════════════════════════════════════════════════
          TABLA DE VERBOS EN BD
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">

        {/* Header de tabla */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Verbos en Base de Datos</h2>
              <p className="text-xs text-gray-500">
                {dbLoading ? 'Cargando…' : `${dbTotal.toLocaleString()} verbos registrados`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadDbVerbs(dbPage)}
              disabled={dbLoading}
              className="p-2 rounded-lg border border-border text-gray-400 hover:text-white hover:border-indigo-500/50 transition-colors disabled:opacity-40"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${dbLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => void handleDownload()}
              disabled={dbDownloading || dbTotal === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20 hover:border-indigo-500/50 transition-colors disabled:opacity-40 text-sm font-medium"
            >
              {dbDownloading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              Descargar Excel
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="px-5 py-3 border-b border-border flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar verbo o español…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500/60"
          >
            <option value="">Todos los tipos</option>
            <option value="regular">Regular</option>
            <option value="irregular">Irregular</option>
          </select>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500/60"
          >
            <option value="">Todos los grupos</option>
            {dbGroups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Error de BD */}
        {dbError && (
          <div className="px-5 py-3 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" /> {dbError}
          </div>
        )}

        {/* Tabla de registros */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-white/[0.02]">
                <th className="px-3 py-2.5 text-left text-gray-500 font-medium w-10">#</th>
                <th className="px-3 py-2.5 text-left text-gray-500 font-medium">Base</th>
                <th className="px-3 py-2.5 text-left text-gray-500 font-medium">Pasado</th>
                <th className="px-3 py-2.5 text-left text-gray-500 font-medium">Participio</th>
                <th className="px-3 py-2.5 text-left text-gray-500 font-medium">Español</th>
                <th className="px-3 py-2.5 text-left text-gray-500 font-medium">Tipo</th>
                <th className="px-3 py-2.5 text-left text-gray-500 font-medium">Grupo</th>
              </tr>
            </thead>
            <tbody>
              {dbLoading && dbVerbs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-gray-600">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Cargando verbos…
                  </td>
                </tr>
              )}
              {!dbLoading && dbVerbs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-gray-600">
                    No se encontraron verbos con los filtros aplicados.
                  </td>
                </tr>
              )}
              {dbVerbs.map((v, i) => (
                <tr key={v.id} className="border-b border-border/40 hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2 text-gray-600">
                    {(dbPage - 1) * 20 + i + 1}
                  </td>
                  <td className="px-3 py-2 text-white font-mono font-medium">{v.base}</td>
                  <td className="px-3 py-2 text-gray-300 font-mono">{v.past}</td>
                  <td className="px-3 py-2 text-gray-300 font-mono">{v.participle}</td>
                  <td className="px-3 py-2 text-gray-300">{v.spanish}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      v.type === 'irregular'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {v.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{v.group ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {dbTotalPages > 1 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Página <strong className="text-white">{dbPage}</strong> de <strong className="text-white">{dbTotalPages}</strong>
              {' '}· {dbTotal.toLocaleString()} verbos
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => void loadDbVerbs(dbPage - 1)}
                disabled={dbPage <= 1 || dbLoading}
                className="p-1.5 rounded border border-border text-gray-400 hover:text-white hover:border-indigo-500/50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(5, dbTotalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(dbPage - 2, dbTotalPages - 4))
                const p     = start + i
                return (
                  <button
                    key={p}
                    onClick={() => void loadDbVerbs(p)}
                    disabled={dbLoading}
                    className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                      p === dbPage
                        ? 'bg-indigo-600 text-white border border-indigo-500'
                        : 'border border-border text-gray-400 hover:text-white hover:border-indigo-500/50'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}

              <button
                onClick={() => void loadDbVerbs(dbPage + 1)}
                disabled={dbPage >= dbTotalPages || dbLoading}
                className="p-1.5 rounded border border-border text-gray-400 hover:text-white hover:border-indigo-500/50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
