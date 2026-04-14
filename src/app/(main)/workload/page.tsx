'use client'

import { useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useI18n } from '@/hooks/useI18n'
import { Topbar } from '@/components/layout'
import { Avatar, PeriodToggle, TableSkeleton } from '@/components/shared'
import { WorkloadKpi } from '@/components/workload/WorkloadKpi'
import { MemberWorkloadTable } from '@/components/workload/MemberWorkloadTable'
import { CapacityMatrix } from '@/components/workload/CapacityMatrix'
import { UtilizationTrend } from '@/components/workload/UtilizationTrend'
import { useWorkloadKpi, useWorkloadSummaries, useResourceLoadData } from '@/hooks/useWorkload'
import { useMembers } from '@/hooks/useMembers'
import { useTasks } from '@/hooks/useTasks'
import { formatDate } from '@/lib/utils'

const ResourceLoadChart = dynamic(
  () => import('@/components/workload/ResourceLoadChart').then(mod => mod.ResourceLoadChart),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-surf2 rounded-lg h-[300px]" />,
  }
)
import { PERIOD_OPTIONS } from '@/lib/constants'

export default function WorkloadPage() {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const creatorId = searchParams.get('creator')
  const [period, setPeriod] = useState('week')
  const [weekOffset, setWeekOffset] = useState(0)

  // Calculate date range based on period
  const weekStart = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7)
    return monday.toISOString().slice(0, 10)
  }, [weekOffset])

  const weekEnd = useMemo(() => {
    const start = new Date(weekStart)
    start.setDate(start.getDate() + 6)
    return start.toISOString().slice(0, 10)
  }, [weekStart])

  // periodStart: the date range start used for all data queries
  const periodStart = useMemo(() => {
    if (period === 'week') return weekStart
    if (period === 'month') {
      const now = new Date()
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    }
    return undefined // 'all' = no filter
  }, [period, weekStart])

  const { data: kpi, isLoading: kpiLoading } = useWorkloadKpi(periodStart)
  const { data: summaries, isLoading: summariesLoading } =
    useWorkloadSummaries(periodStart)
  const { data: resourceData, isLoading: loadingResource } = useResourceLoadData(periodStart)
  const { data: members } = useMembers()
  const { data: allTasks } = useTasks()

  // Find selected member and their data
  const selectedMember = useMemo(() => {
    if (!creatorId || !members) return null
    return members.find((m) => m.id === creatorId) ?? null
  }, [creatorId, members])

  const memberSummary = useMemo(() => {
    if (!creatorId || !summaries) return null
    return summaries.find((s) => s.user.id === creatorId) ?? null
  }, [creatorId, summaries])

  const memberTasks = useMemo(() => {
    if (!creatorId || !allTasks) return []
    return allTasks
      .filter((t) => {
        // Match primary assignee OR multi-assignee (task_assignees relation)
        const isPrimary = t.assigned_to === creatorId
        const assigneesArr = (t as unknown as { assignees?: Array<{ user_id?: string }> }).assignees
        const isMulti = Array.isArray(assigneesArr) && assigneesArr.some(a => a.user_id === creatorId)
        if (!isPrimary && !isMulti) return false
        if (t.status === 'done' || t.status === 'rejected' || t.status === 'dropped') return false
        // Apply period filter matching getWorkloadSummaries: include tasks that OVERLAP the period
        if (period !== 'all') {
          const deadline = t.confirmed_deadline ?? t.desired_deadline
          if (!deadline) return false
          if (periodStart) {
            const start = new Date(periodStart)
            let end: Date
            if (start.getDate() === 1) {
              end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
            } else {
              end = new Date(start)
              end.setDate(end.getDate() + 6)
            }
            const startStr = periodStart
            const endStr = end.toISOString().slice(0, 10)
            // Task overlaps period if: task_start <= period_end AND deadline >= period_start
            const taskStart = t.start_date ?? (t.created_at ? t.created_at.slice(0, 10) : null)
            if (taskStart && taskStart > endStr) return false // task starts after period
            if (deadline < startStr) return false // task ended before period
          }
        }
        return true
      })
      .sort((a, b) => {
        const da = a.confirmed_deadline ?? a.desired_deadline ?? '9999'
        const db = b.confirmed_deadline ?? b.desired_deadline ?? '9999'
        return da.localeCompare(db)
      })
  }, [creatorId, allTasks, period, periodStart])

  return (
    <>
      <Topbar title={selectedMember ? `⏱ ${t('workload.title')} - ${selectedMember.name}` : '⏱ ' + t('workload.title')}>
        {creatorId && (
          <button
            onClick={() => router.push('/workload')}
            className="h-[30px] px-[12px] rounded-[6px] text-[12px] font-semibold border border-wf-border text-text2 hover:bg-surf2 transition-colors"
          >
            {t('workload.showAll')}
          </button>
        )}
        <PeriodToggle
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
        />
      </Topbar>

      <div className="flex-1 overflow-auto p-[12px] md:p-[20px] space-y-[16px]">
        {/* Member Detail Card (when specific member selected) */}
        {selectedMember && (
          <div className="bg-surface border border-border2 rounded-[10px] shadow p-[16px]">
            <div className="flex items-start gap-[12px] mb-[12px]">
              <Avatar name_short={selectedMember.name_short} color={selectedMember.avatar_color} avatar_url={selectedMember.avatar_url} size="md" />
              <div className="flex-1">
                <h2 className="text-[16px] font-bold text-text">{selectedMember.name}</h2>
                <p className="text-[12px] text-text2">{selectedMember.email}</p>
                <div className="flex items-center gap-[8px] mt-[4px]">
                  <span className="text-[10px] px-[8px] py-[1px] rounded-full font-semibold border bg-info-bg text-info border-info-b">
                    {selectedMember.role}
                  </span>
                  <span className="text-[11px] text-text2">
                    {t('workload.capacity')}: {selectedMember.weekly_capacity_hours}h/{t('workload.perWeek')}
                  </span>
                </div>
              </div>
              {memberSummary && (
                <div className="text-right">
                  <div className={`text-[24px] font-bold ${
                    memberSummary.utilization_rate >= 100 ? 'text-red-500' :
                    memberSummary.utilization_rate >= 80 ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {memberSummary.utilization_rate}%
                  </div>
                  <div className="text-[11px] text-text2">{t('workload.utilization')}</div>
                </div>
              )}
            </div>

            {/* Member's summary stats */}
            {memberSummary && (
              <div className="grid grid-cols-3 gap-[8px] mb-[12px]">
                <div className="bg-surf2 rounded-[6px] p-[8px] text-center">
                  <div className="text-[16px] font-bold text-text">{memberSummary.task_count}</div>
                  <div className="text-[9px] text-text3">{t('workload.taskCount')}</div>
                </div>
                <div className="bg-surf2 rounded-[6px] p-[8px] text-center">
                  <div className="text-[16px] font-bold text-text">{memberSummary.estimated_hours}h</div>
                  <div className="text-[9px] text-text3">{t('workload.headerActualEstimate')}</div>
                </div>
                <div className="bg-surf2 rounded-[6px] p-[8px] text-center">
                  <div className="text-[16px] font-bold text-text">{memberSummary.completed_count}</div>
                  <div className="text-[9px] text-text3">{t('workload.completedCount')}</div>
                </div>
              </div>
            )}

            {/* Member's tasks */}
            <h3 className="text-[12px] font-bold text-text2 mb-[8px]">
              {t('workload.assignedTasks')} ({memberTasks.length})
            </h3>
            <div>
              {memberTasks.length === 0 ? (
                <p className="text-[12px] text-text3 py-[8px]">{t('workload.noAssignedTasks')}</p>
              ) : (
                <div className="space-y-[4px]">
                  {memberTasks.map((task) => {
                    const deadline = task.confirmed_deadline ?? task.desired_deadline
                    const isOverdue = deadline && new Date(deadline) < new Date()
                    return (
                      <div
                        key={task.id}
                        onClick={() => router.push(`/tasks/${task.id}`)}
                        className={`flex items-center gap-[8px] px-[10px] py-[6px] rounded-[6px] cursor-pointer hover:bg-surf2 transition-colors ${isOverdue ? 'bg-danger-bg/30' : ''}`}
                      >
                        <span className={`text-[10px] font-semibold px-[5px] py-[1px] rounded-full border ${
                          (task.priority ?? 3) <= 2 ? 'bg-danger-bg text-danger border-danger-b' :
                          (task.priority ?? 3) >= 4 ? 'bg-ok-bg text-ok border-ok-b' :
                          'bg-surf2 text-text2 border-wf-border'
                        }`}>P{task.priority ?? 3}</span>
                        <span className="text-[12px] text-text flex-1 truncate">{task.title}</span>
                        <span className="text-[11px] text-text2">{task.progress}%</span>
                        {deadline && (
                          <span className={`text-[10px] ${isOverdue ? 'text-danger font-bold' : 'text-text3'}`}>
                            {formatDate(deadline).slice(5)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== Team-wide sections (hidden when viewing individual member) ===== */}
        {!creatorId && (
          <>
            {/* KPI Cards */}
            {kpiLoading || !kpi ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface border border-border2 rounded-[10px] h-[90px] animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <WorkloadKpi data={kpi} period={period as 'week' | 'month' | 'all'} />
            )}

            {/* Resource Load Chart */}
            {loadingResource || !resourceData ? (
              <div className="bg-surface border border-border2 rounded-[10px] h-[420px] animate-pulse" />
            ) : (
              <ResourceLoadChart data={resourceData} />
            )}

            {/* Utilization Trend */}
            <UtilizationTrend />

            {/* Week Navigation + Member Workload Table */}
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-text">{t('workload.memberTable')}</h3>
              <div className="flex items-center gap-[8px]">
                <button
                  onClick={() => setWeekOffset((o) => o - 1)}
                  className="text-[11px] text-text2 hover:text-mint px-[6px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors"
                >
                  &lsaquo;
                </button>
                <span className="text-[11px] text-text2 font-medium whitespace-nowrap">
                  {weekStart.replace(/-/g, '/')} - {weekEnd.replace(/-/g, '/')}
                </span>
                <button
                  onClick={() => setWeekOffset((o) => o + 1)}
                  className="text-[11px] text-text2 hover:text-mint px-[6px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors"
                >
                  &rsaquo;
                </button>
                <button
                  onClick={() => setWeekOffset(0)}
                  className="text-[10px] text-mint hover:text-mint-d font-medium transition-colors"
                >
                  {t('workload.thisWeek')}
                </button>
              </div>
            </div>
            {summariesLoading || !summaries ? (
              <div className="bg-surface border border-border2 rounded-[10px] overflow-hidden">
                <TableSkeleton rows={6} columns={8} />
              </div>
            ) : (
              <MemberWorkloadTable summaries={summaries} />
            )}

            {/* Capacity Planning Matrix */}
            <CapacityMatrix />
          </>
        )}
      </div>
    </>
  )
}
