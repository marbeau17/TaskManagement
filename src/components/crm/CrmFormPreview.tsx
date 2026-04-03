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
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
        <h3 className="text-[13px] font-bold text-text">{t('crm.forms.preview')}</h3>
      </div>
      <div className="p-[20px]">
        {/* Simulated form */}
        <div className="max-w-[500px] mx-auto bg-white dark:bg-gray-900 rounded-[12px] border border-gray-200 dark:border-gray-700 p-[24px] shadow-lg">
          {formName && (
            <h2 className="text-[18px] font-bold text-gray-900 dark:text-gray-100 mb-[16px]">{formName}</h2>
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
                    className="w-full px-[10px] py-[8px] border border-gray-300 dark:border-gray-600 rounded-[6px] text-[13px] bg-gray-50 dark:bg-gray-800 text-gray-400 resize-none"
                  />
                ) : field.type === 'select' ? (
                  <select disabled className="w-full px-[10px] py-[8px] border border-gray-300 dark:border-gray-600 rounded-[6px] text-[13px] bg-gray-50 dark:bg-gray-800 text-gray-400">
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
                    className="w-full px-[10px] py-[8px] border border-gray-300 dark:border-gray-600 rounded-[6px] text-[13px] bg-gray-50 dark:bg-gray-800 text-gray-400"
                  />
                )}
                {field.crmMapping && (
                  <span className="text-[9px] text-mint-dd mt-[2px] block">→ CRM: {field.crmMapping}</span>
                )}
              </div>
            ))}
          </div>
          <button
            disabled
            className="mt-[16px] w-full py-[10px] rounded-[6px] text-[14px] font-bold text-white"
            style={{ backgroundColor: settings.formColor ?? '#1a2d51' }}
          >
            {settings.submitButtonText || '送信'}
          </button>
        </div>
      </div>
    </div>
  )
}
