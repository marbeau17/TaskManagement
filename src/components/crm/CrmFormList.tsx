'use client'

import { useState, useEffect } from 'react'
import { Plus, Code, Eye, Edit2, Trash2, FileText, Layers, BarChart3, Clock } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useQueryClient } from '@tanstack/react-query'
import { CrmFormBuilder } from './CrmFormBuilder'
import { CrmFormEmbed } from './CrmFormEmbed'
import { CrmFormSubmissions } from './CrmFormSubmissions'
import type { CrmForm } from '@/types/crm-form'

type View = 'list' | 'create' | 'edit' | 'embed' | 'submissions'

export function CrmFormList() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const [forms, setForms] = useState<CrmForm[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [selectedForm, setSelectedForm] = useState<CrmForm | null>(null)

  const fetchForms = async () => {
    try {
      const res = await fetch('/api/crm/forms')
      if (res.ok) setForms(await res.json())
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchForms() }, [])

  const handleSave = async (data: any) => {
    const method = selectedForm ? 'PATCH' : 'POST'
    const url = selectedForm ? `/api/crm/forms/${selectedForm.id}` : '/api/crm/forms'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) {
      await fetchForms()
      setView('list')
      setSelectedForm(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.deleteConfirm'))) return
    await fetch(`/api/crm/forms/${id}`, { method: 'DELETE' })
    await fetchForms()
  }

  if (view === 'create' || view === 'edit') {
    return (
      <CrmFormBuilder
        initialFields={selectedForm?.fields}
        initialSettings={selectedForm?.settings}
        initialName={selectedForm?.name}
        initialDescription={selectedForm?.description}
        onSave={handleSave}
        onCancel={() => { setView('list'); setSelectedForm(null) }}
      />
    )
  }

  if (view === 'embed' && selectedForm) {
    return <CrmFormEmbed form={selectedForm} onBack={() => setView('list')} />
  }

  if (view === 'submissions' && selectedForm) {
    return <CrmFormSubmissions form={selectedForm} onBack={() => setView('list')} />
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-text">{t('crm.forms.title')}</h3>
        <button onClick={() => { setSelectedForm(null); setView('create') }} className="flex items-center gap-[6px] px-[16px] py-[8px] text-[12px] font-bold bg-mint-dd text-white rounded-[8px] hover:bg-mint-d transition-colors shadow-sm">
          <Plus className="w-[14px] h-[14px]" /> {t('crm.forms.createForm')}
        </button>
      </div>

      {loading ? (
        <div className="space-y-[10px] animate-pulse">
          {[1,2,3].map(i => (
            <div key={i} className="bg-surface border border-border2 rounded-[12px] overflow-hidden">
              <div className="h-[3px] bg-gray-200 dark:bg-gray-700" />
              <div className="p-[16px] flex items-start gap-[14px]">
                <div className="w-[44px] h-[44px] rounded-[10px] bg-surf2" />
                <div className="flex-1 space-y-[8px]">
                  <div className="h-[14px] bg-surf2 rounded w-[40%]" />
                  <div className="h-[12px] bg-surf2 rounded w-[60%]" />
                  <div className="h-[11px] bg-surf2 rounded w-[50%]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : forms.length === 0 ? (
        <div className="bg-surface border border-border2 rounded-[12px] shadow p-[48px] text-center">
          <div className="w-[64px] h-[64px] rounded-full bg-gradient-to-br from-mint-dd/20 to-emerald-500/10 flex items-center justify-center mx-auto mb-[16px]">
            <FileText className="w-[28px] h-[28px] text-mint-dd" />
          </div>
          <p className="text-[16px] font-bold text-text mb-[4px]">{t('crm.forms.empty')}</p>
          <p className="text-[12px] text-text3 mb-[16px]">お問い合わせフォームを作成して、リード獲得を始めましょう</p>
          <button onClick={() => { setSelectedForm(null); setView('create') }} className="inline-flex items-center gap-[6px] px-[20px] py-[10px] text-[13px] font-bold bg-mint-dd text-white rounded-[8px] hover:bg-mint-d transition-colors shadow-sm">
            <Plus className="w-[16px] h-[16px]" /> {t('crm.forms.createForm')}
          </button>
        </div>
      ) : (
        <div className="space-y-[10px]">
          {forms.map(form => (
            <div key={form.id} className="bg-surface border border-border2 rounded-[12px] shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              {/* Color accent bar */}
              <div className={`h-[3px] ${form.status === 'active' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gray-300 dark:bg-gray-600'}`} />

              <div className="p-[16px] flex items-start gap-[14px]">
                {/* Form icon */}
                <div className={`w-[44px] h-[44px] rounded-[10px] flex items-center justify-center shrink-0 ${
                  form.status === 'active'
                    ? 'bg-gradient-to-br from-mint-dd/20 to-emerald-500/10 text-mint-dd'
                    : 'bg-surf2 text-text3'
                }`}>
                  <FileText className="w-[22px] h-[22px]" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[8px] mb-[4px]">
                    <h4 className="text-[14px] font-bold text-text truncate">{form.name}</h4>
                    {form.status === 'active' ? (
                      <span className="flex items-center gap-[4px] text-[9px] px-[8px] py-[2px] rounded-full font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-[6px] h-[6px] rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    ) : (
                      <span className="text-[9px] px-[8px] py-[2px] rounded-full font-bold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        Inactive
                      </span>
                    )}
                  </div>

                  <p className="text-[12px] text-text2 mb-[8px] line-clamp-1">
                    {form.description || t('crm.forms.noDescription')}
                  </p>

                  {/* Stats row */}
                  <div className="flex items-center gap-[12px]">
                    <div className="flex items-center gap-[4px] text-[11px] text-text3">
                      <Layers className="w-[12px] h-[12px]" />
                      <span>{form.fields?.length ?? 0} {t('crm.forms.fieldsCount')}</span>
                    </div>
                    <div className="flex items-center gap-[4px] text-[11px] text-text3">
                      <BarChart3 className="w-[12px] h-[12px]" />
                      <span className="font-semibold text-text">{form.submit_count ?? 0}</span> {t('crm.forms.submissionsCount')}
                    </div>
                    <div className="flex items-center gap-[4px] text-[11px] text-text3">
                      <Clock className="w-[12px] h-[12px]" />
                      <span>{new Date(form.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-[2px] shrink-0">
                  <button onClick={() => { setSelectedForm(form); setView('submissions') }} title={t('crm.forms.viewSubmissions')}
                    className="p-[8px] rounded-[8px] text-text3 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                    <Eye className="w-[16px] h-[16px]" />
                  </button>
                  <button onClick={() => { setSelectedForm(form); setView('embed') }} title={t('crm.forms.embedCode')}
                    className="p-[8px] rounded-[8px] text-text3 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                    <Code className="w-[16px] h-[16px]" />
                  </button>
                  <button onClick={() => { setSelectedForm(form); setView('edit') }} title={t('common.edit')}
                    className="p-[8px] rounded-[8px] text-text3 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                    <Edit2 className="w-[16px] h-[16px]" />
                  </button>
                  <button onClick={() => handleDelete(form.id)} title={t('common.delete')}
                    className="p-[8px] rounded-[8px] text-text3 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-[16px] h-[16px]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
