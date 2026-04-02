'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout'
import { NotificationBell } from '@/components/shared'
import { useI18n } from '@/hooks/useI18n'
import { CrmDashboard } from '@/components/crm/CrmDashboard'
import { CrmCompanyList } from '@/components/crm/CrmCompanyList'
import { CrmContactList } from '@/components/crm/CrmContactList'
import { CrmLeadList } from '@/components/crm/CrmLeadList'
import { CrmDealList } from '@/components/crm/CrmDealList'

const TABS = [
  { id: 'dashboard', labelKey: 'crm.dashboard' },
  { id: 'contacts', labelKey: 'crm.contacts' },
  { id: 'companies', labelKey: 'crm.companies' },
  { id: 'leads', labelKey: 'crm.leads' },
  { id: 'deals', labelKey: 'crm.deals' },
]

export default function CrmPage() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') ?? 'dashboard'

  const setTab = (tab: string) => {
    router.push(`/crm?tab=${tab}`, { scroll: false })
  }

  return (
    <>
      <Topbar title={t('crm.title')} subtitle={t('crm.subtitle') !== 'crm.subtitle' ? t('crm.subtitle') : ''}>
        <NotificationBell />
      </Topbar>

      <div className="flex-1 overflow-y-auto">
        {/* Tab bar */}
        <div className="px-[12px] md:px-[20px] pt-[12px]">
          <div className="flex items-center gap-[4px] border-b border-border2 pb-[1px]">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`px-[14px] py-[7px] text-[12px] font-semibold rounded-t-[8px] transition-colors ${
                  activeTab === tab.id
                    ? 'bg-surface text-mint-dd border border-border2 border-b-surface -mb-[1px]'
                    : 'text-text2 hover:text-text hover:bg-surf2'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-[12px] md:p-[20px]">
          {activeTab === 'dashboard' && <CrmDashboard />}
          {activeTab === 'contacts' && <CrmContactList />}
          {activeTab === 'companies' && <CrmCompanyList />}
          {activeTab === 'leads' && <CrmLeadList />}
          {activeTab === 'deals' && <CrmDealList />}
        </div>
      </div>
    </>
  )
}
