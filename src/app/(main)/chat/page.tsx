'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout'
import { NotificationBell } from '@/components/shared'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { ChatSidebar } from '@/components/chat/ChatSidebar'
import { ChatMessageArea } from '@/components/chat/ChatMessageArea'
import type { ChatChannel } from '@/types/chat'

export default function ChatPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshChannels = async () => {
    const res = await fetch('/api/chat/channels')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setChannels(data)
    }
  }

  const handleChannelCreated = (ch: ChatChannel) => {
    setChannels(prev => [ch, ...prev])
    setSelectedChannel(ch)
  }

  useEffect(() => {
    fetch('/api/chat/channels')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setChannels(data)
          if (data.length > 0 && !selectedChannel) setSelectedChannel(data[0])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Topbar title={t('chat.title')}>
        <NotificationBell />
      </Topbar>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat Sidebar */}
        <ChatSidebar
          channels={channels}
          selectedChannel={selectedChannel}
          onSelectChannel={setSelectedChannel}
          onChannelCreated={handleChannelCreated}
          loading={loading}
          userId={user?.id ?? ''}
        />

        {/* Message Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedChannel ? (
            <ChatMessageArea
              channel={selectedChannel}
              userId={user?.id ?? ''}
              userName={user?.name ?? ''}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <span className="text-[40px] block mb-[8px]">💬</span>
                <p className="text-[14px] text-text3">{t('chat.selectChannel')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
