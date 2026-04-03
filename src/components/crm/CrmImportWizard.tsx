'use client'

import { useState, useCallback } from 'react'
import { Upload, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useQueryClient } from '@tanstack/react-query'
import type { CrmEntityType } from '@/types/crm'

type Step = 'upload' | 'mapping' | 'preview' | 'result'

interface ParsedData {
  headers: string[]
  rows: string[][]
}

const ENTITY_FIELDS: Record<string, string[]> = {
  contact: ['first_name', 'last_name', 'email', 'phone', 'title', 'department', 'lifecycle_stage', 'lead_score', 'source'],
  company: ['name', 'domain', 'industry', 'company_size', 'phone', 'website', 'address', 'source'],
  lead: ['title', 'status', 'source', 'estimated_value', 'description'],
  deal: ['title', 'stage', 'amount', 'probability', 'expected_close_date', 'description', 'priority'],
}

export function CrmImportWizard() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>('upload')
  const [entityType, setEntityType] = useState<CrmEntityType>('contact')
  const [parsed, setParsed] = useState<ParsedData | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null)

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) return

      const parseCSVLine = (line: string) => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        for (const char of line) {
          if (char === '"') { inQuotes = !inQuotes; continue }
          if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
          current += char
        }
        result.push(current.trim())
        return result
      }

      const headers = parseCSVLine(lines[0])
      const rows = lines.slice(1).map(parseCSVLine)
      setParsed({ headers, rows })

      // Auto-suggest mapping
      const fields = ENTITY_FIELDS[entityType] ?? []
      const autoMapping: Record<string, string> = {}
      headers.forEach(h => {
        const lower = h.toLowerCase().replace(/\s+/g, '_')
        const match = fields.find(f => f === lower || f.includes(lower) || lower.includes(f))
        if (match) autoMapping[h] = match
      })
      setMapping(autoMapping)
      setStep('mapping')
    }
    reader.readAsText(file)
  }, [entityType])

  const handleImport = async () => {
    if (!parsed) return
    setImporting(true)

    try {
      const fields = Object.entries(mapping).filter(([, v]) => v)
      const records = parsed.rows.map(row => {
        const record: Record<string, any> = {}
        fields.forEach(([csvHeader, crmField]) => {
          const idx = parsed.headers.indexOf(csvHeader)
          if (idx >= 0 && row[idx]) {
            let val: any = row[idx]
            if (['estimated_value', 'amount', 'probability', 'lead_score'].includes(crmField)) {
              val = parseFloat(val) || 0
            }
            record[crmField] = val
          }
        })
        return record
      }).filter(r => Object.keys(r).length > 0)

      let imported = 0
      let errors = 0

      // Batch insert (50 at a time)
      for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50)
        const res = await fetch(`/api/crm/${entityType === 'contact' ? 'contacts' : entityType === 'company' ? 'companies' : entityType === 'lead' ? 'leads' : 'deals'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch.length === 1 ? batch[0] : batch[0]), // Single insert for MVP
        })
        if (res.ok) imported++; else errors++
      }

      // Simplified: insert one by one for reliability
      for (const record of records) {
        try {
          const endpoint = entityType === 'contact' ? 'contacts' : entityType === 'company' ? 'companies' : entityType === 'lead' ? 'leads' : 'deals'
          const res = await fetch(`/api/crm/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record),
          })
          if (res.ok) imported++; else errors++
        } catch { errors++ }
      }

      setResult({ imported, errors })
      qc.invalidateQueries({ queryKey: ['crm'] })
      setStep('result')
    } catch {
      setResult({ imported: 0, errors: parsed.rows.length })
      setStep('result')
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setStep('upload')
    setParsed(null)
    setMapping({})
    setResult(null)
  }

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
        <h3 className="text-[13px] font-bold text-text">{t('crm.import.title')}</h3>
      </div>

      <div className="p-[16px]">
        {/* Step indicator */}
        <div className="flex items-center gap-[4px] mb-[16px]">
          {(['upload', 'mapping', 'preview', 'result'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-[4px]">
              <span className={`text-[10px] font-bold px-[8px] py-[2px] rounded-full ${step === s ? 'bg-mint-dd text-white' : 'bg-surf2 text-text3'}`}>
                {i + 1}
              </span>
              {i < 3 && <ChevronRight className="w-[12px] h-[12px] text-text3" />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-[12px]">
            <div>
              <label className="text-[12px] font-semibold text-text2 block mb-[6px]">{t('crm.import.entityType')}</label>
              <select value={entityType} onChange={e => setEntityType(e.target.value as CrmEntityType)} className="w-full text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px]">
                <option value="contact">{t('crm.contacts')}</option>
                <option value="company">{t('crm.companies')}</option>
                <option value="lead">{t('crm.leads')}</option>
                <option value="deal">{t('crm.deals')}</option>
              </select>
            </div>
            <label className="flex flex-col items-center gap-[8px] p-[24px] border-2 border-dashed border-border2 rounded-[10px] cursor-pointer hover:border-mint transition-colors">
              <Upload className="w-[24px] h-[24px] text-text3" />
              <span className="text-[12px] text-text2">{t('crm.import.dropCsv')}</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 'mapping' && parsed && (
          <div className="space-y-[8px]">
            <p className="text-[12px] text-text2 mb-[8px]">{parsed.rows.length} {t('crm.import.rowsFound')}</p>
            {parsed.headers.map(header => (
              <div key={header} className="flex items-center gap-[8px]">
                <span className="text-[12px] text-text w-[140px] truncate font-mono">{header}</span>
                <span className="text-text3">&rarr;</span>
                <select
                  value={mapping[header] ?? ''}
                  onChange={e => setMapping(m => ({ ...m, [header]: e.target.value }))}
                  className="flex-1 text-[12px] px-[8px] py-[4px] bg-surface border border-border2 rounded-[6px]"
                >
                  <option value="">&mdash; {t('crm.import.skip')} &mdash;</option>
                  {(ENTITY_FIELDS[entityType] ?? []).map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            ))}
            <div className="flex gap-[8px] justify-end mt-[12px]">
              <button onClick={reset} className="px-[12px] py-[6px] text-[12px] text-text2 bg-surf2 rounded-[6px]">{t('common.cancel')}</button>
              <button onClick={() => setStep('preview')} className="px-[12px] py-[6px] text-[12px] font-bold text-white bg-mint-dd rounded-[6px]">{t('crm.import.next')}</button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && parsed && (
          <div className="space-y-[8px]">
            <p className="text-[12px] text-text2">{t('crm.import.previewLabel')}: {parsed.rows.length} {t('crm.import.records')}</p>
            <div className="max-h-[200px] overflow-auto border border-border2 rounded-[6px]">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-surf2">
                    {Object.entries(mapping).filter(([,v]) => v).map(([,field]) => (
                      <th key={field} className="px-[8px] py-[4px] text-left font-semibold text-text2">{field}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-border2">
                      {Object.entries(mapping).filter(([,v]) => v).map(([header]) => (
                        <td key={header} className="px-[8px] py-[4px] text-text truncate max-w-[150px]">{row[parsed.headers.indexOf(header)] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-[8px] justify-end">
              <button onClick={() => setStep('mapping')} className="px-[12px] py-[6px] text-[12px] text-text2 bg-surf2 rounded-[6px]">{t('common.back')}</button>
              <button onClick={handleImport} disabled={importing} className="px-[12px] py-[6px] text-[12px] font-bold text-white bg-mint-dd rounded-[6px] disabled:opacity-50">
                {importing ? t('crm.import.importing') : t('crm.import.execute')}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 'result' && result && (
          <div className="text-center py-[16px] space-y-[8px]">
            {result.errors === 0 ? (
              <CheckCircle className="w-[32px] h-[32px] text-emerald-500 mx-auto" />
            ) : (
              <AlertCircle className="w-[32px] h-[32px] text-amber-500 mx-auto" />
            )}
            <p className="text-[14px] font-bold text-text">{t('crm.import.complete')}</p>
            <p className="text-[12px] text-text2">
              {t('crm.import.imported')}: {result.imported} / {t('crm.import.errors')}: {result.errors}
            </p>
            <button onClick={reset} className="px-[14px] py-[6px] text-[12px] font-bold text-white bg-mint-dd rounded-[6px]">{t('crm.import.importMore')}</button>
          </div>
        )}
      </div>
    </div>
  )
}
