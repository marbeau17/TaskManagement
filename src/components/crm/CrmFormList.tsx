'use client'

import { useState, useEffect } from 'react'
import { Plus, Code, Eye, Edit2, Trash2 } from 'lucide-react'
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
    <div className="flex flex-col gap-[12px]">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-text">{t('crm.forms.title')}</h3>
        <button onClick={() => { setSelectedForm(null); setView('create') }} className="flex items-center gap-[4px] px-[14px] py-[6px] text-[12px] font-bold bg-mint-dd text-white rounded-[6px] hover:bg-mint-d">
          <Plus className="w-[14px] h-[14px]" /> {t('crm.forms.createForm')}
        </button>
      </div>

      {loading ? (
        <div className="space-y-[8px] animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-[72px] bg-surf2 rounded-[10px]" />)}
        </div>
      ) : forms.length === 0 ? (
        <div className="bg-surface border border-border2 rounded-[10px] shadow p-[40px] text-center">
          <p className="text-[14px] text-text3">{t('crm.forms.empty')}</p>
        </div>
      ) : (
        <div className="space-y-[8px]">
          {forms.map(form => (
            <div key={form.id} className="bg-surface border border-border2 rounded-[10px] shadow p-[14px] flex items-center gap-[12px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[6px]">
                  <h4 className="text-[13px] font-bold text-text">{form.name}</h4>
                  <span className={`text-[9px] px-[6px] py-[1px] rounded-full font-bold ${form.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300'}`}>
                    {form.status}
                  </span>
                </div>
                <p className="text-[11px] text-text3 mt-[2px]">
                  {form.description || t('crm.forms.noDescription')} • {form.fields?.length ?? 0} {t('crm.forms.fieldsCount')} • {form.submit_count ?? 0} {t('crm.forms.submissionsCount')}
                </p>
              </div>
              <div className="flex items-center gap-[4px] shrink-0">
                <button onClick={() => { setSelectedForm(form); setView('submissions') }} title={t('crm.forms.viewSubmissions')} className="p-[6px] rounded-[6px] text-text2 hover:bg-surf2"><Eye className="w-[14px] h-[14px]" /></button>
                <button onClick={() => { setSelectedForm(form); setView('embed') }} title={t('crm.forms.embedCode')} className="p-[6px] rounded-[6px] text-text2 hover:bg-surf2"><Code className="w-[14px] h-[14px]" /></button>
                <button onClick={() => { setSelectedForm(form); setView('edit') }} title={t('common.edit')} className="p-[6px] rounded-[6px] text-text2 hover:bg-surf2"><Edit2 className="w-[14px] h-[14px]" /></button>
                <button onClick={() => handleDelete(form.id)} title={t('common.delete')} className="p-[6px] rounded-[6px] text-danger hover:bg-danger/5"><Trash2 className="w-[14px] h-[14px]" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
