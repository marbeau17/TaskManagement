'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Users, Hash } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import type { ChatChannel, ChatMessage as ChatMessageType } from '@/types/chat'

interface Props {
  channel: ChatChannel
  userId: string
  userName: string
}

export function ChatMessageArea({ channel, userId, userName }: Props) {
  const { t } = useI18n()
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevChannelRef = useRef<string>('')

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/chat/channels/${channel.id}/messages?limit=50`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [channel.id])

  useEffect(() => {
    if (channel.id !== prevChannelRef.current) {
      prevChannelRef.current = channel.id
      fetchMessages()
    }
  }, [channel.id, fetchMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Poll for new messages (simple polling, Supabase Realtime can replace later)
  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  const handleSend = async (content: string) => {
    if (!content.trim()) return

    // Optimistic add
    const tempMsg: ChatMessageType = {
      id: `temp-${Date.now()}`,
      channel_id: channel.id,
      user_id: userId,
      content,
      message_type: 'text',
      thread_id: null,
      reply_count: 0,
      file_url: '',
      file_name: '',
      file_size: 0,
      is_edited: false,
      is_deleted: false,
      mentions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: { id: userId, name: userName, name_short: userName.charAt(0), avatar_color: 'av-a', avatar_url: null },
    }
    setMessages(prev => [...prev, tempMsg])

    // Send to API
    try {
      const res = await fetch(`/api/chat/channels/${channel.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, content }),
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? msg : m))
      }
    } catch {}
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, emoji }),
      })
      fetchMessages() // Refresh to show updated reactions
    } catch {}
  }

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(msg)
    return acc
  }, {} as Record<string, ChatMessageType[]>)

  return (
    <>
      {/* Channel Header */}
      <div className="flex items-center gap-[10px] px-[16px] py-[10px] border-b border-border2 bg-surface shrink-0">
        <Hash className="w-[16px] h-[16px] text-text3" />
        <div className="flex-1">
          <h2 className="text-[14px] font-bold text-text">{channel.name}</h2>
          {channel.description && <p className="text-[11px] text-text3 truncate">{channel.description}</p>}
        </div>
        <div className="flex items-center gap-[4px] text-[11px] text-text3">
          <Users className="w-[13px] h-[13px]" />
          <span>{channel.members?.length ?? '—'}</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-[16px] py-[12px]">
        {loading ? (
          <div className="space-y-[12px] animate-pulse">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex gap-[10px]">
                <div className="w-[32px] h-[32px] rounded-full bg-surf2 shrink-0" />
                <div className="flex-1">
                  <div className="h-[12px] bg-surf2 rounded w-[100px] mb-[6px]" />
                  <div className="h-[14px] bg-surf2 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-[40px]">
            <span className="text-[32px] block mb-[8px]">{channel.avatar_emoji || '💬'}</span>
            <p className="text-[14px] font-bold text-text mb-[4px]">#{channel.name}</p>
            <p className="text-[12px] text-text3">{t('chat.channelStart')}</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-[12px] my-[16px]">
                <div className="flex-1 h-[1px] bg-border2" />
                <span className="text-[10px] text-text3 font-semibold px-[8px]">{date}</span>
                <div className="flex-1 h-[1px] bg-border2" />
              </div>
              {msgs.map(msg => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  userId={userId}
                  onReaction={handleReaction}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} channelName={channel.name} />
    </>
  )
}
