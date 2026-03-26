'use client'

import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { TaskWithRelations } from '@/types/database'
import { useI18n } from '@/hooks/useI18n'

interface StatusDistributionChartProps {
  tasks: TaskWithRelations[]
}

const STATUS_COLORS: Record<string, string> = {
  waiting: '#C8A030',
  todo: '#94A3B8',
  in_progress: '#3B82F6',
  done: '#6FB5A3',
  rejected: '#C05050',
}

export function StatusDistributionChart({ tasks }: StatusDistributionChartProps) {
  const { t } = useI18n()

  const STATUS_LABELS: Record<string, string> = useMemo(() => ({
    waiting: t('tasks.waiting'),
    todo: t('tasks.todo'),
    in_progress: t('tasks.inProgress'),
    done: t('tasks.done'),
    rejected: 'Rejected',
  }), [t])

  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    tasks.forEach((task) => {
      counts[task.status] = (counts[task.status] || 0) + 1
    })

    return Object.entries(counts)
      .map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        status,
      }))
      .filter((d) => d.value > 0)
  }, [tasks, STATUS_LABELS])

  if (data.length === 0) {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow">
        <h3 className="text-[13px] font-semibold text-text mb-[12px]">
          {t('reports.statusDistribution')}
        </h3>
        <div className="h-[260px] flex items-center justify-center text-text3 text-[12px]">
          {t('reports.noData')}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow">
      <h3 className="text-[13px] font-semibold text-text mb-[12px]">
        {t('reports.statusDistribution')}
      </h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              label={false}
              labelLine={false}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_COLORS[entry.status] || '#94A3B8'}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border2)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--color-text)',
              }}
              formatter={(value) => [`${value} ${t('reports.tasks')}`, '']}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value) => (
                <span style={{ color: 'var(--color-text2)' }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
