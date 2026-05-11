'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import { Topbar } from '@/components/layout'
import { KpiCard } from '@/components/shared'
import { useIssues } from '@/hooks/useIssues'
import { useMembers } from '@/hooks/useMembers'
import { useProjects } from '@/hooks/useProjects'

// ============================================================================
// Period filter
// ============================================================================
type Period = '7' | '30' | '90' | 'all'

const PERIOD_LABELS: Record<Period, string> = {
  '7': '直近 7 日',
  '30': '直近 30 日',
  '90': '直近 90 日',
  all: '全期間',
}

// ============================================================================
// Helpers
// ============================================================================
function hoursBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null
  return (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000
}

function fmtHours(h: number | null | undefined): string {
  if (h === null || h === undefined || isNaN(h)) return '-'
  if (h < 1) return `${Math.round(h * 60)} 分`
  if (h < 24) return `${h.toFixed(1)} h`
  return `${(h / 24).toFixed(1)} 日`
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const
const SEVERITY_COLOR: Record<string, string> = {
  critical: '#C05050',
  high: '#E07050',
  medium: '#E89B4A',
  low: '#6FB5A3',
}
const TYPE_COLOR: Record<string, string> = {
  bug: '#C05050',
  incident: '#E07050',
  improvement: '#5B8DD6',
  question: '#A07BBE',
  task: '#6FB5A3',
}
const SOURCE_COLOR: Record<string, string> = {
  internal: '#6FB5A3',
  customer: '#E89B4A',
}

// ============================================================================
// Page
// ============================================================================
export default function IssueKpiDashboardPage() {
  const [period, setPeriod] = useState<Period>('30')
  const { data: issuesData, isLoading } = useIssues()
  const { data: members } = useMembers()
  const { data: projects } = useProjects()

  // Capture "now" once at mount so the React Compiler treats it as pure within the
  // useMemo blocks below — we don't need millisecond-fresh recomputation for a
  // dashboard, and pinning the reference makes all derived metrics consistent.
  const [nowMs] = useState(() => Date.now())

  const issues = useMemo(() => issuesData ?? [], [issuesData])
  const cutoff = useMemo(() => {
    if (period === 'all') return null
    const days = parseInt(period, 10)
    return new Date(nowMs - days * 86_400_000)
  }, [period, nowMs])

  // Period scope — issues created within the window.
  const inPeriod = useMemo(() => {
    if (!cutoff) return issues
    return issues.filter((i: any) => new Date(i.created_at) >= cutoff)
  }, [issues, cutoff])

  // Open backlog (not period-scoped — current state)
  const open = useMemo(
    () => issues.filter((i: any) => i.status === 'open' || i.status === 'in_progress'),
    [issues],
  )

  // ---- 1. Open backlog by severity ----------------------------------------
  const backlogBySeverity = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const i of open) counts[i.severity] = (counts[i.severity] ?? 0) + 1
    return SEVERITY_ORDER.map((s) => ({ severity: s, count: counts[s] ?? 0 }))
  }, [open])

  // ---- 2. MTTR by severity (in period) ------------------------------------
  const mttrBySeverity = useMemo(() => {
    const resolved = inPeriod.filter((i: any) => i.resolved_at)
    const buckets: Record<string, number[]> = { critical: [], high: [], medium: [], low: [] }
    for (const i of resolved) {
      const h = hoursBetween(i.created_at, i.resolved_at)
      if (h !== null && buckets[i.severity]) buckets[i.severity].push(h)
    }
    return SEVERITY_ORDER.map((s) => {
      const arr = buckets[s] ?? []
      const avg = arr.length > 0 ? arr.reduce((sum, x) => sum + x, 0) / arr.length : null
      return { severity: s, avgHours: avg, count: arr.length }
    })
  }, [inPeriod])

  // ---- 3. Reopen rate (in period created) ---------------------------------
  const reopenRate = useMemo(() => {
    const closed = inPeriod.filter((i: any) =>
      ['resolved', 'verified', 'closed'].includes(i.status),
    )
    const reopened = closed.filter((i: any) => (i.reopen_count ?? 0) > 0).length
    return {
      reopened,
      closed: closed.length,
      rate: closed.length > 0 ? (reopened / closed.length) * 100 : 0,
    }
  }, [inPeriod])

  // ---- 4. Throughput trend (created vs resolved per day) ------------------
  const throughputTrend = useMemo(() => {
    const days = period === 'all' ? 90 : Math.min(parseInt(period, 10) || 30, 90)
    const startMs = nowMs - days * 86_400_000
    const buckets = new Map<string, { created: number; resolved: number }>()
    for (let i = 0; i < days; i++) {
      const d = new Date(startMs + i * 86_400_000)
      const key = d.toISOString().slice(0, 10)
      buckets.set(key, { created: 0, resolved: 0 })
    }
    for (const i of issues) {
      const cKey = new Date(i.created_at).toISOString().slice(0, 10)
      if (buckets.has(cKey)) buckets.get(cKey)!.created += 1
      if (i.resolved_at) {
        const rKey = new Date(i.resolved_at).toISOString().slice(0, 10)
        if (buckets.has(rKey)) buckets.get(rKey)!.resolved += 1
      }
    }
    return Array.from(buckets.entries()).map(([date, v]) => ({
      date: date.slice(5),
      created: v.created,
      resolved: v.resolved,
    }))
  }, [issues, period])

  // ---- 5. Aging buckets (open issues) -------------------------------------
  const agingBuckets = useMemo(() => {
    const now = nowMs
    const buckets = [
      { label: '0-7 日', min: 0, max: 7, count: 0 },
      { label: '7-30 日', min: 7, max: 30, count: 0 },
      { label: '30 日以上', min: 30, max: Infinity, count: 0 },
    ]
    for (const i of open) {
      const ageDays = (now - new Date(i.created_at).getTime()) / 86_400_000
      for (const b of buckets) {
        if (ageDays >= b.min && ageDays < b.max) {
          b.count += 1
          break
        }
      }
    }
    return buckets
  }, [open])

  // ---- 6. SLA hit rate ----------------------------------------------------
  const slaStats = useMemo(() => {
    let respTotal = 0,
      respHit = 0,
      resoTotal = 0,
      resoHit = 0
    const now = nowMs
    for (const i of inPeriod as any[]) {
      if (i.sla_response_deadline) {
        respTotal += 1
        const deadline = new Date(i.sla_response_deadline).getTime()
        if (i.first_responded_at && new Date(i.first_responded_at).getTime() <= deadline) {
          respHit += 1
        } else if (!i.first_responded_at && now <= deadline) {
          respHit += 1 // still within SLA window
        }
      }
      if (i.sla_resolution_deadline) {
        resoTotal += 1
        const deadline = new Date(i.sla_resolution_deadline).getTime()
        if (i.resolved_at && new Date(i.resolved_at).getTime() <= deadline) {
          resoHit += 1
        } else if (!i.resolved_at && now <= deadline) {
          resoHit += 1
        }
      }
    }
    return {
      response: respTotal > 0 ? (respHit / respTotal) * 100 : null,
      respTotal,
      respHit,
      resolution: resoTotal > 0 ? (resoHit / resoTotal) * 100 : null,
      resoTotal,
      resoHit,
    }
  }, [inPeriod])

  // ---- 7. MTTA (Mean Time To Acknowledge / First response) ----------------
  const mttaHours = useMemo(() => {
    const arr: number[] = []
    for (const i of inPeriod as any[]) {
      const h = hoursBetween(i.created_at, i.first_responded_at)
      if (h !== null) arr.push(h)
    }
    if (arr.length === 0) return null
    return arr.reduce((s, x) => s + x, 0) / arr.length
  }, [inPeriod])

  // ---- 8. Assignee workload (open count + avg age) ------------------------
  const memberList = useMemo(() => members ?? [], [members])
  const assigneeWorkload = useMemo(() => {
    const memberMap = new Map<string, string>()
    for (const m of memberList) memberMap.set(m.id, m.name)
    const byUser = new Map<string, { count: number; totalAge: number }>()
    const now = nowMs
    for (const i of open as any[]) {
      const uid = i.assigned_to ?? '__unassigned__'
      const ageDays = (now - new Date(i.created_at).getTime()) / 86_400_000
      const cur = byUser.get(uid) ?? { count: 0, totalAge: 0 }
      cur.count += 1
      cur.totalAge += ageDays
      byUser.set(uid, cur)
    }
    return Array.from(byUser.entries())
      .map(([uid, v]) => ({
        userId: uid,
        userName: uid === '__unassigned__' ? '（未割り当て）' : memberMap.get(uid) ?? '（退職者・不明）',
        count: v.count,
        avgAgeDays: v.count > 0 ? v.totalAge / v.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
  }, [open, memberList, nowMs])

  // ---- 9. Source breakdown (in period) ------------------------------------
  const bySource = useMemo(() => {
    const counts: Record<string, number> = { internal: 0, customer: 0 }
    for (const i of inPeriod as any[]) counts[i.source ?? 'internal'] = (counts[i.source] ?? 0) + 1
    return Object.entries(counts).map(([source, value]) => ({ source, value }))
  }, [inPeriod])

  // ---- 10. Category breakdown (in period, by type) ------------------------
  const byType = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const i of inPeriod as any[]) counts[i.type] = (counts[i.type] ?? 0) + 1
    return Object.entries(counts).map(([type, value]) => ({ type, value }))
  }, [inPeriod])

  // ---- Summary rollups ----------------------------------------------------
  const criticalOpen = backlogBySeverity.find((b) => b.severity === 'critical')?.count ?? 0
  const totalOpen = open.length
  const avgMttr = useMemo(() => {
    const all = mttrBySeverity.filter((m) => m.avgHours !== null)
    if (all.length === 0) return null
    const totalCount = all.reduce((s, x) => s + (x.count ?? 0), 0)
    if (totalCount === 0) return null
    return all.reduce((s, x) => s + (x.avgHours ?? 0) * (x.count ?? 0), 0) / totalCount
  }, [mttrBySeverity])

  return (
    <>
      <Topbar title="課題 KPI ダッシュボード" />

      <div className="flex-1 overflow-auto p-3 md:p-6 space-y-5">
        {/* Period filter */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[12px] text-text2 font-semibold">集計期間:</span>
          {(['7', '30', '90', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-[12px] font-semibold border transition-colors ${
                period === p
                  ? 'border-mint bg-mint text-white'
                  : 'border-wf-border text-text2 hover:border-mint hover:text-mint'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
          <div className="flex-1" />
          <Link
            href="/issues"
            className="text-[12px] text-mint hover:text-mint-d font-semibold"
          >
            → 課題一覧
          </Link>
        </div>

        {isLoading && <p className="text-[12px] text-text3">読み込み中...</p>}

        {/* Top KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Open バックログ"
            value={totalOpen}
            unit="件"
            subText={criticalOpen > 0 ? `うち critical ${criticalOpen} 件` : 'critical なし'}
            subColor={criticalOpen > 0 ? '#C05050' : undefined}
            variant={criticalOpen > 0 ? 'danger' : 'mint'}
          />
          <KpiCard
            label={`MTTR (${PERIOD_LABELS[period]})`}
            value={fmtHours(avgMttr)}
            subText={`${inPeriod.filter((i: any) => i.resolved_at).length} 件解決`}
            variant="mint"
          />
          <KpiCard
            label={`MTTA (${PERIOD_LABELS[period]})`}
            value={fmtHours(mttaHours)}
            subText="初回応答までの平均"
            variant="info"
          />
          <KpiCard
            label="再オープン率"
            value={`${reopenRate.rate.toFixed(1)}%`}
            subText={`${reopenRate.reopened} / ${reopenRate.closed} 件`}
            subColor={reopenRate.rate > 10 ? '#C05050' : undefined}
            variant={reopenRate.rate > 10 ? 'danger' : 'mint'}
          />
        </div>

        {/* SLA hit rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-surface border border-border2 rounded-[10px] p-4 shadow">
            <div className="text-[12px] text-text2 mb-1.5 font-semibold">SLA: 応答ヒット率</div>
            {slaStats.response === null ? (
              <div className="text-[11px] text-text3">この期間に SLA 設定された課題なし</div>
            ) : (
              <>
                <div className="text-[24px] font-bold text-text">
                  {slaStats.response.toFixed(1)}%
                </div>
                <div className="text-[11px] text-text3">
                  {slaStats.respHit} / {slaStats.respTotal} 件達成
                </div>
              </>
            )}
          </div>
          <div className="bg-surface border border-border2 rounded-[10px] p-4 shadow">
            <div className="text-[12px] text-text2 mb-1.5 font-semibold">SLA: 解決ヒット率</div>
            {slaStats.resolution === null ? (
              <div className="text-[11px] text-text3">この期間に SLA 設定された課題なし</div>
            ) : (
              <>
                <div className="text-[24px] font-bold text-text">
                  {slaStats.resolution.toFixed(1)}%
                </div>
                <div className="text-[11px] text-text3">
                  {slaStats.resoHit} / {slaStats.resoTotal} 件達成
                </div>
              </>
            )}
          </div>
        </div>

        {/* Throughput trend */}
        <div className="bg-surface border border-border2 rounded-[10px] p-4 shadow">
          <div className="text-[12px] text-text2 mb-2 font-semibold">
            スループット (Created vs Resolved per day)
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={throughputTrend} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(120,120,120,0.15)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="created" stroke="#C05050" strokeWidth={2} dot={false} name="Created" />
                <Line type="monotone" dataKey="resolved" stroke="#6FB5A3" strokeWidth={2} dot={false} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Open backlog by severity + MTTR by severity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-surface border border-border2 rounded-[10px] p-4 shadow">
            <div className="text-[12px] text-text2 mb-2 font-semibold">
              Open バックログ (Severity 別)
            </div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={backlogBySeverity} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(120,120,120,0.15)" />
                  <XAxis dataKey="severity" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count">
                    {backlogBySeverity.map((b) => (
                      <Cell key={b.severity} fill={SEVERITY_COLOR[b.severity]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-surface border border-border2 rounded-[10px] p-4 shadow">
            <div className="text-[12px] text-text2 mb-2 font-semibold">MTTR (Severity 別)</div>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-text3 text-left">
                  <th className="font-medium pb-1.5">Severity</th>
                  <th className="font-medium pb-1.5 text-right">平均 MTTR</th>
                  <th className="font-medium pb-1.5 text-right">解決件数</th>
                </tr>
              </thead>
              <tbody>
                {mttrBySeverity.map((m) => (
                  <tr key={m.severity} className="border-t border-border2">
                    <td className="py-1.5">
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1.5"
                        style={{ backgroundColor: SEVERITY_COLOR[m.severity] }}
                      />
                      {m.severity}
                    </td>
                    <td className="py-1.5 text-right font-mono">{fmtHours(m.avgHours)}</td>
                    <td className="py-1.5 text-right font-mono text-text3">{m.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Aging buckets + Reopen rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-surface border border-border2 rounded-[10px] p-4 shadow">
            <div className="text-[12px] text-text2 mb-2 font-semibold">
              Aging (Open 課題の経過日数)
            </div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={agingBuckets}
                  margin={{ top: 4, right: 16, left: 32, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(120,120,120,0.15)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#5B8DD6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-surface border border-border2 rounded-[10px] p-4 shadow flex flex-col">
            <div className="text-[12px] text-text2 mb-2 font-semibold">期間内サマリ</div>
            <div className="flex-1 grid grid-cols-2 gap-3 content-center">
              <div>
                <div className="text-[11px] text-text3">新規起票</div>
                <div className="text-[20px] font-bold text-text">{inPeriod.length}</div>
              </div>
              <div>
                <div className="text-[11px] text-text3">解決</div>
                <div className="text-[20px] font-bold text-text">
                  {inPeriod.filter((i: any) => i.resolved_at).length}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-text3">クローズ</div>
                <div className="text-[20px] font-bold text-text">
                  {inPeriod.filter((i: any) => i.status === 'closed').length}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-text3">プロジェクト数</div>
                <div className="text-[20px] font-bold text-text">
                  {new Set(inPeriod.map((i: any) => i.project_id)).size}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Source + Category breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-surface border border-border2 rounded-[10px] p-4 shadow">
            <div className="text-[12px] text-text2 mb-2 font-semibold">ソース別件数</div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bySource}
                    dataKey="value"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ source, value }: any) => `${source}: ${value}`}
                  >
                    {bySource.map((s) => (
                      <Cell key={s.source} fill={SOURCE_COLOR[s.source] ?? '#999'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-surface border border-border2 rounded-[10px] p-4 shadow">
            <div className="text-[12px] text-text2 mb-2 font-semibold">カテゴリ別 (type)</div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byType}
                    dataKey="value"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ type, value }: any) => `${type}: ${value}`}
                  >
                    {byType.map((s) => (
                      <Cell key={s.type} fill={TYPE_COLOR[s.type] ?? '#999'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Assignee workload */}
        <div className="bg-surface border border-border2 rounded-[10px] p-4 shadow">
          <div className="text-[12px] text-text2 mb-2 font-semibold">
            担当者別ワークロード (現在の Open 課題)
          </div>
          {assigneeWorkload.length === 0 ? (
            <p className="text-[12px] text-text3">Open 課題なし</p>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-text3 text-left">
                  <th className="font-medium pb-1.5">担当者</th>
                  <th className="font-medium pb-1.5 text-right">Open 件数</th>
                  <th className="font-medium pb-1.5 text-right">平均経過日数</th>
                </tr>
              </thead>
              <tbody>
                {assigneeWorkload.map((row) => (
                  <tr key={row.userId} className="border-t border-border2">
                    <td className="py-1.5">{row.userName}</td>
                    <td className="py-1.5 text-right font-mono font-semibold">
                      {row.count}
                    </td>
                    <td className="py-1.5 text-right font-mono text-text3">
                      {row.avgAgeDays.toFixed(1)} 日
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer hint */}
        <div className="text-[10.5px] text-text3 pt-2">
          ※ Open バックログ / 担当者ワークロード / Aging は <strong>現時点</strong> の値、
          MTTR / MTTA / 再オープン率 / スループット / ソース・カテゴリ別件数は{' '}
          <strong>{PERIOD_LABELS[period]}</strong> に新規起票された課題を対象とする。
          SLA ヒット率は同期間に SLA 設定 (sla_response_deadline / sla_resolution_deadline) のある課題のみ。
          {projects && projects.length > 0 ? null : null}
        </div>
      </div>
    </>
  )
}
