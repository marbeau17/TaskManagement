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
} from 'recharts'
import type { TaskWithRelations } from '@/types/database'
import { useI18n } from '@/hooks/useI18n'

interface ClientTaskChartProps {
  tasks: TaskWithRelations[]
}

export function ClientTaskChart({ tasks }: ClientTaskChartProps) {
  const { t } = useI18n()

  const data = useMemo(() => {
    const clientCounts: Record<string, { name: string; count: number }> = {}

    tasks.forEach((task) => {
      const clientName = task.client?.name || 'Unknown'
      const clientId = task.client_id
      if (!clientCounts[clientId]) {
        clientCounts[clientId] = { name: clientName, count: 0 }
      }
      clientCounts[clientId].count++
    })

    return Object.values(clientCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item) => ({
        name: item.name.length > 15 ? item.name.slice(0, 15) + '...' : item.name,
        [t('reports.tasks')]: item.count,
      }))
  }, [tasks, t])

  if (data.length === 0) {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow">
        <h3 className="text-[13px] font-semibold text-text mb-[12px]">
          {t('reports.tasksByClient')}
        </h3>
        <div className="h-[260px] flex items-center justify-center text-text3 text-[12px]">
          {t('reports.noData')}
        </div>
      </div>
    )
  }

  const chartHeight = Math.max(260, data.length * 40)

  return (
    <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow">
      <h3 className="text-[13px] font-semibold text-text mb-[12px]">
        {t('reports.tasksByClient')}
      </h3>
      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border2)" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'var(--color-text2)' }}
              axisLine={{ stroke: 'var(--color-border2)' }}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: 'var(--color-text2)' }}
              axisLine={{ stroke: 'var(--color-border2)' }}
              tickLine={false}
              width={120}
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
            <Bar
              dataKey={t('reports.tasks')}
              fill="#8060B0"
              radius={[0, 4, 4, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
