'use client'

import { SOURCE_CHANNELS, SOURCE_CHANNEL_LABELS, SOURCE_CHANNEL_COLORS, type SourceChannel } from '@/lib/crm/source-resolver'

interface Props {
  /** Records to derive which channels are present (該当ゼロのチャネルは非表示) */
  availableSources: Array<{ source_channel?: string | null }>
  value: 'all' | SourceChannel
  onChange: (v: 'all' | SourceChannel) => void
  className?: string
}

/**
 * 流入経路フィルタチップ列。Contacts / Leads / Companies / AI 経営診断で共通利用。
 */
export function SourceChannelFilter({ availableSources, value, onChange, className = '' }: Props) {
  const present = new Set<SourceChannel>()
  for (const r of availableSources) {
    if (r.source_channel && SOURCE_CHANNELS.includes(r.source_channel as SourceChannel)) {
      present.add(r.source_channel as SourceChannel)
    }
  }
  if (present.size === 0) return null

  return (
    <div className={`flex items-center gap-[4px] flex-wrap ${className}`}>
      <span className="text-[10px] text-text3 mr-[2px]">流入経路:</span>
      <button
        onClick={() => onChange('all')}
        className={`text-[10px] px-[8px] py-[2px] rounded-full font-semibold border transition-colors ${
          value === 'all'
            ? 'bg-mint-dd text-white border-mint-dd'
            : 'bg-surface border-border2 text-text2 hover:bg-surf2'
        }`}
      >
        すべて
      </button>
      {SOURCE_CHANNELS.filter(ch => present.has(ch)).map(ch => {
        const isActive = value === ch
        return (
          <button
            key={ch}
            onClick={() => onChange(ch)}
            className={`text-[10px] px-[8px] py-[2px] rounded-full font-semibold border transition-colors ${
              isActive
                ? 'bg-mint-dd text-white border-mint-dd'
                : `${SOURCE_CHANNEL_COLORS[ch]} hover:opacity-80`
            }`}
            title={SOURCE_CHANNEL_LABELS[ch]}
          >
            {SOURCE_CHANNEL_LABELS[ch]}
          </button>
        )
      })}
    </div>
  )
}

/**
 * 単一の流入経路バッジ表示用。テーブル行内で使う。
 */
export function SourceChannelBadge({ channel, detail }: { channel?: string | null; detail?: string | null }) {
  if (!channel || !SOURCE_CHANNELS.includes(channel as SourceChannel)) {
    return <span className="text-text3">—</span>
  }
  const ch = channel as SourceChannel
  return (
    <span
      className={`text-[10px] px-[6px] py-[1px] rounded-full font-semibold border ${SOURCE_CHANNEL_COLORS[ch]}`}
      title={detail ? `${SOURCE_CHANNEL_LABELS[ch]}: ${detail}` : SOURCE_CHANNEL_LABELS[ch]}
    >
      {SOURCE_CHANNEL_LABELS[ch]}
    </span>
  )
}
