'use client'

import { useI18n } from '@/hooks/useI18n'
import type { FormField, FormSettings } from '@/types/crm-form'

interface Props {
  fields: FormField[]
  settings: FormSettings
  formName?: string
}

export function CrmFormPreview({ fields, settings, formName }: Props) {
  const { t } = useI18n()

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
      <div className="px-[14px] py-[10px] border-b border-border2 bg-gradient-to-r from-surf2 to-surface flex items-center gap-[6px]">
        <span className="text-[16px]">👁️</span>
        <h3 className="text-[13px] font-bold text-text">{t('crm.forms.preview')}</h3>
        <span className="text-[10px] text-text3 ml-auto">Live Preview</span>
      </div>
      <div className="p-[20px]">
        {/* Simulated form */}
        <div className="max-w-[500px] mx-auto bg-white dark:bg-gray-900 rounded-[16px] border border-gray-200 dark:border-gray-700 p-[28px] shadow-xl ring-1 ring-black/5 dark:ring-white/5">
          {formName && (
            <div className="flex items-center gap-[8px] mb-[20px]">
              <div className="w-[36px] h-[36px] rounded-[8px] flex items-center justify-center" style={{ backgroundColor: (settings.formColor ?? '#1a2d51') + '15' }}>
                <span className="text-[18px]">📋</span>
              </div>
              <h2 className="text-[18px] font-bold text-gray-900 dark:text-gray-100">{formName}</h2>
            </div>
          )}
          <div className="flex flex-wrap gap-x-[12px] gap-y-[12px]">
            {fields.filter(f => f.type !== 'hidden').map(field => (
              <div key={field.id} className={field.width === 'half' ? 'w-[calc(50%-6px)]' : 'w-full'}>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-[4px]">
                  {field.label || 'Untitled'}
                  {field.required && <span className="text-red-500 ml-[2px]">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    disabled
                    rows={3}
                    placeholder={field.placeholder || ''}
                    className="w-full px-[10px] py-[8px] border border-gray-300 dark:border-gray-600 rounded-[6px] text-[13px] bg-gray-50 dark:bg-gray-800 text-gray-400 focus:ring-2 focus:ring-offset-1 resize-none"
                  />
                ) : field.type === 'select' ? (
                  <select disabled className="w-full px-[10px] py-[8px] border border-gray-300 dark:border-gray-600 rounded-[6px] text-[13px] bg-gray-50 dark:bg-gray-800 text-gray-400 focus:ring-2 focus:ring-offset-1">
                    <option>{field.placeholder || '選択してください'}</option>
                    {(field.options ?? []).map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-[6px] text-[13px] text-gray-600 dark:text-gray-400">
                    <input type="checkbox" disabled className="rounded" /> {field.label}
                  </label>
                ) : (
                  <input
                    type={field.type}
                    disabled
                    placeholder={field.placeholder || ''}
                    className="w-full px-[10px] py-[8px] border border-gray-300 dark:border-gray-600 rounded-[6px] text-[13px] bg-gray-50 dark:bg-gray-800 text-gray-400 focus:ring-2 focus:ring-offset-1"
                  />
                )}
                {field.crmMapping && (
                  <div className="flex items-center gap-[4px] mt-[4px]">
                    <span className="w-[4px] h-[4px] rounded-full bg-mint-dd" />
                    <span className="text-[9px] text-mint-dd font-medium">CRM → {field.crmMapping}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            disabled
            className="mt-[20px] w-full py-[12px] rounded-[8px] text-[14px] font-bold text-white shadow-md hover:shadow-lg transition-shadow"
            style={{ background: `linear-gradient(135deg, ${settings.formColor ?? '#1a2d51'}, ${settings.formColor ?? '#1a2d51'}cc)` }}
          >
            {settings.submitButtonText || '送信'}
          </button>
        </div>
      </div>
    </div>
  )
}
