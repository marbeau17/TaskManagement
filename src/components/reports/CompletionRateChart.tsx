'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { TaskWithRelations } from '@/types/database'
import { useI18n } from '@/hooks/useI18n'

interface CompletionRateChartProps {
  tasks: TaskWithRelations[]
  dateRange: 'week' | 'month' | '3months'
}

function getWeekLabel(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}`
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export function CompletionRateChart({ tasks, dateRange }: CompletionRateChartProps) {
  const { t } = useI18n()

  const data = useMemo(() => {
    const now = new Date()
    let startDate: Date
    let bucketFn: (d: Date) => string
    let buckets: string[]

    if (dateRange === 'week') {
      // Show daily for this week
      const monday = getMonday(now)
      startDate = monday
      buckets = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday)
        d.setDate(d.getDate() + i)
        const label = `${d.getMonth() + 1}/${d.getDate()}`
        buckets.push(label)
      }
      bucketFn = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
    } else if (dateRange === 'month') {
      // Show weekly for this month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      buckets = []
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      let current = new Date(startDate)
      while (current <= monthEnd) {
        const weekStart = new Date(current)
        buckets.push(getWeekLabel(weekStart))
        current.setDate(current.getDate() + 7)
      }
      bucketFn = (d: Date) => {
        const monday = getMonday(d)
        return getWeekLabel(monday)
      }
    } else {
      // Show monthly for last 3 months
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      buckets = []
      for (let i = 0; i < 3; i++) {
        const m = new Date(now.getFullYear(), now.getMonth() - 2 + i, 1)
        buckets.push(`${m.getFullYear()}/${m.getMonth() + 1}`)
      }
      bucketFn = (d: Date) => `${d.getFullYear()}/${d.getMonth() + 1}`
    }

    const completedMap: Record<string, number> = {}
    const totalMap: Record<string, number> = {}
    buckets.forEach((b) => {
      completedMap[b] = 0
      totalMap[b] = 0
    })

    tasks.forEach((task) => {
      const createdAt = new Date(task.created_at)
      if (createdAt < startDate) return

      const bucket = bucketFn(createdAt)
      if (bucket in totalMap) {
        totalMap[bucket]++
        if (task.status === 'done') {
          completedMap[bucket]++
        }
      }
    })

    return buckets.map((label) => ({
      name: label,
      [t('reports.completed')]: completedMap[label] ?? 0,
      [t('reports.total')]: totalMap[label] ?? 0,
    }))
  }, [tasks, dateRange, t])

  return (
    <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow">
      <h3 className="text-[13px] font-semibold text-text mb-[12px]">
        {t('reports.completionRate')}
      </h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border2)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'var(--color-text2)' }}
              axisLine={{ stroke: 'var(--color-border2)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-text2)' }}
              axisLine={{ stroke: 'var(--color-border2)' }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border2)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--color-text)',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', color: 'var(--color-text2)' }}
            />
            <Bar
              dataKey={t('reports.total')}
              fill="#94A3B8"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey={t('reports.completed')}
              fill="#6FB5A3"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
