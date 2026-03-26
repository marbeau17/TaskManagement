'use client'

import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ResourceLoadData } from '@/types/workload'
import { useI18n } from '@/hooks/useI18n'

interface ResourceLoadChartProps {
  data: ResourceLoadData
}

// Distinct palette for client segments (works in both light and dark mode)
const CLIENT_COLORS = [
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#10b981', // emerald-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#e11d48', // rose-600
]

function getUtilizationColor(rate: number): string {
  if (rate >= 100) return '#ef4444' // red-500
  if (rate >= 80) return '#f59e0b' // amber-500
  return '#22c55e' // green-500
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey: string
  }>
  label?: string
  t: (key: string) => string
}

function CustomTooltip({ active, payload, label, t }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const capacityEntry = payload.find((p) => p.dataKey === '__capacity')
  const clientEntries = payload.filter(
    (p) =>
      p.dataKey !== '__capacity' &&
      p.dataKey !== '__utilization' &&
      p.value > 0
  )

  const totalHours = clientEntries.reduce((sum, p) => sum + p.value, 0)
  const capacityHours = capacityEntry?.value ?? 0
  const rate =
    capacityHours > 0
      ? Math.round((totalHours / capacityHours) * 100)
      : 0

  return (
    <div className="bg-surface border border-border2 rounded-[8px] shadow-lg p-[12px] text-[12px]">
      <p className="font-bold text-text mb-[6px]">{label}</p>
      {clientEntries.map((entry) => (
        <div
          key={entry.name}
          className="flex items-center gap-[6px] mb-[2px]"
        >
          <span
            className="inline-block w-[10px] h-[10px] rounded-[2px]"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-text2">{entry.name}:</span>
          <span className="font-medium text-text">
            {entry.value.toFixed(1)}h
          </span>
        </div>
      ))}
      <div className="border-t border-border2 mt-[6px] pt-[6px] flex justify-between gap-[16px]">
        <span className="text-text2">
          {t('workload.chart.totalAssigned')}:
        </span>
        <span className="font-bold text-text">
          {totalHours.toFixed(1)}h
        </span>
      </div>
      <div className="flex justify-between gap-[16px]">
        <span className="text-text2">{t('workload.chart.capacity')}:</span>
        <span className="font-medium text-text">{capacityHours}h</span>
      </div>
      <div className="flex justify-between gap-[16px]">
        <span className="text-text2">
          {t('workload.chart.utilization')}:
        </span>
        <span
          className="font-bold"
          style={{ color: getUtilizationColor(rate) }}
        >
          {rate}%
        </span>
      </div>
    </div>
  )
}

export function ResourceLoadChart({ data }: ResourceLoadChartProps) {
  const { t } = useI18n()

  // Transform entries into recharts-compatible flat data
  const chartData = useMemo(() => {
    return data.entries
      .filter((e) => e.capacity_hours > 0)
      .sort((a, b) => b.utilization_rate - a.utilization_rate)
      .map((entry) => ({
        name:
          entry.user_name_short +
          ' ' +
          entry.user_name.split(' ').pop(),
        fullName: entry.user_name,
        __capacity: entry.capacity_hours,
        __utilization: entry.utilization_rate,
        ...entry.client_hours,
      }))
  }, [data.entries])

  const clientColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    data.client_names.forEach((name, i) => {
      map[name] = CLIENT_COLORS[i % CLIENT_COLORS.length]
    })
    return map
  }, [data.client_names])

  // Max Y-axis value
  const maxY = useMemo(() => {
    let max = 0
    for (const entry of data.entries) {
      max = Math.max(max, entry.capacity_hours, entry.total_assigned_hours)
    }
    return Math.ceil(max / 10) * 10 + 10
  }, [data.entries])

  if (chartData.length === 0) {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] p-[24px]">
        <h3 className="text-[14px] font-bold text-text mb-[12px]">
          {t('workload.chart.title')}
        </h3>
        <p className="text-[12px] text-text3 text-center py-[32px]">
          {t('common.noData')}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border2 rounded-[10px] p-[16px] md:p-[24px] shadow">
      <div className="flex items-center justify-between mb-[16px] flex-wrap gap-[8px]">
        <h3 className="text-[14px] font-bold text-text">
          {t('workload.chart.title')}
        </h3>
        <div className="flex items-center gap-[12px] text-[10px] text-text2">
          <span className="flex items-center gap-[4px]">
            <span className="inline-block w-[10px] h-[10px] rounded-full bg-green-500" />
            {'<80%'}
          </span>
          <span className="flex items-center gap-[4px]">
            <span className="inline-block w-[10px] h-[10px] rounded-full bg-amber-500" />
            {'80-100%'}
          </span>
          <span className="flex items-center gap-[4px]">
            <span className="inline-block w-[10px] h-[10px] rounded-full bg-red-500" />
            {'>100%'}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-border2, #e5e7eb)"
          />
          <XAxis
            dataKey="name"
            tick={{
              fontSize: 11,
              fill: 'var(--color-text2, #6b7280)',
            }}
            tickLine={false}
            axisLine={{
              stroke: 'var(--color-border2, #e5e7eb)',
            }}
          />
          <YAxis
            domain={[0, maxY]}
            tick={{
              fontSize: 11,
              fill: 'var(--color-text2, #6b7280)',
            }}
            tickLine={false}
            axisLine={false}
            unit="h"
          />
          <Tooltip
            content={<CustomTooltip t={t} />}
            cursor={{
              fill: 'var(--color-surf2, #f3f4f6)',
              opacity: 0.5,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value: string) =>
              value === '__capacity'
                ? t('workload.chart.capacityLine')
                : value
            }
          />

          {/* Stacked bars for each client */}
          {data.client_names.map((clientName, idx) => (
            <Bar
              key={clientName}
              dataKey={clientName}
              stackId="load"
              fill={clientColorMap[clientName]}
              radius={
                idx === data.client_names.length - 1
                  ? [4, 4, 0, 0]
                  : [0, 0, 0, 0]
              }
              barSize={40}
            />
          ))}

          {/* Capacity line overlay connecting per-member capacity points */}
          <Line
            dataKey="__capacity"
            type="step"
            stroke="#64748b"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{
              r: 4,
              fill: '#64748b',
              stroke: '#fff',
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: '#64748b',
              stroke: '#fff',
              strokeWidth: 2,
            }}
            name="__capacity"
            legendType="plainline"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
