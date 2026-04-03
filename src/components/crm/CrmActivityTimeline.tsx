'use client'

import { useState } from 'react'
import { Phone, Mail, Calendar, FileText, CheckCircle, ArrowRightLeft, Bell, Settings } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useCreateCrmActivity } from '@/hooks/useCrm'
import { useAuth } from '@/hooks/useAuth'
import type { CrmActivity, CrmActivityType, CrmEntityType } from '@/types/crm'

interface Props {
  activities: CrmActivity[]
  entityType: CrmEntityType
  entityId: string
}

const ACTIVITY_ICONS: Record<CrmActivityType, any> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task: CheckCircle,
  stage_change: ArrowRightLeft,
  status_change: Bell,
  system: Settings,
}

const ACTIVITY_COLORS: Record<CrmActivityType, string> = {
  call: 'bg-blue-500',
  email: 'bg-indigo-500',
  meeting: 'bg-purple-500',
  note: 'bg-amber-500',
  task: 'bg-green-500',
  stage_change: 'bg-cyan-500',
  status_change: 'bg-orange-500',
  system: 'bg-gray-400',
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

export function CrmActivityTimeline({ activities, entityType, entityId }: Props) {
  const { t } = useI18n()
  const { user } = useAuth()
  const createActivity = useCreateCrmActivity()
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<CrmActivityType>('note')
  const [formSubject, setFormSubject] = useState('')
  const [formBody, setFormBody] = useState('')

  const handleSubmit = async () => {
    if (!formSubject.trim() || !user) return
    await createActivity.mutateAsync({
      entity_type: entityType,
      entity_id: entityId,
      activity_type: formType,
      subject: formSubject.trim(),
      body: formBody.trim(),
      user_id: user.id,
      is_completed: formType === 'note',
    })
    setFormSubject('')
    setFormBody('')
    setShowForm(false)
  }

  return (
    <div className="space-y-[12px]">
      {/* Add activity button */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-[8px] text-[12px] font-semibold text-mint-dd bg-mint-dd/5 border border-mint-dd/20 rounded-[8px] hover:bg-mint-dd/10 transition-colors"
        >
          + {t('crm.activity.add')}
        </button>
      ) : (
        <div className="bg-surf2 rounded-[8px] p-[12px] space-y-[8px] border border-border2">
          <div className="flex gap-[6px]">
            {(['note', 'call', 'email', 'meeting'] as CrmActivityType[]).map(type => {
              const Icon = ACTIVITY_ICONS[type]
              return (
                <button
                  key={type}
                  onClick={() => setFormType(type)}
                  className={`flex items-center gap-[4px] px-[8px] py-[4px] rounded-[6px] text-[11px] font-medium transition-colors ${
                    formType === type ? 'bg-mint-dd text-white' : 'bg-surface text-text2 border border-border2 hover:border-mint'
                  }`}
                >
                  <Icon className="w-[12px] h-[12px]" />
                  {t(`crm.activity.${type}`)}
                </button>
              )
            })}
          </div>
          <input
            type="text"
            value={formSubject}
            onChange={e => setFormSubject(e.target.value)}
            placeholder={t('crm.activity.subject')}
            className="w-full text-[12px] px-[8px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
          />
          <textarea
            value={formBody}
            onChange={e => setFormBody(e.target.value)}
            placeholder={t('crm.activity.body')}
            rows={2}
            className="w-full text-[12px] px-[8px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint resize-y"
          />
          <div className="flex gap-[6px] justify-end">
            <button onClick={() => setShowForm(false)} className="px-[10px] py-[4px] text-[11px] text-text2 bg-surface border border-border2 rounded-[6px]">{t('common.cancel')}</button>
            <button onClick={handleSubmit} disabled={createActivity.isPending || !formSubject.trim()} className="px-[10px] py-[4px] text-[11px] font-bold text-white bg-mint-dd rounded-[6px] disabled:opacity-50">{t('common.save')}</button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {activities.length === 0 ? (
        <p className="text-[12px] text-text3 text-center py-[16px]">{t('crm.activity.empty')}</p>
      ) : (
        <div className="flex flex-col">
          {activities.map((act, i) => {
            const Icon = ACTIVITY_ICONS[act.activity_type] ?? FileText
            const color = ACTIVITY_COLORS[act.activity_type] ?? 'bg-gray-400'
            const isLast = i === activities.length - 1
            return (
              <div key={act.id} className="flex gap-[10px]">
                <div className="flex flex-col items-center">
                  <div className={`w-[24px] h-[24px] rounded-full ${color} shrink-0 flex items-center justify-center`}>
                    <Icon className="w-[12px] h-[12px] text-white" />
                  </div>
                  {!isLast && <div className="w-[1px] flex-1 bg-border2 min-h-[16px]" />}
                </div>
                <div className="flex-1 pb-[12px]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[12px] font-semibold text-text">{act.subject || t(`crm.activity.${act.activity_type}`)}</p>
                      {act.body && <p className="text-[11px] text-text2 mt-[2px] whitespace-pre-wrap line-clamp-3">{act.body}</p>}
                      {act.outcome && <p className="text-[10px] text-mint-dd mt-[2px]">{'\u2192'} {act.outcome}</p>}
                    </div>
                    <span className="text-[10px] text-text3 whitespace-nowrap ml-[8px]">
                      {formatTimeAgo(act.created_at)}
                    </span>
                  </div>
                  <span className="text-[10px] text-text3">{act.user?.name ?? ''}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
