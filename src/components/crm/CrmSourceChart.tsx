'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/useI18n'

interface SourceData {
  channel: string
  count: number
  percentage: number
}

const CHANNEL_COLORS: Record<string, string> = {
  web_form: 'bg-blue-500',
  line: 'bg-green-500',
  instagram: 'bg-pink-500',
  referral: 'bg-purple-500',
  cold_call: 'bg-amber-500',
  event: 'bg-indigo-500',
  advertisement: 'bg-red-500',
  organic: 'bg-emerald-500',
  other: 'bg-gray-400',
  '': 'bg-gray-300',
}

const CHANNEL_LABELS: Record<string, { ja: string; en: string }> = {
  web_form: { ja: 'Webフォーム', en: 'Web Form' },
  line: { ja: 'LINE', en: 'LINE' },
  instagram: { ja: 'Instagram', en: 'Instagram' },
  referral: { ja: '紹介', en: 'Referral' },
  cold_call: { ja: '電話営業', en: 'Cold Call' },
  event: { ja: 'イベント', en: 'Event' },
  advertisement: { ja: '広告', en: 'Advertisement' },
  organic: { ja: 'オーガニック', en: 'Organic' },
  other: { ja: 'その他', en: 'Other' },
  '': { ja: '未設定', en: 'Not Set' },
}

export function CrmSourceChart() {
  const { t, locale } = useI18n()
  const [data, setData] = useState<SourceData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/crm/contacts?pageSize=500')
      .then(r => r.json())
      .then(result => {
        const contacts = result.data ?? result ?? []
        if (!Array.isArray(contacts)) return

        const counts: Record<string, number> = {}
        contacts.forEach((c: any) => {
          const ch = c.source_channel || c.source || ''
          counts[ch] = (counts[ch] || 0) + 1
        })

        const total = contacts.length || 1
        const sorted = Object.entries(counts)
          .map(([channel, count]) => ({ channel, count, percentage: Math.round((count / total) * 100) }))
          .sort((a, b) => b.count - a.count)

        setData(sorted)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="bg-surface border border-border2 rounded-[10px] shadow h-[200px] animate-pulse" />
  }

  if (data.length === 0) return null

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
        <h3 className="text-[13px] font-bold text-text">{t('crm.source.title')}</h3>
      </div>
      <div className="p-[16px] space-y-[8px]">
        {data.map(item => {
          const label = CHANNEL_LABELS[item.channel]?.[locale] ?? (item.channel || '—')
          const color = CHANNEL_COLORS[item.channel] ?? 'bg-gray-400'
          return (
            <div key={item.channel} className="flex items-center gap-[8px]">
              <div className={`w-[8px] h-[8px] rounded-full ${color} shrink-0`} />
              <span className="text-[12px] text-text w-[100px] truncate">{label}</span>
              <div className="flex-1 bg-surf2 rounded-full h-[14px] overflow-hidden">
                <div className={`${color} h-full rounded-full`} style={{ width: `${Math.max(3, item.percentage)}%` }} />
              </div>
              <span className="text-[11px] text-text2 w-[50px] text-right">{item.count} ({item.percentage}%)</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
