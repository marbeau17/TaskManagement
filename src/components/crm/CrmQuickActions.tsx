'use client'

import { Phone, Mail, FileText, Calendar } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useCreateCrmActivity } from '@/hooks/useCrm'
import { useAuth } from '@/hooks/useAuth'
import type { CrmEntityType, CrmActivityType } from '@/types/crm'

interface Props {
  entityType: CrmEntityType
  entityId: string
}

const ACTIONS: { type: CrmActivityType; icon: any; labelKey: string; color: string }[] = [
  { type: 'call', icon: Phone, labelKey: 'crm.action.logCall', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' },
  { type: 'email', icon: Mail, labelKey: 'crm.action.logEmail', color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' },
  { type: 'note', icon: FileText, labelKey: 'crm.action.addNote', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' },
  { type: 'meeting', icon: Calendar, labelKey: 'crm.action.logMeeting', color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10' },
]

export function CrmQuickActions({ entityType, entityId }: Props) {
  const { t } = useI18n()
  const { user } = useAuth()
  const createActivity = useCreateCrmActivity()

  const handleQuickAction = async (type: CrmActivityType) => {
    const subject = prompt(t('crm.activity.subject'))
    if (!subject?.trim() || !user) return

    await createActivity.mutateAsync({
      entity_type: entityType,
      entity_id: entityId,
      activity_type: type,
      subject: subject.trim(),
      user_id: user.id,
      is_completed: type === 'note',
    })
  }

  return (
    <div className="flex items-center gap-[6px] px-[16px] py-[8px] border-b border-border2 bg-surface shrink-0">
      {ACTIONS.map(action => (
        <button
          key={action.type}
          onClick={() => handleQuickAction(action.type)}
          disabled={createActivity.isPending}
          className={`flex items-center gap-[4px] px-[10px] py-[5px] rounded-[6px] text-[11px] font-medium transition-colors ${action.color} hover:opacity-80 disabled:opacity-50`}
        >
          <action.icon className="w-[12px] h-[12px]" />
          {t(action.labelKey)}
        </button>
      ))}
    </div>
  )
}
