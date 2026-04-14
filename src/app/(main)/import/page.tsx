'use client'

import { useState, useCallback, useRef } from 'react'
import { useI18n } from '@/hooks/useI18n'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedCSV {
  headers: string[]
  rows: string[][]
}

interface ColumnMapping {
  source: string
  target: string
}

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

// ---------------------------------------------------------------------------
// CSV Parser
// ---------------------------------------------------------------------------

function parseCSV(text: string): ParsedCSV {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (ch === '"') {
          inQuotes = false
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ',') {
          result.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine)

  return { headers, rows }
}

// ---------------------------------------------------------------------------
// Target field definitions
// ---------------------------------------------------------------------------

const TARGET_FIELDS = [
  'title',
  'description',
  'status',
  'priority',
  'client_id',
  'client_name',
  'project_name',
  'assignee',
  'deadline',
  'estimated_hours',
  'category',
  'tags',
] as const

// Auto-mapping heuristics
const AUTO_MAP: Record<string, string> = {
  // Japanese headers
  'タスク名': 'title',
  'タイトル': 'title',
  '件名': 'title',
  '説明': 'description',
  '詳細': 'description',
  'ステータス': 'status',
  '状態': 'status',
  '優先度': 'priority',
  '優先順位': 'priority',
  'クライアントid': 'client_id',
  'クライアントID': 'client_id',
  'クライアント': 'client_name',
  '顧客': 'client_name',
  '取引先': 'client_name',
  'プロジェクト': 'project_name',
  '担当者': 'assignee',
  '担当': 'assignee',
  '納期': 'deadline',
  '期限': 'deadline',
  '締切': 'deadline',
  '見積時間': 'estimated_hours',
  '見積工数': 'estimated_hours',
  'カテゴリ': 'category',
  '分類': 'category',
  'タグ': 'tags',
  // English headers
  'title': 'title',
  'name': 'title',
  'task': 'title',
  'task name': 'title',
  'subject': 'title',
  'description': 'description',
  'desc': 'description',
  'status': 'status',
  'priority': 'priority',
  'client id': 'client_id',
  'client_id': 'client_id',
  'client': 'client_name',
  'client name': 'client_name',
  'project': 'project_name',
  'project name': 'project_name',
  'assignee': 'assignee',
  'assigned to': 'assignee',
  'deadline': 'deadline',
  'due date': 'deadline',
  'due': 'deadline',
  'estimated hours': 'estimated_hours',
  'hours': 'estimated_hours',
  'category': 'category',
  'tags': 'tags',
  'tag': 'tags',
}

function autoMapColumns(headers: string[]): ColumnMapping[] {
  return headers.map((h) => {
    const lower = h.toLowerCase().trim()
    const target = AUTO_MAP[lower] || AUTO_MAP[h.trim()] || ''
    return { source: h, target }
  })
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ImportPage() {
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedCSV | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  // Handle file selection
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (!selected) return

      setResult(null)
      setParseError(null)

      if (!selected.name.endsWith('.csv')) {
        setParseError(t('import.invalidFileType'))
        return
      }

      setFile(selected)

      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string
          const csv = parseCSV(text)
          if (csv.headers.length === 0) {
            setParseError(t('import.emptyFile'))
            return
          }
          setParsed(csv)
          setMappings(autoMapColumns(csv.headers))
        } catch {
          setParseError(t('import.parseError'))
        }
      }
      reader.readAsText(selected)
    },
    [t]
  )

  // Update a single mapping target
  const updateMapping = useCallback((index: number, target: string) => {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, target } : m))
    )
  }, [])

  // Reset everything
  const handleReset = useCallback(() => {
    setFile(null)
    setParsed(null)
    setMappings([])
    setResult(null)
    setParseError(null)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  // Import action
  const handleImport = useCallback(async () => {
    if (!parsed) return

    const activeMappings = mappings.filter((m) => m.target !== '')
    if (activeMappings.length === 0) return

    setImporting(true)
    setProgress(0)
    setResult(null)

    try {
      // Build mapped rows
      const mappedRows = parsed.rows.map((row) => {
        const obj: Record<string, string> = {}
        activeMappings.forEach((m) => {
          const srcIndex = parsed.headers.indexOf(m.source)
          if (srcIndex >= 0 && row[srcIndex] !== undefined) {
            obj[m.target] = row[srcIndex]
          }
        })
        return obj
      })

      // Simulate progress during fetch
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90))
      }, 200)

      const res = await fetch('/api/import/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mappedRows, mappings: activeMappings }),
      })

      clearInterval(progressInterval)

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        setResult({
          success: 0,
          failed: mappedRows.length,
          errors: [errorData.error || `HTTP ${res.status}`],
        })
        setProgress(100)
        return
      }

      const data = await res.json()
      setResult({
        success: data.success ?? data.imported ?? mappedRows.length,
        failed: data.failed ?? 0,
        errors: data.errors ?? [],
      })
      setProgress(100)
    } catch (err) {
      setResult({
        success: 0,
        failed: parsed.rows.length,
        errors: [err instanceof Error ? err.message : t('import.unknownError')],
      })
      setProgress(100)
    } finally {
      setImporting(false)
    }
  }, [parsed, mappings, t])

  const hasTitleMapping = mappings.some((m) => m.target === 'title')
  const previewRows = parsed?.rows.slice(0, 20) ?? []

  const inputClass =
    'w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text1 bg-surface placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint'

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Topbar */}
      <div className="bg-surface border-b border-wf-border shrink-0">
        <div className="max-w-[960px] mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-[16px] font-bold text-text1">
            {t('import.title')}
          </h1>
          {parsed && !importing && (
            <button
              onClick={handleReset}
              className="
                px-4 py-2 rounded-lg text-[13px] font-semibold
                text-text2 bg-surf2 border border-wf-border
                hover:bg-wf-border transition-colors
              "
            >
              {t('import.reset')}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[960px] mx-auto px-6 py-8 space-y-6">

          {/* Step 1: File upload */}
          {!parsed && !parseError && (
            <div className="bg-surface rounded-xl border border-wf-border shadow-sm p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="text-[36px] mb-4">📄</div>
                <h2 className="text-[15px] font-bold text-text1 mb-2">
                  {t('import.uploadTitle')}
                </h2>
                <p className="text-[13px] text-text3 mb-6 max-w-[400px]">
                  {t('import.uploadDescription')}
                </p>
                <label className="
                  px-6 py-3 rounded-lg text-[13px] font-semibold cursor-pointer
                  text-white bg-mint hover:bg-mint-d transition-colors
                ">
                  {t('import.selectFile')}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="bg-surface rounded-xl border border-danger/30 shadow-sm p-6">
              <div className="flex items-center gap-3">
                <span className="text-[20px]">!</span>
                <div>
                  <p className="text-[14px] font-semibold text-danger">{parseError}</p>
                  <button
                    onClick={handleReset}
                    className="text-[12px] text-mint hover:underline mt-1"
                  >
                    {t('import.tryAgain')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Column mapping */}
          {parsed && !result && (
            <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
              <div className="px-6 py-4 border-b border-wf-border">
                <h2 className="text-[15px] font-bold text-text1">
                  {t('import.columnMapping')}
                </h2>
                <p className="text-[12px] text-text3 mt-1">
                  {t('import.columnMappingDesc')}
                </p>
              </div>
              <div className="px-6 py-4 space-y-3">
                {mappings.map((mapping, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex-1 px-3 py-2 rounded-lg bg-surf2 text-[13px] text-text1 border border-wf-border truncate">
                      {mapping.source}
                    </div>
                    <span className="text-text3 text-[13px] shrink-0">&rarr;</span>
                    <select
                      value={mapping.target}
                      onChange={(e) => updateMapping(idx, e.target.value)}
                      className={`flex-1 ${inputClass}`}
                    >
                      <option value="">{t('import.skipColumn')}</option>
                      {TARGET_FIELDS.map((field) => (
                        <option key={field} value={field}>
                          {t(`import.field.${field}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {!hasTitleMapping && (
                <div className="px-6 pb-4">
                  <p className="text-[12px] text-warning font-semibold">
                    {t('import.titleRequired')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {parsed && !result && previewRows.length > 0 && (
            <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
              <div className="px-6 py-4 border-b border-wf-border">
                <h2 className="text-[15px] font-bold text-text1">
                  {t('import.preview')}
                </h2>
                <p className="text-[12px] text-text3 mt-1">
                  {t('import.previewDesc')
                    .replace('{count}', String(parsed.rows.length))
                    .replace('{showing}', String(previewRows.length))}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-surf2">
                      <th className="px-3 py-2 text-left text-text3 font-semibold border-b border-wf-border w-[40px]">#</th>
                      {parsed.headers.map((h, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 text-left text-text3 font-semibold border-b border-wf-border whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-wf-border last:border-b-0 hover:bg-surf2/50">
                        <td className="px-3 py-2 text-text3">{rIdx + 1}</td>
                        {parsed.headers.map((_, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 text-text1 max-w-[200px] truncate">
                            {row[cIdx] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import button & progress */}
          {parsed && !result && (
            <div className="flex items-center gap-4">
              <button
                onClick={handleImport}
                disabled={importing || !hasTitleMapping}
                className="
                  px-6 py-3 rounded-lg text-[13px] font-semibold
                  text-white bg-mint hover:bg-mint-d transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {importing ? t('import.importing') : t('import.startImport')}
              </button>
              <span className="text-[13px] text-text3">
                {parsed.rows.length} {t('import.rowsToImport')}
              </span>
            </div>
          )}

          {/* Progress bar */}
          {importing && (
            <div className="bg-surface rounded-xl border border-wf-border shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-text1">
                  {t('import.importing')}
                </span>
                <span className="text-[13px] text-text3">{progress}%</span>
              </div>
              <div className="w-full h-[6px] rounded-full bg-surf2 overflow-hidden">
                <div
                  className="h-full bg-mint rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Step 4: Result summary */}
          {result && (
            <div className="bg-surface rounded-xl border border-wf-border shadow-sm p-6 space-y-4">
              <h2 className="text-[15px] font-bold text-text1">
                {t('import.resultTitle')}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-mint/10 border border-mint/20 p-4 text-center">
                  <div className="text-[24px] font-bold text-mint">{result.success}</div>
                  <div className="text-[12px] text-text2 mt-1">{t('import.successCount')}</div>
                </div>
                <div className={`rounded-lg p-4 text-center ${
                  result.failed > 0
                    ? 'bg-danger/10 border border-danger/20'
                    : 'bg-surf2 border border-wf-border'
                }`}>
                  <div className={`text-[24px] font-bold ${result.failed > 0 ? 'text-danger' : 'text-text3'}`}>
                    {result.failed}
                  </div>
                  <div className="text-[12px] text-text2 mt-1">{t('import.failedCount')}</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="rounded-lg bg-danger/5 border border-danger/20 p-4">
                  <h3 className="text-[13px] font-semibold text-danger mb-2">
                    {t('import.errors')}
                  </h3>
                  <ul className="space-y-1">
                    {result.errors.slice(0, 20).map((err, i) => (
                      <li key={i} className="text-[12px] text-text2">
                        {err}
                      </li>
                    ))}
                    {result.errors.length > 20 && (
                      <li className="text-[12px] text-text3 italic">
                        ...{t('import.moreErrors').replace('{count}', String(result.errors.length - 20))}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <button
                onClick={handleReset}
                className="
                  px-5 py-2 rounded-lg text-[13px] font-semibold
                  text-white bg-mint hover:bg-mint-d transition-colors
                "
              >
                {t('import.importAnother')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
