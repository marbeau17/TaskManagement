'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useTasks } from '@/hooks/useTasks'
import { useI18n } from '@/hooks/useI18n'

interface BurndownPoint {
  date: string
  label: string
  ideal: number
  actual: number | null
}

/**
 * Build burndown data for the current month.
 * - Ideal line: linear decrease from totalTasks to 0 over the month.
 * - Actual line: starts at totalTasks, decrements by tasks completed each day.
 */
function buildBurndownData(
  tasks: Array<{ status: string; updated_at: string }>,
): BurndownPoint[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const totalDays = lastDay.getDate()
  const totalTasks = tasks.length

  // Count tasks completed per day (status === 'done', keyed by date string)
  const completedByDate = new Map<string, number>()
  for (const task of tasks) {
    if (task.status === 'done') {
      const d = new Date(task.updated_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      completedByDate.set(key, (completedByDate.get(key) || 0) + 1)
    }
  }

  const points: BurndownPoint[] = []
  let remaining = totalTasks

  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(year, month, day)
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    // Ideal: linear from totalTasks on day 1 to 0 on last day
    const ideal = Math.round(totalTasks * (1 - (day - 1) / (totalDays - 1)))

    // Actual: only show up to today
    const isFuture = dateObj > now
    const completedToday = completedByDate.get(dateKey) || 0
    remaining -= completedToday

    points.push({
      date: dateKey,
      label: `${month + 1}/${day}`,
      ideal,
      actual: isFuture ? null : remaining,
    })
  }

  return points
}

export function BurndownChart() {
  const { data: tasks, isLoading } = useTasks()
  const { t } = useI18n()

  const burndownData = useMemo(() => {
    if (!tasks || tasks.length === 0) return []
    return buildBurndownData(tasks)
  }, [tasks])

  if (isLoading) {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow">
        <div className="text-[12px] text-text3">{t('common.loading')}</div>
      </div>
    )
  }

  if (burndownData.length === 0) {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow">
        <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2 -m-[16px] mb-[12px] rounded-t-[10px]">
          <h3 className="text-[13px] font-bold text-text">
            {t('dashboard.burndown')}
          </h3>
        </div>
        <div className="text-[12px] text-text3 text-center py-[16px]">
          {t('common.noData')}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
      {/* Header */}
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
        <h3 className="text-[13px] font-bold text-text">
          {t('dashboard.burndown')}
        </h3>
      </div>

      {/* Chart */}
      <div className="p-[16px]">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={burndownData}
            margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border2)"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--color-text3)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border2)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--color-text3)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border2)' }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border2)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--color-text)',
              }}
              labelStyle={{ color: 'var(--color-text2)', fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: 'var(--color-text2)' }}
            />
            <Line
              type="monotone"
              dataKey="ideal"
              name={t('dashboard.burndownIdeal')}
              stroke="var(--color-text3)"
              strokeDasharray="6 3"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="actual"
              name={t('dashboard.burndownActual')}
              stroke="var(--color-mint)"
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
