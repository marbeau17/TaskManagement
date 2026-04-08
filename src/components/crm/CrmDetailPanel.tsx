'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Phone, Mail, Building2, User, Calendar, DollarSign } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useCrmActivities } from '@/hooks/useCrm'
import { CrmActivityTimeline } from './CrmActivityTimeline'
import { CrmQuickActions } from './CrmQuickActions'
import type { CrmEntityType } from '@/types/crm'

interface Props {
  open: boolean
  onClose: () => void
  entityType: CrmEntityType
  entity: any // CrmCompany | CrmContact | CrmLead | CrmDeal
  onUpdate?: (data: any) => void
}

type TabId = 'overview' | 'activities' | 'related'

export function CrmDetailPanel({ open, onClose, entityType, entity, onUpdate }: Props) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const { data: activitiesData } = useCrmActivities(entityType, entity?.id)

  if (!open || !entity) return null

  const displayName = entityType === 'contact'
    ? `${entity.last_name} ${entity.first_name}`
    : entityType === 'deal'
      ? entity.title
      : entity.name ?? entity.title ?? ''

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: t('crm.detail.overview') },
    { id: 'activities', label: t('crm.detail.activities') },
    { id: 'related', label: t('crm.detail.related') },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-full md:max-w-[480px] bg-surface border-l border-border2 shadow-2xl z-50 flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-[16px] py-[12px] border-b border-border2 bg-surf2 shrink-0">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-mint-dd font-bold uppercase tracking-wider">{t(`crm.${entityType}`)}</span>
            <h2 className="text-[15px] font-bold text-text truncate">{displayName}</h2>
          </div>
          <button onClick={onClose} className="p-[6px] rounded-[6px] text-text2 hover:bg-border2 transition-colors">
            <X className="w-[16px] h-[16px]" />
          </button>
        </div>

        {/* Quick Actions */}
        <CrmQuickActions entityType={entityType} entityId={entity.id} />

        {/* Tabs */}
        <div className="flex border-b border-border2 px-[16px] shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-[12px] py-[8px] text-[12px] font-semibold transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-mint-dd border-mint-dd'
                  : 'text-text2 border-transparent hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-[16px]">
          {activeTab === 'overview' && (
            <div className="space-y-[12px]">
              {entityType === 'contact' && (
                <>
                  <InfoRow icon={Mail} label={t('crm.contact.email')} value={entity.email} />
                  <InfoRow icon={Phone} label={t('crm.contact.phone')} value={entity.phone} />
                  <InfoRow icon={Building2} label={t('crm.contact.company')} value={entity.company?.name} />
                  <InfoRow icon={User} label={t('crm.contact.lifecycle')} value={entity.lifecycle_stage} />
                  <ScoreBar label={t('crm.contact.score')} value={entity.lead_score ?? 0} />
                </>
              )}
              {entityType === 'company' && (
                <>
                  <InfoRow icon={Building2} label={t('crm.company.industry')} value={entity.industry} />
                  <InfoRow icon={Phone} label={t('crm.company.phone')} value={entity.phone} />
                  <InfoRow icon={Mail} label={t('crm.company.domain')} value={entity.domain} />
                  <InfoRow icon={User} label={t('crm.company.owner')} value={entity.owner?.name} />
                </>
              )}
              {entityType === 'deal' && (
                <>
                  <InfoRow icon={DollarSign} label={t('crm.deal.amount')} value={`¥${(entity.amount ?? 0).toLocaleString()}`} />
                  <InfoRow icon={Building2} label={t('crm.company.name')} value={entity.company?.name} />
                  <InfoRow icon={Calendar} label={t('crm.deal.closeDate')} value={entity.expected_close_date} />
                  <InfoRow icon={User} label={t('crm.company.owner')} value={entity.owner?.name} />
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[11px] text-text2 w-[100px]">{t('crm.deal.probability')}</span>
                    <div className="flex-1 bg-surf2 rounded-full h-[8px] overflow-hidden">
                      <div className="bg-mint-dd h-full rounded-full" style={{ width: `${entity.probability ?? 0}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-text">{entity.probability ?? 0}%</span>
                  </div>
                  <EditableSalesContribution
                    value={entity.sales_contribution ?? 0}
                    entityType="deal"
                    entityId={entity.id}
                    onSaved={(v) => { entity.sales_contribution = v; onUpdate?.({ ...entity, sales_contribution: v }) }}
                  />
                </>
              )}
              {entityType === 'lead' && (
                <>
                  <InfoRow icon={DollarSign} label={t('crm.lead.value')} value={`¥${(entity.estimated_value ?? 0).toLocaleString()}`} />
                  <InfoRow icon={Building2} label={t('crm.company.name')} value={entity.company?.name} />
                  <InfoRow icon={User} label={t('crm.company.owner')} value={entity.owner?.name} />
                  <EditableSalesContribution
                    value={entity.sales_contribution ?? 0}
                    entityType="lead"
                    entityId={entity.id}
                    onSaved={(v) => { entity.sales_contribution = v; onUpdate?.({ ...entity, sales_contribution: v }) }}
                  />
                </>
              )}
              {entity.description && (
                <div className="mt-[12px] p-[12px] bg-surf2 rounded-[8px]">
                  <span className="text-[10px] text-text3 font-semibold uppercase">{t('crm.detail.description')}</span>
                  <p className="text-[12px] text-text mt-[4px] whitespace-pre-wrap">{entity.description}</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'activities' && (
            <CrmActivityTimeline
              activities={activitiesData?.data ?? []}
              entityType={entityType}
              entityId={entity.id}
            />
          )}
          {activeTab === 'related' && (
            <div className="text-[12px] text-text3 text-center py-[20px]">
              {t('crm.detail.noRelated')}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function EditableSalesContribution({
  value,
  entityType,
  entityId,
  onSaved,
}: {
  value: number
  entityType: 'lead' | 'deal'
  entityId: string
  onSaved?: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [displayValue, setDisplayValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDisplayValue(value)
  }, [value])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const save = useCallback(async () => {
    const clamped = Math.max(0, Math.min(100, Math.round(draft)))
    setEditing(false)
    if (clamped === displayValue) return
    setDisplayValue(clamped)
    try {
      const endpoint = entityType === 'lead'
        ? `/api/crm/leads/${entityId}`
        : `/api/crm/deals/${entityId}`
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales_contribution: clamped }),
      })
      onSaved?.(clamped)
    } catch {
      setDisplayValue(value)
    }
  }, [draft, displayValue, entityType, entityId, value, onSaved])

  const cancel = useCallback(() => {
    setEditing(false)
    setDraft(displayValue)
  }, [displayValue])

  if (editing) {
    return (
      <div className="flex items-center gap-[8px]">
        <span className="text-[11px] text-text2 w-[100px]">営業貢献度</span>
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={100}
          value={draft}
          onChange={(e) => setDraft(Number(e.target.value))}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); save() }
            if (e.key === 'Escape') { e.preventDefault(); cancel() }
          }}
          className="flex-1 h-[28px] px-[8px] text-[12px] bg-surf2 border border-mint-dd rounded-[6px] text-text outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-[11px] font-bold text-text w-[28px] text-right">%</span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-[8px] cursor-pointer group"
      onClick={() => { setDraft(displayValue); setEditing(true) }}
      title="クリックして編集"
    >
      <span className="text-[11px] text-text2 w-[100px]">営業貢献度</span>
      <div className="flex-1 bg-surf2 rounded-full h-[8px] overflow-hidden group-hover:ring-1 group-hover:ring-mint-dd transition-shadow">
        <div className="bg-mint-dd h-full rounded-full" style={{ width: `${displayValue}%` }} />
      </div>
      <span className="text-[11px] font-bold text-text group-hover:text-mint-dd transition-colors">{displayValue}%</span>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-[8px]">
      <Icon className="w-[14px] h-[14px] text-text3 shrink-0" />
      <span className="text-[11px] text-text2 w-[100px] shrink-0">{label}</span>
      <span className="text-[12px] text-text flex-1 truncate">{value || '—'}</span>
    </div>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-gray-400'
  return (
    <div className="flex items-center gap-[8px]">
      <span className="text-[11px] text-text2 w-[100px] shrink-0">{label}</span>
      <div className="flex-1 bg-surf2 rounded-full h-[8px] overflow-hidden">
        <div className={`${color} h-full rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] font-bold text-text">{value}</span>
    </div>
  )
}
