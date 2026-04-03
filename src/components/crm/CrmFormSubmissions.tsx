'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, User, Clock, Globe } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import type { CrmForm, CrmFormSubmission } from '@/types/crm-form'

interface Props {
  form: CrmForm
  onBack: () => void
}

export function CrmFormSubmissions({ form, onBack }: Props) {
  const { t } = useI18n()
  const [submissions, setSubmissions] = useState<CrmFormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CrmFormSubmission | null>(null)

  useEffect(() => {
    fetch(`/api/crm/forms/${form.id}/submissions`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSubmissions(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [form.id])

  const formatDate = (d: string) => new Date(d).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-[4px] text-[12px] text-mint-dd hover:underline">
          <ArrowLeft className="w-[14px] h-[14px]" /> {t('common.back')}
        </button>
        <span className="text-[12px] text-text2">{form.name} — {submissions.length} {t('crm.forms.submissionsCount')}</span>
      </div>

      <div className="flex gap-[12px]">
        {/* Submissions list */}
        <div className="flex-1 bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
          {loading ? (
            <div className="p-[16px] animate-pulse space-y-[8px]">
              {[1,2,3].map(i => <div key={i} className="h-[48px] bg-surf2 rounded" />)}
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-[24px] text-center text-[12px] text-text3">{t('crm.forms.noSubmissions')}</div>
          ) : (
            <div className="divide-y divide-border2 max-h-[600px] overflow-y-auto">
              {submissions.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSelected(sub)}
                  className={`w-full text-left px-[12px] py-[10px] hover:bg-surf2 transition-colors ${selected?.id === sub.id ? 'bg-surf2' : ''}`}
                >
                  <div className="flex items-center gap-[8px]">
                    <User className="w-[14px] h-[14px] text-text3 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-text truncate">
                        {sub.data?.email || sub.data?.last_name ? `${sub.data.last_name ?? ''} ${sub.data.first_name ?? ''}`.trim() : t('crm.forms.anonymous')}
                      </p>
                      <p className="text-[10px] text-text3">{sub.data?.email ?? ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-text3">{formatDate(sub.created_at)}</p>
                      <span className={`text-[9px] px-[5px] py-[1px] rounded-full font-bold ${
                        sub.status === 'new' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                        : sub.status === 'contacted' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                        : sub.status === 'qualified' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300'
                      }`}>{sub.status}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-[320px] bg-surface border border-border2 rounded-[10px] shadow p-[14px] space-y-[10px] shrink-0">
            <h4 className="text-[13px] font-bold text-text">{t('crm.forms.submissionDetail')}</h4>
            <div className="flex items-center gap-[6px] text-[10px] text-text3">
              <Clock className="w-[12px] h-[12px]" /> {formatDate(selected.created_at)}
            </div>
            {selected.source_url && (
              <div className="flex items-center gap-[6px] text-[10px] text-text3 truncate">
                <Globe className="w-[12px] h-[12px] shrink-0" /> {selected.source_url}
              </div>
            )}
            {selected.contact && (
              <div className="bg-mint-dd/5 border border-mint-dd/20 rounded-[6px] px-[10px] py-[6px]">
                <p className="text-[10px] text-mint-dd font-semibold">{t('crm.forms.linkedContact')}</p>
                <p className="text-[12px] text-text">{selected.contact.last_name} {selected.contact.first_name}</p>
                <p className="text-[11px] text-text2">{selected.contact.email}</p>
              </div>
            )}
            <div className="border-t border-border2 pt-[8px]">
              <p className="text-[11px] font-semibold text-text2 mb-[6px]">{t('crm.forms.submittedData')}</p>
              {Object.entries(selected.data ?? {}).filter(([k]) => !k.startsWith('_')).map(([key, value]) => (
                <div key={key} className="flex items-start gap-[6px] mb-[4px]">
                  <span className="text-[10px] text-text3 w-[80px] shrink-0 font-mono">{key}</span>
                  <span className="text-[11px] text-text flex-1 break-all">{String(value)}</span>
                </div>
              ))}
            </div>
            {(selected.utm_source || selected.utm_medium || selected.utm_campaign) && (
              <div className="border-t border-border2 pt-[8px]">
                <p className="text-[10px] font-semibold text-text3 mb-[4px]">UTM</p>
                {selected.utm_source && <p className="text-[10px] text-text3">source: {selected.utm_source}</p>}
                {selected.utm_medium && <p className="text-[10px] text-text3">medium: {selected.utm_medium}</p>}
                {selected.utm_campaign && <p className="text-[10px] text-text3">campaign: {selected.utm_campaign}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
