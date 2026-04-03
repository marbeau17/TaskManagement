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
import { CrmGlobalSearch } from '@/components/crm/CrmGlobalSearch'
import { CrmDealKanban } from '@/components/crm/CrmDealKanban'
import { CrmFunnelChart } from '@/components/crm/CrmFunnelChart'
import { CrmUpcomingTasks } from '@/components/crm/CrmUpcomingTasks'
import { CrmWinLossAnalysis } from '@/components/crm/CrmWinLossAnalysis'
import { CrmImportWizard } from '@/components/crm/CrmImportWizard'
import { CrmCampaignList } from '@/components/crm/CrmCampaignList'
import { CrmSourceChart } from '@/components/crm/CrmSourceChart'
import { CrmFormList } from '@/components/crm/CrmFormList'
import { CrmInbox } from '@/components/crm/CrmInbox'
import { CrmDetailPanel } from '@/components/crm/CrmDetailPanel'
import type { CrmEntityType } from '@/types/crm'

const TABS = [
  { id: 'dashboard', labelKey: 'crm.dashboard' },
  { id: 'contacts', labelKey: 'crm.contacts' },
  { id: 'companies', labelKey: 'crm.companies' },
  { id: 'leads', labelKey: 'crm.leads' },
  { id: 'deals', labelKey: 'crm.deals' },
  { id: 'campaigns', labelKey: 'crm.campaign.title' },
  { id: 'forms', labelKey: 'crm.forms.title' },
  { id: 'inbox', labelKey: 'crm.inbox.title' },
  { id: 'import', labelKey: 'crm.import.title' },
]

export default function CrmPage() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') ?? 'dashboard'
  const [detailPanel, setDetailPanel] = useState<{ type: CrmEntityType; entity: any } | null>(null)
  const [dealView, setDealView] = useState<'list' | 'kanban'>('list')

  const setTab = (tab: string) => {
    router.push(`/crm?tab=${tab}`, { scroll: false })
  }

  return (
    <>
      <Topbar title={t('crm.title')} subtitle={t('crm.subtitle') !== 'crm.subtitle' ? t('crm.subtitle') : ''}>
        <CrmGlobalSearch onSelect={(type, entity) => setDetailPanel({ type: type as CrmEntityType, entity })} />
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
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-[16px]">
              <CrmDashboard />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-[16px]">
                <CrmFunnelChart />
                <CrmSourceChart />
                <CrmUpcomingTasks />
              </div>
              <CrmWinLossAnalysis />
            </div>
          )}
          {activeTab === 'contacts' && <CrmContactList />}
          {activeTab === 'companies' && <CrmCompanyList />}
          {activeTab === 'leads' && <CrmLeadList />}
          {activeTab === 'deals' && (
            <div>
              <div className="flex items-center gap-[8px] mb-[12px]">
                <button onClick={() => setDealView('list')} className={`px-[10px] py-[4px] text-[11px] font-semibold rounded-[6px] ${dealView === 'list' ? 'bg-mint-dd text-white' : 'bg-surf2 text-text2'}`}>
                  {t('crm.deals.listView')}
                </button>
                <button onClick={() => setDealView('kanban')} className={`px-[10px] py-[4px] text-[11px] font-semibold rounded-[6px] ${dealView === 'kanban' ? 'bg-mint-dd text-white' : 'bg-surf2 text-text2'}`}>
                  {t('crm.deals.kanbanView')}
                </button>
              </div>
              {dealView === 'list' ? <CrmDealList /> : <CrmDealKanban onDealClick={d => setDetailPanel({ type: 'deal', entity: d })} />}
            </div>
          )}
          {activeTab === 'campaigns' && <CrmCampaignList />}
          {activeTab === 'forms' && <CrmFormList />}
          {activeTab === 'inbox' && <CrmInbox />}
          {activeTab === 'import' && <CrmImportWizard />}
        </div>
      </div>

      <CrmDetailPanel
        open={!!detailPanel}
        onClose={() => setDetailPanel(null)}
        entityType={detailPanel?.type ?? 'contact'}
        entity={detailPanel?.entity}
      />
    </>
  )
}
