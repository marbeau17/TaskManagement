'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout'
import { useI18n } from '@/hooks/useI18n'
import { useMembers } from '@/hooks/useMembers'
import { toast } from '@/stores/toastStore'

interface PipelineOpportunity {
  id: string
  seq_id: number
  is_new: boolean
  client_name: string
  referral_source: string
  opportunity_name: string
  sub_opportunity: string
  status: string
  probability: number
  cm_percent: number
  pm_user_id: string | null
  consultant1_user_id: string | null
  consultant2_user_id: string | null
  monthly?: Array<{ month: string; revenue: number }>
}

const MONTHS = [
  '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03',
  '2026-04', '2026-05', '2026-06',
  '2026-07', '2026-08', '2026-09',
]

const MONTH_LABELS = [
  'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar',
  'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
]

const STATUS_OPTIONS = ['Firm', 'Namelikly', 'Win', 'Lost', '']
const STATUS_COLORS: Record<string, string> = {
  Firm: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Namelikly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Win: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function PipelinePage() {
  const { t } = useI18n()
  const { data: members } = useMembers()
  const [opportunities, setOpportunities] = useState<PipelineOpportunity[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline')
      if (res.ok) {
        const data = await res.json()
        setOpportunities(data)
      }
    } catch {
      // Pipeline table might not exist yet
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const updateField = async (id: string, field: string, value: string | number | boolean | null) => {
    try {
      const res = await fetch(`/api/pipeline/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (res.ok) {
        setOpportunities((prev) =>
          prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
        )
      } else {
        toast.error('Failed to update')
      }
    } catch {
      toast.error('Failed to update')
    }
  }

  const updateMonthlyRevenue = async (oppId: string, month: string, revenue: number) => {
    try {
      await fetch('/api/pipeline/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: oppId, month, revenue }),
      })
      setOpportunities((prev) =>
        prev.map((o) => {
          if (o.id !== oppId) return o
          const monthly = [...(o.monthly ?? [])]
          const idx = monthly.findIndex((m) => m.month === month)
          if (idx >= 0) monthly[idx] = { ...monthly[idx], revenue }
          else monthly.push({ month, revenue })
          return { ...o, monthly }
        })
      )
    } catch {
      toast.error('Failed to update revenue')
    }
  }

  const addNew = async () => {
    try {
      const maxSeq = opportunities.reduce((max, o) => Math.max(max, o.seq_id), 0)
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seq_id: maxSeq + 1,
          is_new: true,
          client_name: '',
          opportunity_name: '',
          status: 'Namelikly',
          probability: 0,
          cm_percent: 0,
        }),
      })
      if (res.ok) {
        await fetchData()
        toast.success('Added')
      }
    } catch {
      toast.error('Failed to add')
    }
  }

  const getMonthRevenue = (opp: PipelineOpportunity, month: string): number => {
    return opp.monthly?.find((m) => m.month === month)?.revenue ?? 0
  }

  const getTotal = (opp: PipelineOpportunity): number => {
    return (opp.monthly ?? []).reduce((s, m) => s + (m.revenue ?? 0), 0)
  }

  const memberName = (userId: string | null) => {
    if (!userId || !members) return ''
    const m = members.find((mem) => mem.id === userId)
    return m?.name ?? ''
  }

  const activeMembers = members?.filter((m) => m.is_active) ?? []

  return (
    <>
      <Topbar title={t('pipeline.title')}>
        <button
          onClick={addNew}
          className="h-[30px] px-[12px] rounded-[6px] text-[12px] font-bold bg-mint text-white hover:bg-mint-d transition-colors"
        >
          {t('pipeline.addNew')}
        </button>
      </Topbar>

      <div className="p-[12px] md:p-[20px]">
        {loading ? (
          <div className="text-center py-[40px] text-[13px] text-text3">Loading...</div>
        ) : (
          <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-x-auto">
            <table className="text-left text-[11px]" style={{ tableLayout: 'auto', minWidth: '1800px' }}>
              <thead>
                <tr className="border-b border-border2 bg-surf2">
                  <th className="px-[6px] py-[8px] font-semibold text-text2 whitespace-nowrap sticky left-0 bg-surf2 z-10">ID</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 whitespace-nowrap">{t('pipeline.newExisting')}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 whitespace-nowrap min-w-[120px]">{t('pipeline.client')}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 whitespace-nowrap">{t('pipeline.referral')}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 whitespace-nowrap min-w-[120px]">{t('pipeline.opportunity')}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 whitespace-nowrap">{t('pipeline.subOpp')}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 whitespace-nowrap">{t('pipeline.status')}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 whitespace-nowrap">{t('pipeline.probability')}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 whitespace-nowrap">{t('pipeline.cmPercent')}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 whitespace-nowrap">{t('pipeline.pm')}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 whitespace-nowrap">{t('pipeline.consultant1')}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 whitespace-nowrap">{t('pipeline.consultant2')}</th>
                  {MONTH_LABELS.map((label, i) => (
                    <th key={MONTHS[i]} className="px-[4px] py-[8px] font-semibold text-text2 text-center whitespace-nowrap min-w-[60px]">
                      {label}
                    </th>
                  ))}
                  <th className="px-[6px] py-[8px] font-semibold text-mint text-right whitespace-nowrap">{t('pipeline.total')}</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.length === 0 ? (
                  <tr><td colSpan={25} className="text-center py-[20px] text-text3">{t('pipeline.noData')}</td></tr>
                ) : opportunities.map((opp) => (
                  <tr key={opp.id} className="border-b border-border2 hover:bg-surf2/30 transition-colors">
                    <td className="px-[6px] py-[4px] text-text3 sticky left-0 bg-surface z-10">{opp.seq_id}</td>
                    <td className="px-[6px] py-[4px]">
                      <input
                        type="checkbox"
                        checked={opp.is_new}
                        onChange={(e) => updateField(opp.id, 'is_new', e.target.checked)}
                        className="accent-mint w-[13px] h-[13px]"
                      />
                    </td>
                    <td className="px-[6px] py-[4px]">
                      <input
                        type="text" value={opp.client_name}
                        onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, client_name: e.target.value } : o))}
                        onBlur={(e) => updateField(opp.id, 'client_name', e.target.value)}
                        className="w-full text-[11px] text-text bg-transparent border-b border-transparent focus:border-mint outline-none px-[2px] py-[2px]"
                      />
                    </td>
                    <td className="px-[6px] py-[4px]">
                      <input
                        type="text" value={opp.referral_source}
                        onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, referral_source: e.target.value } : o))}
                        onBlur={(e) => updateField(opp.id, 'referral_source', e.target.value)}
                        className="w-full text-[11px] text-text bg-transparent border-b border-transparent focus:border-mint outline-none px-[2px] py-[2px]"
                      />
                    </td>
                    <td className="px-[6px] py-[4px]">
                      <input
                        type="text" value={opp.opportunity_name}
                        onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, opportunity_name: e.target.value } : o))}
                        onBlur={(e) => updateField(opp.id, 'opportunity_name', e.target.value)}
                        className="w-full text-[11px] text-text bg-transparent border-b border-transparent focus:border-mint outline-none px-[2px] py-[2px]"
                      />
                    </td>
                    <td className="px-[6px] py-[4px]">
                      <input
                        type="text" value={opp.sub_opportunity}
                        onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, sub_opportunity: e.target.value } : o))}
                        onBlur={(e) => updateField(opp.id, 'sub_opportunity', e.target.value)}
                        className="w-full text-[11px] text-text bg-transparent border-b border-transparent focus:border-mint outline-none px-[2px] py-[2px]"
                      />
                    </td>
                    <td className="px-[6px] py-[4px]">
                      <select
                        value={opp.status}
                        onChange={(e) => updateField(opp.id, 'status', e.target.value)}
                        className={`text-[10px] rounded-full px-[6px] py-[1px] font-semibold border cursor-pointer ${STATUS_COLORS[opp.status] ?? 'bg-surf2 text-text2'}`}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || '-'}</option>)}
                      </select>
                    </td>
                    <td className="px-[6px] py-[4px]">
                      <input
                        type="number" min={0} max={100}
                        value={opp.probability}
                        onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, probability: Number(e.target.value) } : o))}
                        onBlur={(e) => updateField(opp.id, 'probability', Number(e.target.value))}
                        className="w-[40px] text-[11px] text-text text-center bg-transparent border-b border-transparent focus:border-mint outline-none"
                      />%
                    </td>
                    <td className="px-[6px] py-[4px]">
                      <input
                        type="number" min={0} max={100}
                        value={opp.cm_percent}
                        onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, cm_percent: Number(e.target.value) } : o))}
                        onBlur={(e) => updateField(opp.id, 'cm_percent', Number(e.target.value))}
                        className="w-[40px] text-[11px] text-text text-center bg-transparent border-b border-transparent focus:border-mint outline-none"
                      />%
                    </td>
                    <td className="px-[6px] py-[4px]">
                      <select
                        value={opp.pm_user_id ?? ''}
                        onChange={(e) => updateField(opp.id, 'pm_user_id', e.target.value || null)}
                        className="text-[10px] text-text bg-transparent outline-none cursor-pointer"
                      >
                        <option value="">-</option>
                        {activeMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </td>
                    <td className="px-[6px] py-[4px]">
                      <select
                        value={opp.consultant1_user_id ?? ''}
                        onChange={(e) => updateField(opp.id, 'consultant1_user_id', e.target.value || null)}
                        className="text-[10px] text-text bg-transparent outline-none cursor-pointer"
                      >
                        <option value="">-</option>
                        {activeMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </td>
                    <td className="px-[6px] py-[4px]">
                      <select
                        value={opp.consultant2_user_id ?? ''}
                        onChange={(e) => updateField(opp.id, 'consultant2_user_id', e.target.value || null)}
                        className="text-[10px] text-text bg-transparent outline-none cursor-pointer"
                      >
                        <option value="">-</option>
                        {activeMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </td>
                    {MONTHS.map((month) => (
                      <td key={month} className="px-[2px] py-[4px]">
                        <input
                          type="number" min={0} step={1}
                          value={getMonthRevenue(opp, month) || ''}
                          placeholder="0"
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setOpportunities((p) => p.map((o) => {
                              if (o.id !== opp.id) return o
                              const monthly = [...(o.monthly ?? [])]
                              const idx = monthly.findIndex((m) => m.month === month)
                              if (idx >= 0) monthly[idx] = { ...monthly[idx], revenue: val }
                              else monthly.push({ month, revenue: val })
                              return { ...o, monthly }
                            }))
                          }}
                          onBlur={(e) => updateMonthlyRevenue(opp.id, month, Number(e.target.value))}
                          className="w-[55px] text-[10px] text-text text-right bg-transparent border-b border-transparent focus:border-mint outline-none"
                        />
                      </td>
                    ))}
                    <td className="px-[6px] py-[4px] text-right font-bold text-mint text-[11px]">
                      {getTotal(opp).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                {opportunities.length > 0 && (
                  <tr className="border-t-2 border-mint bg-surf2/50 font-bold">
                    <td colSpan={12} className="px-[6px] py-[6px] text-[11px] text-text sticky left-0 bg-surf2/50 z-10">{t('pipeline.total')}</td>
                    {MONTHS.map((month) => {
                      const total = opportunities.reduce((s, o) => s + getMonthRevenue(o, month), 0)
                      return (
                        <td key={month} className="px-[2px] py-[6px] text-[10px] text-mint text-right">
                          {total > 0 ? total.toLocaleString() : ''}
                        </td>
                      )
                    })}
                    <td className="px-[6px] py-[6px] text-right text-[12px] text-mint">
                      {opportunities.reduce((s, o) => s + getTotal(o), 0).toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
