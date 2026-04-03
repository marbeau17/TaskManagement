'use client'

import { useState } from 'react'
import { Hash, Lock, MessageCircle, Plus, ChevronDown, ChevronRight, Search } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import type { ChatChannel } from '@/types/chat'

interface Props {
  channels: ChatChannel[]
  selectedChannel: ChatChannel | null
  onSelectChannel: (ch: ChatChannel) => void
  onChannelCreated?: (ch: ChatChannel) => void
  loading: boolean
  userId: string
}

export function ChatSidebar({ channels, selectedChannel, onSelectChannel, onChannelCreated, loading, userId }: Props) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [dmsOpen, setDmsOpen] = useState(true)

  const publicChannels = channels.filter(c => c.channel_type !== 'dm')
  const dmChannels = channels.filter(c => c.channel_type === 'dm')

  const filtered = search
    ? channels.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : null

  const handleCreate = async () => {
    if (!newName.trim() || !userId) return
    try {
      const res = await fetch('/api/chat/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), created_by: userId }),
      })
      if (res.ok) {
        const ch = await res.json()
        setNewName('')
        setShowCreate(false)
        onChannelCreated?.(ch)
      }
    } catch {}
  }

  const ChannelIcon = ({ type }: { type: string }) => {
    if (type === 'private') return <Lock className="w-[14px] h-[14px] text-text3" />
    if (type === 'dm') return <MessageCircle className="w-[14px] h-[14px] text-text3" />
    return <Hash className="w-[14px] h-[14px] text-text3" />
  }

  return (
    <div className="w-[260px] bg-surf2/50 border-r border-border2 flex flex-col shrink-0 overflow-hidden">
      {/* Search */}
      <div className="p-[10px] border-b border-border2">
        <div className="relative">
          <Search className="absolute left-[8px] top-1/2 -translate-y-1/2 w-[13px] h-[13px] text-text3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('chat.searchChannels')}
            className="w-full pl-[28px] pr-[8px] py-[6px] text-[12px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
          />
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-[10px] space-y-[6px] animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-[32px] bg-surface rounded-[6px]" />)}
          </div>
        ) : filtered ? (
          <div className="p-[6px]">
            {filtered.map(ch => (
              <ChannelItem key={ch.id} channel={ch} selected={selectedChannel?.id === ch.id} onClick={() => onSelectChannel(ch)} />
            ))}
          </div>
        ) : (
          <>
            {/* Channels section */}
            <div className="p-[6px]">
              <button onClick={() => setChannelsOpen(!channelsOpen)} className="flex items-center gap-[4px] px-[8px] py-[4px] text-[10px] font-bold text-text2 uppercase tracking-wider w-full hover:bg-surface rounded-[4px]">
                {channelsOpen ? <ChevronDown className="w-[12px] h-[12px]" /> : <ChevronRight className="w-[12px] h-[12px]" />}
                {t('chat.channels')}
                <span className="ml-auto text-text3">{publicChannels.length}</span>
              </button>
              {channelsOpen && publicChannels.map(ch => (
                <ChannelItem key={ch.id} channel={ch} selected={selectedChannel?.id === ch.id} onClick={() => onSelectChannel(ch)} />
              ))}
            </div>

            {/* DMs section */}
            {dmChannels.length > 0 && (
              <div className="p-[6px]">
                <button onClick={() => setDmsOpen(!dmsOpen)} className="flex items-center gap-[4px] px-[8px] py-[4px] text-[10px] font-bold text-text2 uppercase tracking-wider w-full hover:bg-surface rounded-[4px]">
                  {dmsOpen ? <ChevronDown className="w-[12px] h-[12px]" /> : <ChevronRight className="w-[12px] h-[12px]" />}
                  {t('chat.directMessages')}
                </button>
                {dmsOpen && dmChannels.map(ch => (
                  <ChannelItem key={ch.id} channel={ch} selected={selectedChannel?.id === ch.id} onClick={() => onSelectChannel(ch)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create channel */}
      <div className="p-[10px] border-t border-border2">
        {showCreate ? (
          <div className="space-y-[6px]">
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('chat.channelName')} autoFocus className="w-full text-[12px] px-[8px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            <div className="flex gap-[4px]">
              <button onClick={handleCreate} className="flex-1 py-[4px] text-[11px] font-bold text-white bg-mint-dd rounded-[6px]">{t('common.add')}</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 py-[4px] text-[11px] text-text2 bg-surface border border-border2 rounded-[6px]">{t('common.cancel')}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-[6px] w-full px-[8px] py-[6px] text-[11px] font-semibold text-mint-dd hover:bg-surface rounded-[6px] transition-colors">
            <Plus className="w-[14px] h-[14px]" /> {t('chat.createChannel')}
          </button>
        )}
      </div>
    </div>
  )
}

function ChannelItem({ channel, selected, onClick }: { channel: ChatChannel; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-[8px] w-full px-[10px] py-[7px] rounded-[6px] text-left transition-colors ${
        selected
          ? 'bg-mint-dd/10 text-mint-dd font-semibold'
          : 'text-text2 hover:bg-surface hover:text-text'
      }`}
    >
      <span className="text-[14px]">{channel.avatar_emoji || (channel.channel_type === 'dm' ? '👤' : '#')}</span>
      <span className="text-[12.5px] truncate flex-1">{channel.name}</span>
      {(channel.unread_count ?? 0) > 0 && (
        <span className="text-[9px] bg-mint-dd text-white px-[5px] py-[1px] rounded-full font-bold min-w-[16px] text-center">
          {channel.unread_count}
        </span>
      )}
    </button>
  )
}
