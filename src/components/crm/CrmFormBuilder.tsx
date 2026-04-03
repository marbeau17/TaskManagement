'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical, Settings, Copy, Eye } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { CrmFormPreview } from './CrmFormPreview'
import type { FormField, FormSettings, FormFieldType } from '@/types/crm-form'

interface Props {
  initialFields?: FormField[]
  initialSettings?: Partial<FormSettings>
  initialName?: string
  initialDescription?: string
  onSave: (data: { name: string; description: string; fields: FormField[]; settings: FormSettings }) => void
  onCancel: () => void
  isSaving?: boolean
}

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: 'テキスト' },
  { value: 'email', label: 'メール' },
  { value: 'phone', label: '電話番号' },
  { value: 'textarea', label: 'テキストエリア' },
  { value: 'select', label: 'セレクト' },
  { value: 'checkbox', label: 'チェックボックス' },
  { value: 'number', label: '数値' },
  { value: 'date', label: '日付' },
  { value: 'hidden', label: '非表示' },
]

const CRM_MAPPINGS = [
  { value: '', label: '— マッピングなし —' },
  { value: 'first_name', label: '名' },
  { value: 'last_name', label: '姓' },
  { value: 'email', label: 'メール' },
  { value: 'phone', label: '電話番号' },
  { value: 'title', label: '役職' },
  { value: 'department', label: '部署' },
  { value: 'description', label: '説明' },
]

function generateId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

function defaultField(): FormField {
  return { id: generateId(), label: '', type: 'text', name: '', required: false, placeholder: '', width: 'full' }
}

const defaultSettings: FormSettings = {
  thankYouMessage: 'お問い合わせありがとうございます。担当者よりご連絡いたします。',
  submitButtonText: '送信',
  createContact: true,
}

export function CrmFormBuilder({ initialFields, initialSettings, initialName, initialDescription, onSave, onCancel, isSaving }: Props) {
  const { t } = useI18n()
  const [name, setName] = useState(initialName ?? '')
  const [description, setDescription] = useState(initialDescription ?? '')
  const [fields, setFields] = useState<FormField[]>(initialFields ?? [
    { id: generateId(), label: '姓', type: 'text', name: 'last_name', required: true, crmMapping: 'last_name', width: 'half' },
    { id: generateId(), label: '名', type: 'text', name: 'first_name', required: true, crmMapping: 'first_name', width: 'half' },
    { id: generateId(), label: 'メールアドレス', type: 'email', name: 'email', required: true, crmMapping: 'email', width: 'full' },
    { id: generateId(), label: '電話番号', type: 'phone', name: 'phone', required: false, crmMapping: 'phone', width: 'full' },
    { id: generateId(), label: 'お問い合わせ内容', type: 'textarea', name: 'message', required: true, width: 'full' },
  ])
  const [settings, setSettings] = useState<FormSettings>({ ...defaultSettings, ...initialSettings })
  const [showSettings, setShowSettings] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const addField = () => setFields(f => [...f, defaultField()])
  const removeField = (id: string) => setFields(f => f.filter(fi => fi.id !== id))
  const updateField = (id: string, patch: Partial<FormField>) =>
    setFields(f => f.map(fi => fi.id === id ? { ...fi, ...patch } : fi))

  const moveField = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= fields.length) return
    setFields(f => {
      const copy = [...f]; [copy[idx], copy[target]] = [copy[target], copy[idx]]; return copy
    })
  }

  const handleSave = () => {
    if (!name.trim()) return
    const processed = fields.map(f => ({
      ...f,
      name: f.name || f.label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_') || f.id,
    }))
    onSave({ name: name.trim(), description, fields: processed, settings })
  }

  const inputClass = 'w-full text-[12px] px-[8px] py-[5px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint'

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
      <div className="px-[16px] py-[12px] border-b border-border2 bg-surf2 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-text">{t('crm.forms.builder')}</h3>
        <div className="flex items-center gap-[8px]">
          <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-[4px] text-[11px] text-text2 hover:text-text">
            <Eye className="w-[14px] h-[14px]" /> {t('crm.forms.preview')}
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-[4px] text-[11px] text-text2 hover:text-text">
            <Settings className="w-[14px] h-[14px]" /> {t('crm.forms.settings')}
          </button>
        </div>
      </div>

      <div className="p-[16px] space-y-[12px]">
        {/* Form name & description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[8px]">
          <div>
            <label className="text-[11px] font-semibold text-text2 block mb-[4px]">{t('crm.forms.formName')} *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="お問い合わせフォーム" className={inputClass} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-text2 block mb-[4px]">{t('crm.forms.formDescription')}</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="サービスに関するお問い合わせ" className={inputClass} />
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-surf2 rounded-[8px] p-[12px] space-y-[8px] border border-border2">
            <div>
              <label className="text-[11px] font-semibold text-text2 block mb-[4px]">{t('crm.forms.thankYouMessage')}</label>
              <textarea value={settings.thankYouMessage} onChange={e => setSettings(s => ({...s, thankYouMessage: e.target.value}))} rows={2} className={`${inputClass} resize-y`} />
            </div>
            <div className="grid grid-cols-2 gap-[8px]">
              <div>
                <label className="text-[11px] font-semibold text-text2 block mb-[4px]">{t('crm.forms.submitButtonText')}</label>
                <input type="text" value={settings.submitButtonText} onChange={e => setSettings(s => ({...s, submitButtonText: e.target.value}))} className={inputClass} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-text2 block mb-[4px]">{t('crm.forms.redirectUrl')}</label>
                <input type="url" value={settings.redirectUrl ?? ''} onChange={e => setSettings(s => ({...s, redirectUrl: e.target.value || undefined}))} placeholder="https://..." className={inputClass} />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-text2 block mb-[4px]">{t('crm.forms.notificationEmail')}</label>
              <input type="email" value={settings.notificationEmail ?? ''} onChange={e => setSettings(s => ({...s, notificationEmail: e.target.value || undefined}))} placeholder="sales@example.com" className={inputClass} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-text2 block mb-[4px]">{t('crm.forms.formColor')}</label>
              <input type="color" value={settings.formColor ?? '#1a2d51'} onChange={e => setSettings(s => ({...s, formColor: e.target.value}))} className="w-[40px] h-[30px] rounded border border-border2 cursor-pointer" />
            </div>
            <label className="flex items-center gap-[6px] text-[12px] text-text">
              <input type="checkbox" checked={settings.createContact} onChange={e => setSettings(s => ({...s, createContact: e.target.checked}))} className="rounded" />
              {t('crm.forms.createContact')}
            </label>
          </div>
        )}

        {showPreview && (
          <CrmFormPreview fields={fields} settings={settings} formName={name} />
        )}

        {/* Fields */}
        <div className="space-y-[8px]">
          <label className="text-[11px] font-semibold text-text2 block">{t('crm.forms.fields')}</label>
          {fields.map((field, idx) => (
            <div key={field.id} className="bg-surf2 rounded-[8px] p-[10px] border border-border2">
              <div className="flex items-start gap-[6px]">
                <div className="flex flex-col gap-[2px] pt-[4px]">
                  <button onClick={() => moveField(idx, -1)} disabled={idx === 0} className="text-[10px] text-text3 hover:text-text disabled:opacity-30">↑</button>
                  <button onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1} className="text-[10px] text-text3 hover:text-text disabled:opacity-30">↓</button>
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-[6px]">
                  <input type="text" value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} placeholder="フィールド名" className={inputClass} />
                  <select value={field.type} onChange={e => updateField(field.id, { type: e.target.value as FormFieldType })} className={inputClass}>
                    {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                  </select>
                  <select value={field.crmMapping ?? ''} onChange={e => updateField(field.id, { crmMapping: e.target.value || undefined })} className={inputClass}>
                    {CRM_MAPPINGS.map(cm => <option key={cm.value} value={cm.value}>{cm.label}</option>)}
                  </select>
                  <div className="flex items-center gap-[6px]">
                    <select value={field.width ?? 'full'} onChange={e => updateField(field.id, { width: e.target.value as 'full' | 'half' })} className={`${inputClass} w-[70px]`}>
                      <option value="full">100%</option>
                      <option value="half">50%</option>
                    </select>
                    <label className="flex items-center gap-[2px] text-[10px] text-text2 whitespace-nowrap">
                      <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} className="rounded" />
                      必須
                    </label>
                    <button onClick={() => removeField(field.id)} className="text-danger hover:opacity-70 p-[2px]">
                      <Trash2 className="w-[12px] h-[12px]" />
                    </button>
                  </div>
                </div>
              </div>
              {(field.type === 'select') && (
                <div className="mt-[6px] ml-[20px]">
                  <input type="text" value={(field.options ?? []).join(', ')} onChange={e => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="選択肢をカンマ区切りで入力" className={inputClass} />
                </div>
              )}
            </div>
          ))}
          <button onClick={addField} className="w-full py-[8px] text-[12px] font-semibold text-mint-dd bg-mint-dd/5 border border-mint-dd/20 rounded-[8px] hover:bg-mint-dd/10 flex items-center justify-center gap-[4px]">
            <Plus className="w-[14px] h-[14px]" /> {t('crm.forms.addField')}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="px-[16px] py-[12px] border-t border-border2 flex gap-[8px] justify-end">
        <button onClick={onCancel} className="px-[14px] py-[6px] text-[12px] text-text2 bg-surf2 rounded-[6px]">{t('common.cancel')}</button>
        <button onClick={handleSave} disabled={isSaving || !name.trim()} className="px-[14px] py-[6px] text-[12px] font-bold text-white bg-mint-dd rounded-[6px] disabled:opacity-50">{t('common.save')}</button>
      </div>
    </div>
  )
}
