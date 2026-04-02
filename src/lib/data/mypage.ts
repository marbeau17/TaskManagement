import { isMockMode } from '@/lib/utils'
import { APP_CONFIG } from '@/lib/config'
import { startOfWeek, endOfWeek, format, differenceInCalendarDays, startOfDay, isBefore } from 'date-fns'
import type { MyPageData, MyPageWarning } from '@/types/mypage'
import type { TaskWithRelations } from '@/types/database'
import type { Issue } from '@/types/issue'

function getDeadline(t: TaskWithRelations): string | null {
  return t.confirmed_deadline ?? t.desired_deadline ?? null
}

function buildWarnings(
  tasks: TaskWithRelations[],
  issues: Issue[],
  utilizationRate: number,
  todayStr: string,
  soonDateStr: string,
  staleDateStr: string,
): MyPageWarning[] {
  const warnings: MyPageWarning[] = []

  // W1: Overdue tasks
  for (const t of tasks) {
    const dl = getDeadline(t)
    if (!dl || dl >= todayStr) continue
    if (['done', 'dropped', 'rejected'].includes(t.status)) continue
    const days = differenceInCalendarDays(new Date(todayStr), new Date(dl))
    warnings.push({
      id: `overdue-${t.id}`,
      type: 'overdue',
      severity: 'critical',
      title: t.title,
      description: `${days}日超過（期限: ${dl}）`,
      link: `/tasks/${t.id}`,
      entity_type: 'task',
      entity_id: t.id,
      days,
    })
  }

  // W2: Deadline soon
  for (const t of tasks) {
    const dl = getDeadline(t)
    if (!dl || dl < todayStr || dl > soonDateStr) continue
    if (['done', 'dropped', 'rejected'].includes(t.status)) continue
    const days = differenceInCalendarDays(new Date(dl), new Date(todayStr))
    warnings.push({
      id: `soon-${t.id}`,
      type: 'deadline_soon',
      severity: 'warning',
      title: t.title,
      description: days === 0 ? '本日締切' : `あと${days}日（期限: ${dl}）`,
      link: `/tasks/${t.id}`,
      entity_type: 'task',
      entity_id: t.id,
      days,
    })
  }

  // W3: Workload
  if (utilizationRate >= 100) {
    warnings.push({
      id: 'workload-critical',
      type: 'overloaded',
      severity: 'critical',
      title: '稼働率超過',
      description: `今週の稼働率: ${utilizationRate}%（上限: 100%）`,
      link: '/workload',
      entity_type: 'workload',
    })
  } else if (utilizationRate >= APP_CONFIG.workload.warningThreshold) {
    warnings.push({
      id: 'workload-warning',
      type: 'overloaded',
      severity: 'warning',
      title: '稼働率注意',
      description: `今週の稼働率: ${utilizationRate}%（閾値: ${APP_CONFIG.workload.warningThreshold}%）`,
      link: '/workload',
      entity_type: 'workload',
    })
  }

  // W4: Stale tasks
  for (const t of tasks) {
    if (t.status !== 'in_progress') continue
    if (t.updated_at >= staleDateStr) continue
    const days = differenceInCalendarDays(new Date(todayStr), new Date(t.updated_at.slice(0, 10)))
    warnings.push({
      id: `stale-${t.id}`,
      type: 'stale_task',
      severity: 'caution',
      title: t.title,
      description: `${days}日間更新なし（ステータス: 進行中）`,
      link: `/tasks/${t.id}`,
      entity_type: 'task',
      entity_id: t.id,
      days,
    })
  }

  // W5: Critical/High issues
  for (const i of issues) {
    if (!['critical', 'high'].includes(i.severity)) continue
    warnings.push({
      id: `issue-${i.id}`,
      type: 'critical_issue',
      severity: i.severity === 'critical' ? 'critical' : 'warning',
      title: `${i.issue_key}: ${i.title}`,
      description: `${i.severity === 'critical' ? 'Critical' : 'High'} Issue — ${i.status === 'open' ? '未着手' : '対応中'}`,
      link: `/issues/${i.id}`,
      entity_type: 'issue',
      entity_id: i.id,
    })
  }

  // Sort: severity (critical > warning > caution), then type priority, then days
  const sevOrder: Record<string, number> = { critical: 0, warning: 1, caution: 2 }
  const typeOrder: Record<string, number> = { overdue: 0, critical_issue: 1, deadline_soon: 2, overloaded: 3, stale_task: 4 }
  warnings.sort((a, b) => {
    const sd = (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9)
    if (sd !== 0) return sd
    const td = (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9)
    if (td !== 0) return td
    return (b.days ?? 0) - (a.days ?? 0)
  })

  return warnings
}

// Mock data for development without Supabase
function getMockMyPageData(): MyPageData {
  return {
    summary: {
      today_task_count: 3,
      week_task_count: 8,
      utilization_rate: 72,
      open_issue_count: 2,
      has_critical_issue: false,
      has_high_issue: true,
    },
    warnings: [
      {
        id: 'mock-w1',
        type: 'deadline_soon',
        severity: 'warning',
        title: 'サンプルタスク',
        description: 'あと2日（期限: 2026-04-04）',
        link: '/tasks/mock-1',
        entity_type: 'task',
        entity_id: 'mock-1',
        days: 2,
      },
    ],
    today_tasks: [],
    week_tasks: [],
    my_issues: [],
    recent_activities: [],
  }
}

export async function getMyPageData(userId: string): Promise<MyPageData> {
  if (isMockMode()) {
    return getMockMyPageData()
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd')
  const soonDate = new Date(today.getTime() + APP_CONFIG.alerts.deadlineSoonDays * 86400000)
  const soonDateStr = format(soonDate, 'yyyy-MM-dd')
  const staleDate = new Date(today.getTime() - APP_CONFIG.alerts.staleTaskDays * 86400000)
  const staleDateStr = format(staleDate, 'yyyy-MM-dd')

  // Parallel queries
  const [tasksResult, assigneesResult, issuesResult, activitiesResult, userResult] = await Promise.all([
    // Fetch ALL active tasks (not just assigned_to = userId) so we can merge with task_assignees
    db
      .from('tasks')
      .select(`*, client:clients(id, name), project:projects(id, name),
               assigned_user:users!tasks_assigned_to_fkey(id, name, name_short, avatar_color, avatar_url),
               requester:users!tasks_requested_by_fkey(id, name, name_short, avatar_color),
               director:users!tasks_director_id_fkey(id, name, name_short)`)
      .not('status', 'in', '("done","dropped","rejected")')
      .order('priority', { ascending: true }),

    // Fetch task_assignees for this user (multi-assignee support)
    db
      .from('task_assignees')
      .select('task_id')
      .eq('user_id', userId),

    db
      .from('issues')
      .select(`*, project:projects(id, name),
               reporter:users!issues_reported_by_fkey(id, name, name_short, avatar_color)`)
      .eq('assigned_to', userId)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false }),

    db
      .from('activity_logs')
      .select(`*, user:users(id, name, name_short, avatar_color, avatar_url),
               task:tasks(id, title)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    db
      .from('users')
      .select('weekly_capacity_hours')
      .eq('id', userId)
      .single(),
  ])

  // Build set of task IDs assigned to this user via task_assignees
  const assigneeTaskIds = new Set<string>(
    (assigneesResult.data ?? []).map((r: { task_id: string }) => r.task_id)
  )

  // Filter tasks: assigned_to = userId OR in task_assignees
  const allTasks: TaskWithRelations[] = tasksResult.data ?? []
  const tasks = allTasks.filter(t =>
    t.assigned_to === userId || assigneeTaskIds.has(t.id)
  )

  const issues: Issue[] = issuesResult.data ?? []
  const activities = activitiesResult.data ?? []
  const capacityHours = userResult.data?.weekly_capacity_hours ?? 40

  // Today tasks: deadline = today OR status = in_progress
  const todayTasks = tasks.filter(t => {
    const dl = getDeadline(t)
    return (dl && dl === todayStr) || t.status === 'in_progress'
  }).sort((a, b) => a.priority - b.priority)

  // Week tasks: tasks that overlap with this week
  const { taskOverlapsWeek, getTaskWeeklyHours } = await import('@/lib/workload-utils')
  const weekTasks = tasks.filter(t =>
    taskOverlapsWeek(t, weekStart, weekEnd)
  ).sort((a, b) => a.priority - b.priority)

  // Utilization rate: sum of weekly hours for tasks overlapping this week
  const weeklyHoursTotal = weekTasks.reduce((sum, t) => {
    return sum + getTaskWeeklyHours(t, weekStartStr)
  }, 0)
  const utilizationRate = capacityHours > 0 ? Math.round((weeklyHoursTotal / capacityHours) * 100) : 0

  // Warnings
  const warnings = buildWarnings(tasks, issues, utilizationRate, todayStr, soonDateStr, staleDateStr)

  // Summary
  const hasCritical = issues.some(i => i.severity === 'critical')
  const hasHigh = issues.some(i => i.severity === 'high')

  return {
    summary: {
      today_task_count: todayTasks.length,
      week_task_count: weekTasks.length,
      utilization_rate: utilizationRate,
      open_issue_count: issues.length,
      has_critical_issue: hasCritical,
      has_high_issue: hasHigh,
    },
    warnings,
    today_tasks: todayTasks,
    week_tasks: weekTasks,
    my_issues: issues,
    recent_activities: activities,
  }
}
