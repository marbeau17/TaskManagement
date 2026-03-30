'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Topbar } from '@/components/layout'
import { useI18n } from '@/hooks/useI18n'
import { useMembers } from '@/hooks/useMembers'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/stores/toastStore'

/** Pipeline access: admin role OR specific privileged users */
const PIPELINE_ALLOWED_NAMES = ['安田', '伊藤', '瀧宮', '渡邊', '渡辺']
function canAccessPipeline(user: { role: string; name: string } | null): boolean {
  if (!user) return false
  if (user.role === 'admin' || user.role === 'director') return true
  return PIPELINE_ALLOWED_NAMES.some((n) => user.name.includes(n))
}

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

type TabId = 'list' | 'summary'

export default function PipelinePage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { data: members } = useMembers()
  const [opportunities, setOpportunities] = useState<PipelineOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('list')

  // Access control
  if (user && !canAccessPipeline(user)) {
    return (
      <>
        <Topbar title={t('pipeline.title')} />
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <div className="text-[40px] mb-[12px]">🔒</div>
            <h2 className="text-[16px] font-bold text-text mb-[8px]">アクセス権限がありません</h2>
            <p className="text-[12px] text-text2">パイプライン管理は管理者および特権ユーザーのみ利用可能です。</p>
          </div>
        </div>
      </>
    )
  }

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline')
      if (res.ok) setOpportunities(await res.json())
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const updateField = async (id: string, field: string, value: string | number | boolean | null) => {
    const res = await fetch(`/api/pipeline/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    }).catch(() => null)
    if (res?.ok) {
      setOpportunities((p) => p.map((o) => o.id === id ? { ...o, [field]: value } : o))
    } else { toast.error('Update failed') }
  }

  const updateMonthlyRevenue = async (oppId: string, month: string, revenue: number) => {
    await fetch('/api/pipeline/monthly', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunity_id: oppId, month, revenue }),
    }).catch(() => null)
    setOpportunities((p) => p.map((o) => {
      if (o.id !== oppId) return o
      const monthly = [...(o.monthly ?? [])]
      const idx = monthly.findIndex((m) => m.month === month)
      if (idx >= 0) monthly[idx] = { ...monthly[idx], revenue }
      else monthly.push({ month, revenue })
      return { ...o, monthly }
    }))
  }

  const addNew = async () => {
    const maxSeq = opportunities.reduce((max, o) => Math.max(max, o.seq_id), 0)
    const res = await fetch('/api/pipeline', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seq_id: maxSeq + 1, is_new: true, client_name: '', opportunity_name: '', status: 'Namelikly', probability: 0, cm_percent: 0 }),
    }).catch(() => null)
    if (res?.ok) { await fetchData(); toast.success('追加しました') }
    else toast.error('追加に失敗しました')
  }

  const deleteOpp = async (id: string, name: string) => {
    if (!window.confirm(`「${name}」を削除しますか？`)) return
    const res = await fetch(`/api/pipeline/${id}`, { method: 'DELETE' }).catch(() => null)
    if (res?.ok) { setOpportunities((p) => p.filter((o) => o.id !== id)); toast.success('削除しました') }
    else toast.error('削除に失敗しました')
  }

  const duplicateOpp = async (source: PipelineOpportunity) => {
    const maxSeq = opportunities.reduce((max, o) => Math.max(max, o.seq_id), 0)
    const res = await fetch('/api/pipeline', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seq_id: maxSeq + 1, is_new: source.is_new,
        client_name: source.client_name, referral_source: source.referral_source,
        opportunity_name: source.opportunity_name, sub_opportunity: source.sub_opportunity,
        status: source.status, probability: source.probability, cm_percent: source.cm_percent,
        pm_user_id: source.pm_user_id, consultant1_user_id: source.consultant1_user_id, consultant2_user_id: source.consultant2_user_id,
      }),
    }).catch(() => null)
    if (!res?.ok) { toast.error('複製に失敗しました'); return }
    const newOpp = await res.json()
    // Copy monthly data
    const monthlyRows = (source.monthly ?? []).filter((m) => m.revenue > 0).map((m) => ({
      opportunity_id: newOpp.id, month: m.month, revenue: m.revenue,
    }))
    if (monthlyRows.length > 0) {
      await fetch('/api/pipeline/monthly', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(monthlyRows),
      }).catch(() => null)
    }
    await fetchData()
    toast.success('複製しました')
  }

  const getMonthRevenue = (opp: PipelineOpportunity, month: string) => opp.monthly?.find((m) => m.month === month)?.revenue ?? 0
  const getTotal = (opp: PipelineOpportunity) => (opp.monthly ?? []).reduce((s, m) => s + (m.revenue ?? 0), 0)
  const activeMembers = members?.filter((m) => m.is_active) ?? []

  // ===== Summary calculations =====
  const summary = useMemo(() => {
    // Monthly totals
    const monthlyRevenue = MONTHS.map((m) => opportunities.reduce((s, o) => s + getMonthRevenue(o, m), 0))
    const monthlyWeighted = MONTHS.map((m) => opportunities.reduce((s, o) => s + getMonthRevenue(o, m) * (o.probability / 100), 0))
    const monthlyCM = MONTHS.map((m, i) => opportunities.reduce((s, o) => s + getMonthRevenue(o, m) * (o.cm_percent / 100), 0))
    const monthlyWeightedCM = MONTHS.map((m) => opportunities.reduce((s, o) => s + getMonthRevenue(o, m) * (o.probability / 100) * (o.cm_percent / 100), 0))

    // By status
    const byStatus = STATUS_OPTIONS.filter(Boolean).map((status) => {
      const filtered = opportunities.filter((o) => o.status === status)
      const rev = filtered.reduce((s, o) => s + getTotal(o), 0)
      const weighted = filtered.reduce((s, o) => s + getTotal(o) * (o.probability / 100), 0)
      const cm = filtered.reduce((s, o) => s + getTotal(o) * (o.cm_percent / 100), 0)
      return { status, count: filtered.length, revenue: rev, weighted, cm }
    })

    // By PM
    const pmIds = [...new Set(opportunities.map((o) => o.pm_user_id).filter(Boolean))] as string[]
    const byPM = pmIds.map((pmId) => {
      const filtered = opportunities.filter((o) => o.pm_user_id === pmId)
      const name = members?.find((m) => m.id === pmId)?.name ?? pmId
      const rev = filtered.reduce((s, o) => s + getTotal(o), 0)
      const weighted = filtered.reduce((s, o) => s + getTotal(o) * (o.probability / 100), 0)
      const cm = filtered.reduce((s, o) => s + getTotal(o) * (o.cm_percent / 100), 0)
      return { name, count: filtered.length, revenue: rev, weighted, cm }
    }).sort((a, b) => b.revenue - a.revenue)

    return { monthlyRevenue, monthlyWeighted, monthlyCM, monthlyWeightedCM, byStatus, byPM }
  }, [opportunities, members])

  const totalRevenue = opportunities.reduce((s, o) => s + getTotal(o), 0)
  const totalWeighted = opportunities.reduce((s, o) => s + getTotal(o) * (o.probability / 100), 0)
  const totalCM = opportunities.reduce((s, o) => s + getTotal(o) * (o.cm_percent / 100), 0)
  const totalWeightedCM = opportunities.reduce((s, o) => s + getTotal(o) * (o.probability / 100) * (o.cm_percent / 100), 0)

  const fmtK = (v: number) => Math.round(v).toLocaleString()

  const tabs = [
    { id: 'list' as TabId, label: '📋 案件一覧' },
    { id: 'summary' as TabId, label: '📊 売上サマリー' },
  ]

  return (
    <>
      <Topbar title={t('pipeline.title')}>
        {activeTab === 'list' && (
          <button onClick={addNew} className="h-[30px] px-[12px] rounded-[6px] text-[12px] font-bold bg-mint text-white hover:bg-mint-d transition-colors">
            {t('pipeline.addNew')}
          </button>
        )}
      </Topbar>

      <div className="p-[12px] md:p-[20px]">
        {/* Tabs */}
        <div className="flex gap-[4px] mb-[12px] border-b border-border2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-[16px] py-[8px] text-[12px] font-medium transition-colors border-b-2 -mb-[1px] ${
                activeTab === tab.id ? 'border-mint text-mint' : 'border-transparent text-text3 hover:text-text2'
              }`}
            >{tab.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-[40px] text-[13px] text-text3">Loading...</div>
        ) : activeTab === 'list' ? (
          /* ===== LIST TAB ===== */
          <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-x-auto">
            <table className="text-left text-[11px]" style={{ tableLayout: 'auto', minWidth: '1900px' }}>
              <thead>
                <tr className="border-b border-border2 bg-surf2">
                  <th className="px-[4px] py-[8px] font-semibold text-text3 sticky left-0 bg-surf2 z-10 w-[24px]"></th>
                  <th className="px-[4px] py-[8px] font-semibold text-text2 sticky left-[24px] bg-surf2 z-10 w-[30px]">ID</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2">新</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 min-w-[120px]">{t('pipeline.client')}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2">{t('pipeline.referral')}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2 min-w-[120px]">{t('pipeline.opportunity')}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2">{t('pipeline.subOpp')}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2">{t('pipeline.status')}</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2">勝率</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2">CM%</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2">PM</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2">C1</th>
                  <th className="px-[6px] py-[8px] font-semibold text-text2">C2</th>
                  {MONTH_LABELS.map((l, i) => (
                    <th key={MONTHS[i]} className="px-[4px] py-[8px] font-semibold text-text2 text-center min-w-[55px]">{l}</th>
                  ))}
                  <th className="px-[6px] py-[8px] font-semibold text-mint text-right">{t('pipeline.total')}</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.length === 0 ? (
                  <tr><td colSpan={26} className="text-center py-[20px] text-text3">{t('pipeline.noData')}</td></tr>
                ) : opportunities.map((opp) => (
                  <tr key={opp.id} className="border-b border-border2 hover:bg-surf2/30">
                    <td className="px-[1px] py-[3px] sticky left-0 bg-surface z-10 text-center">
                      <div className="flex items-center gap-[2px]">
                        <button onClick={() => duplicateOpp(opp)} className="text-[10px] text-text3 hover:text-mint transition-colors" title="複製">⧉</button>
                        <button onClick={() => deleteOpp(opp.id, opp.client_name + ' ' + opp.opportunity_name)} className="text-[10px] text-text3 hover:text-danger transition-colors" title="削除">✕</button>
                      </div>
                    </td>
                    <td className="px-[4px] py-[3px] text-text3 sticky left-[24px] bg-surface z-10">{opp.seq_id}</td>
                    <td className="px-[6px] py-[3px]"><input type="checkbox" checked={opp.is_new} onChange={(e) => updateField(opp.id, 'is_new', e.target.checked)} className="accent-mint w-[12px] h-[12px]" /></td>
                    <td className="px-[4px] py-[3px]"><input type="text" value={opp.client_name} onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, client_name: e.target.value } : o))} onBlur={(e) => updateField(opp.id, 'client_name', e.target.value)} className="w-full text-[11px] text-text bg-transparent border-b border-transparent focus:border-mint outline-none" /></td>
                    <td className="px-[4px] py-[3px]"><input type="text" value={opp.referral_source} onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, referral_source: e.target.value } : o))} onBlur={(e) => updateField(opp.id, 'referral_source', e.target.value)} className="w-full text-[11px] text-text bg-transparent border-b border-transparent focus:border-mint outline-none" /></td>
                    <td className="px-[4px] py-[3px]"><input type="text" value={opp.opportunity_name} onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, opportunity_name: e.target.value } : o))} onBlur={(e) => updateField(opp.id, 'opportunity_name', e.target.value)} className="w-full text-[11px] text-text bg-transparent border-b border-transparent focus:border-mint outline-none" /></td>
                    <td className="px-[4px] py-[3px]"><input type="text" value={opp.sub_opportunity} onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, sub_opportunity: e.target.value } : o))} onBlur={(e) => updateField(opp.id, 'sub_opportunity', e.target.value)} className="w-full text-[11px] text-text bg-transparent border-b border-transparent focus:border-mint outline-none" /></td>
                    <td className="px-[4px] py-[3px]">
                      <select value={opp.status} onChange={(e) => updateField(opp.id, 'status', e.target.value)} className={`text-[10px] rounded-full px-[5px] py-[1px] font-semibold border cursor-pointer ${STATUS_COLORS[opp.status] ?? 'bg-surf2 text-text2'}`}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || '-'}</option>)}
                      </select>
                    </td>
                    <td className="px-[4px] py-[3px]"><input type="number" min={0} max={100} value={opp.probability} onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, probability: Number(e.target.value) } : o))} onBlur={(e) => updateField(opp.id, 'probability', Number(e.target.value))} className="w-[35px] text-[11px] text-text text-center bg-transparent border-b border-transparent focus:border-mint outline-none" />%</td>
                    <td className="px-[4px] py-[3px]"><input type="number" min={0} max={100} value={opp.cm_percent} onChange={(e) => setOpportunities((p) => p.map((o) => o.id === opp.id ? { ...o, cm_percent: Number(e.target.value) } : o))} onBlur={(e) => updateField(opp.id, 'cm_percent', Number(e.target.value))} className="w-[35px] text-[11px] text-text text-center bg-transparent border-b border-transparent focus:border-mint outline-none" />%</td>
                    <td className="px-[4px] py-[3px]"><select value={opp.pm_user_id ?? ''} onChange={(e) => updateField(opp.id, 'pm_user_id', e.target.value || null)} className="text-[10px] text-text bg-transparent outline-none cursor-pointer max-w-[70px]"><option value="">-</option>{activeMembers.map((m) => <option key={m.id} value={m.id}>{m.name_short ?? m.name}</option>)}</select></td>
                    <td className="px-[4px] py-[3px]"><select value={opp.consultant1_user_id ?? ''} onChange={(e) => updateField(opp.id, 'consultant1_user_id', e.target.value || null)} className="text-[10px] text-text bg-transparent outline-none cursor-pointer max-w-[70px]"><option value="">-</option>{activeMembers.map((m) => <option key={m.id} value={m.id}>{m.name_short ?? m.name}</option>)}</select></td>
                    <td className="px-[4px] py-[3px]"><select value={opp.consultant2_user_id ?? ''} onChange={(e) => updateField(opp.id, 'consultant2_user_id', e.target.value || null)} className="text-[10px] text-text bg-transparent outline-none cursor-pointer max-w-[70px]"><option value="">-</option>{activeMembers.map((m) => <option key={m.id} value={m.id}>{m.name_short ?? m.name}</option>)}</select></td>
                    {MONTHS.map((month) => (
                      <td key={month} className="px-[2px] py-[3px]">
                        <input type="number" min={0} step={1} value={getMonthRevenue(opp, month) || ''} placeholder="0"
                          onChange={(e) => { const v = Number(e.target.value); setOpportunities((p) => p.map((o) => { if (o.id !== opp.id) return o; const monthly = [...(o.monthly ?? [])]; const idx = monthly.findIndex((m) => m.month === month); if (idx >= 0) monthly[idx] = { ...monthly[idx], revenue: v }; else monthly.push({ month, revenue: v }); return { ...o, monthly } })) }}
                          onBlur={(e) => updateMonthlyRevenue(opp.id, month, Number(e.target.value))}
                          className="w-[50px] text-[10px] text-text text-right bg-transparent border-b border-transparent focus:border-mint outline-none"
                        />
                      </td>
                    ))}
                    <td className="px-[6px] py-[3px] text-right font-bold text-mint text-[11px]">{fmtK(getTotal(opp))}</td>
                  </tr>
                ))}
                {/* Totals */}
                {opportunities.length > 0 && (
                  <tr className="border-t-2 border-mint bg-surf2/50 font-bold">
                    <td colSpan={13} className="px-[6px] py-[6px] text-[11px] text-text sticky left-0 bg-surf2/50 z-10">{t('pipeline.total')}</td>
                    {MONTHS.map((m) => <td key={m} className="px-[2px] py-[6px] text-[10px] text-mint text-right">{fmtK(opportunities.reduce((s, o) => s + getMonthRevenue(o, m), 0))}</td>)}
                    <td className="px-[6px] py-[6px] text-right text-[12px] text-mint">{fmtK(totalRevenue)}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ===== SUMMARY TAB ===== */
          <div className="space-y-[16px]">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
              <div className="bg-surface border border-border2 rounded-[10px] p-[14px] shadow">
                <div className="text-[10px] text-text2 mb-[4px]">売上高 (ウェイトなし)</div>
                <div className="text-[20px] font-bold text-text">{fmtK(totalRevenue)}<span className="text-[11px] text-text3 ml-[2px]">千円</span></div>
              </div>
              <div className="bg-surface border border-border2 rounded-[10px] p-[14px] shadow">
                <div className="text-[10px] text-text2 mb-[4px]">売上高 (加重平均)</div>
                <div className="text-[20px] font-bold text-mint">{fmtK(totalWeighted)}<span className="text-[11px] text-text3 ml-[2px]">千円</span></div>
              </div>
              <div className="bg-surface border border-border2 rounded-[10px] p-[14px] shadow">
                <div className="text-[10px] text-text2 mb-[4px]">粗利 (ウェイトなし)</div>
                <div className="text-[20px] font-bold text-text">{fmtK(totalCM)}<span className="text-[11px] text-text3 ml-[2px]">千円</span></div>
              </div>
              <div className="bg-surface border border-border2 rounded-[10px] p-[14px] shadow">
                <div className="text-[10px] text-text2 mb-[4px]">粗利 (加重平均)</div>
                <div className="text-[20px] font-bold text-mint">{fmtK(totalWeightedCM)}<span className="text-[11px] text-text3 ml-[2px]">千円</span></div>
              </div>
            </div>

            {/* Monthly breakdown table */}
            <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-x-auto">
              <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
                <h3 className="text-[13px] font-bold text-text">月別売上・粗利サマリー（千円）</h3>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border2 bg-surf2/50">
                    <th className="px-[10px] py-[6px] text-left text-text2 font-semibold w-[180px]">指標</th>
                    {MONTH_LABELS.map((l, i) => <th key={MONTHS[i]} className="px-[4px] py-[6px] text-center text-text2 font-semibold">{l}</th>)}
                    <th className="px-[10px] py-[6px] text-right text-mint font-bold">合計</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border2">
                    <td className="px-[10px] py-[6px] font-medium text-text">売上高（ウェイトなし）</td>
                    {summary.monthlyRevenue.map((v, i) => <td key={i} className="px-[4px] py-[6px] text-center text-text">{fmtK(v)}</td>)}
                    <td className="px-[10px] py-[6px] text-right font-bold text-text">{fmtK(totalRevenue)}</td>
                  </tr>
                  <tr className="border-b border-border2 bg-mint-ll/20 dark:bg-mint-dd/10">
                    <td className="px-[10px] py-[6px] font-medium text-mint">売上高（加重: 売上×勝率）</td>
                    {summary.monthlyWeighted.map((v, i) => <td key={i} className="px-[4px] py-[6px] text-center text-mint font-semibold">{fmtK(v)}</td>)}
                    <td className="px-[10px] py-[6px] text-right font-bold text-mint">{fmtK(totalWeighted)}</td>
                  </tr>
                  <tr className="border-b border-border2">
                    <td className="px-[10px] py-[6px] font-medium text-text">粗利（ウェイトなし: 売上×CM%）</td>
                    {summary.monthlyCM.map((v, i) => <td key={i} className="px-[4px] py-[6px] text-center text-text">{fmtK(v)}</td>)}
                    <td className="px-[10px] py-[6px] text-right font-bold text-text">{fmtK(totalCM)}</td>
                  </tr>
                  <tr className="bg-mint-ll/20 dark:bg-mint-dd/10">
                    <td className="px-[10px] py-[6px] font-medium text-mint">粗利（加重: 売上×勝率×CM%）</td>
                    {summary.monthlyWeightedCM.map((v, i) => <td key={i} className="px-[4px] py-[6px] text-center text-mint font-semibold">{fmtK(v)}</td>)}
                    <td className="px-[10px] py-[6px] text-right font-bold text-mint">{fmtK(totalWeightedCM)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* By Status */}
            <div className="bg-surface border border-border2 rounded-[10px] shadow">
              <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
                <h3 className="text-[13px] font-bold text-text">ステータス別サマリー（千円）</h3>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border2 bg-surf2/50">
                    <th className="px-[10px] py-[6px] text-left text-text2">ステータス</th>
                    <th className="px-[10px] py-[6px] text-center text-text2">件数</th>
                    <th className="px-[10px] py-[6px] text-right text-text2">売上高</th>
                    <th className="px-[10px] py-[6px] text-right text-text2">加重売上</th>
                    <th className="px-[10px] py-[6px] text-right text-text2">粗利</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byStatus.map((s) => (
                    <tr key={s.status} className="border-b border-border2 hover:bg-surf2/30">
                      <td className="px-[10px] py-[6px]"><span className={`text-[10px] rounded-full px-[6px] py-[1px] font-semibold border ${STATUS_COLORS[s.status] ?? ''}`}>{s.status}</span></td>
                      <td className="px-[10px] py-[6px] text-center">{s.count}</td>
                      <td className="px-[10px] py-[6px] text-right font-medium">{fmtK(s.revenue)}</td>
                      <td className="px-[10px] py-[6px] text-right font-medium text-mint">{fmtK(s.weighted)}</td>
                      <td className="px-[10px] py-[6px] text-right font-medium">{fmtK(s.cm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* By PM */}
            <div className="bg-surface border border-border2 rounded-[10px] shadow">
              <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
                <h3 className="text-[13px] font-bold text-text">PM別サマリー（千円）</h3>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border2 bg-surf2/50">
                    <th className="px-[10px] py-[6px] text-left text-text2">PM</th>
                    <th className="px-[10px] py-[6px] text-center text-text2">件数</th>
                    <th className="px-[10px] py-[6px] text-right text-text2">売上高</th>
                    <th className="px-[10px] py-[6px] text-right text-text2">加重売上</th>
                    <th className="px-[10px] py-[6px] text-right text-text2">粗利</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byPM.map((pm) => (
                    <tr key={pm.name} className="border-b border-border2 hover:bg-surf2/30">
                      <td className="px-[10px] py-[6px] font-medium">{pm.name}</td>
                      <td className="px-[10px] py-[6px] text-center">{pm.count}</td>
                      <td className="px-[10px] py-[6px] text-right font-medium">{fmtK(pm.revenue)}</td>
                      <td className="px-[10px] py-[6px] text-right font-medium text-mint">{fmtK(pm.weighted)}</td>
                      <td className="px-[10px] py-[6px] text-right font-medium">{fmtK(pm.cm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
