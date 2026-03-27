'use client'

import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import { useTasks } from '@/hooks/useTasks'
import { useI18n } from '@/hooks/useI18n'
import type { TaskWithRelations } from '@/types/database'

type ViewMode = 'client' | 'creator'

interface ChartDataItem {
  name: string
  estimated: number
  actual: number
  variance: number // positive = over budget, negative = under budget
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const COLOR_ESTIMATE = '#6FB5A3' // mint
const COLOR_ACTUAL = '#5B7FD6'   // contrasting blue
const COLOR_OVER = '#C05050'
const COLOR_UNDER = '#4A9482'

// ---------------------------------------------------------------------------
// Data computation
// ---------------------------------------------------------------------------

function buildChartData(
  tasks: TaskWithRelations[],
  mode: ViewMode
): ChartDataItem[] {
  const grouped = new Map<string, { estimated: number; actual: number }>()

  for (const task of tasks) {
    let key: string
    if (mode === 'client') {
      key = task.client?.name ?? '(unknown)'
    } else {
      key = task.requester?.name ?? '(unknown)'
    }

    if (!grouped.has(key)) {
      grouped.set(key, { estimated: 0, actual: 0 })
    }
    const g = grouped.get(key)!
    g.estimated += task.estimated_hours ?? 0
    g.actual += task.actual_hours ?? 0
  }

  return Array.from(grouped.entries())
    .map(([name, { estimated, actual }]) => ({
      name,
      estimated: Math.round(estimated * 10) / 10,
      actual: Math.round(actual * 10) / 10,
      variance: Math.round((actual - estimated) * 10) / 10,
    }))
    .sort((a, b) => b.estimated - a.estimated)
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label, t }: any) {
  if (!active || !payload?.length) return null

  const estimated = payload.find((p: any) => p.dataKey === 'estimated')?.value ?? 0
  const actual = payload.find((p: any) => p.dataKey === 'actual')?.value ?? 0
  const variance = actual - estimated
  const isOver = variance > 0

  return (
    <div className="bg-surface border border-border2 rounded-[8px] p-[10px] shadow-lg text-[11px]">
      <p className="font-bold text-text mb-[4px]">{label}</p>
      <p className="text-text2">
        <span
          className="inline-block w-[8px] h-[8px] rounded-full mr-[6px]"
          style={{ backgroundColor: COLOR_ESTIMATE }}
        />
        {t('dashboard.estimateVsActual.estimated')}: {estimated}h
      </p>
      <p className="text-text2">
        <span
          className="inline-block w-[8px] h-[8px] rounded-full mr-[6px]"
          style={{ backgroundColor: COLOR_ACTUAL }}
        />
        {t('dashboard.estimateVsActual.actual')}: {actual}h
      </p>
      <p
        className="mt-[4px] font-semibold"
        style={{ color: isOver ? COLOR_OVER : COLOR_UNDER }}
      >
        {isOver ? '+ ' : ''}{variance}h ({isOver
          ? t('dashboard.estimateVsActual.over')
          : t('dashboard.estimateVsActual.under')})
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Variance indicator row
// ---------------------------------------------------------------------------

function VarianceIndicators({
  data,
  t,
}: {
  data: ChartDataItem[]
  t: (key: string) => string
}) {
  if (data.length === 0) return null

  return (
    <div className="flex flex-wrap gap-[8px] mt-[8px]">
      {data.map((item) => {
        if (item.variance === 0 && item.estimated === 0 && item.actual === 0) return null
        const isOver = item.variance > 0
        const isZero = item.variance === 0

        return (
          <div
            key={item.name}
            className="flex items-center gap-[4px] text-[10px] px-[8px] py-[3px] rounded-full border"
            style={{
              backgroundColor: isZero
                ? 'var(--color-surf2)'
                : isOver
                  ? 'var(--color-danger-bg)'
                  : 'var(--color-ok-bg)',
              borderColor: isZero
                ? 'var(--color-border2)'
                : isOver
                  ? 'var(--color-danger-b)'
                  : 'var(--color-ok-b)',
              color: isZero
                ? 'var(--color-text2)'
                : isOver
                  ? 'var(--color-danger)'
                  : 'var(--color-ok)',
            }}
          >
            <span className="font-semibold truncate max-w-[80px]">{item.name}</span>
            <span>
              {isOver ? '+' : ''}{item.variance}h
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EstimateVsActualChart() {
  const { data: tasks, isLoading } = useTasks()
  const { t } = useI18n()
  const [viewMode, setViewMode] = useState<ViewMode>('client')

  const chartData = useMemo(() => {
    if (!tasks) return []
    return buildChartData(tasks, viewMode)
  }, [tasks, viewMode])

  if (isLoading) {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow">
        <div className="text-[12px] text-text3">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-[12px] py-[10px] border-b border-border2 bg-surf2">
        <h3 className="text-[13px] font-bold text-text">
          {t('dashboard.estimateVsActual.title')}
        </h3>

        {/* View toggle */}
        <div className="flex items-center gap-[2px] bg-surf3 rounded-[6px] p-[2px]">
          <button
            onClick={() => setViewMode('client')}
            className={`px-[10px] py-[3px] text-[10px] font-semibold rounded-[4px] transition-colors ${
              viewMode === 'client'
                ? 'bg-surface text-mint-dd shadow-sm'
                : 'text-text2 hover:text-text'
            }`}
          >
            {t('dashboard.estimateVsActual.byClient')}
          </button>
          <button
            onClick={() => setViewMode('creator')}
            className={`px-[10px] py-[3px] text-[10px] font-semibold rounded-[4px] transition-colors ${
              viewMode === 'creator'
                ? 'bg-surface text-mint-dd shadow-sm'
                : 'text-text2 hover:text-text'
            }`}
          >
            {t('dashboard.estimateVsActual.byCreator')}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="px-[12px] py-[12px]">
        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                barGap={2}
                barCategoryGap="20%"
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'var(--color-text2)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border2)' }}
                  interval={0}
                  angle={chartData.length > 5 ? -30 : 0}
                  textAnchor={chartData.length > 5 ? 'end' : 'middle'}
                  height={chartData.length > 5 ? 60 : 30}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--color-text2)' }}
                  tickLine={false}
                  axisLine={false}
                  unit="h"
                  width={45}
                />
                <Tooltip
                  content={<ChartTooltip t={t} />}
                  cursor={{ fill: 'var(--color-surf2)', opacity: 0.5 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value: string) => {
                    if (value === 'estimated') return t('dashboard.estimateVsActual.estimated')
                    if (value === 'actual') return t('dashboard.estimateVsActual.actual')
                    return value
                  }}
                />
                <ReferenceLine y={0} stroke="var(--color-border2)" />
                <Bar
                  dataKey="estimated"
                  fill={COLOR_ESTIMATE}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="actual"
                  fill={COLOR_ACTUAL}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Variance indicators */}
            <VarianceIndicators data={chartData} t={t} />
          </>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-[12px] text-text3">
            {t('common.noData')}
          </div>
        )}
      </div>
    </div>
  )
}
