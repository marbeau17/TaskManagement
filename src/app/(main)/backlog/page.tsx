'use client'

import { Topbar } from '@/components/layout'
import { BacklogPanel } from '@/components/backlog/BacklogPanel'
import { useI18n } from '@/hooks/useI18n'

export default function BacklogPage() {
  const { t } = useI18n()
  return (
    <>
      <Topbar title={'🗂 ' + t('backlog.pageTitle')} subtitle={t('backlog.description')} />
      <div className="flex-1 overflow-y-auto bg-bg">
        <BacklogPanel />
      </div>
    </>
  )
}
