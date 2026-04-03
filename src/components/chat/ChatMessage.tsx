'use client'

import { useState } from 'react'
import { Smile, MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/shared'
import type { ChatMessage as ChatMessageType, ReactionGroup } from '@/types/chat'

interface Props {
  message: ChatMessageType
  userId: string
  onReaction: (messageId: string, emoji: string) => void
}

const QUICK_REACTIONS = ['👍', '❤️', '😊', '🎉', '👏']

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

function groupReactions(reactions: any[], currentUserId: string): ReactionGroup[] {
  const map: Record<string, { count: number; users: string[]; hasReacted: boolean }> = {}
  for (const r of reactions ?? []) {
    if (!map[r.emoji]) map[r.emoji] = { count: 0, users: [], hasReacted: false }
    map[r.emoji].count++
    map[r.emoji].users.push(r.user_id)
    if (r.user_id === currentUserId) map[r.emoji].hasReacted = true
  }
  return Object.entries(map).map(([emoji, data]) => ({ emoji, ...data }))
}

export function ChatMessage({ message, userId, onReaction }: Props) {
  const [showActions, setShowActions] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const isOwn = message.user_id === userId
  const reactions = groupReactions(message.reactions ?? [], userId)

  if (message.is_deleted) {
    return (
      <div className="flex items-center gap-[10px] px-[8px] py-[6px] opacity-50">
        <div className="w-[32px]" />
        <span className="text-[12px] text-text3 italic">このメッセージは削除されました</span>
      </div>
    )
  }

  return (
    <div
      className="group flex items-start gap-[10px] px-[8px] py-[6px] rounded-[8px] hover:bg-surf2/50 transition-colors relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactionPicker(false) }}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-[2px]">
        <Avatar
          name_short={message.user?.name_short ?? '?'}
          color={message.user?.avatar_color as any ?? 'av-a'}
          avatar_url={message.user?.avatar_url}
          size="sm"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name + time */}
        <div className="flex items-baseline gap-[8px]">
          <span className="text-[12.5px] font-bold text-text">{message.user?.name ?? 'Unknown'}</span>
          <span className="text-[10px] text-text3">{formatTime(message.created_at)}</span>
          {message.is_edited && <span className="text-[9px] text-text3">(編集済み)</span>}
        </div>

        {/* Message body */}
        <div className="text-[13px] text-text leading-relaxed mt-[2px] whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* File attachment */}
        {message.file_url && (
          <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-[4px] mt-[4px] px-[8px] py-[4px] bg-surf2 rounded-[6px] text-[11px] text-mint-dd hover:underline border border-border2">
            📎 {message.file_name || 'Attachment'}
          </a>
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-[4px] mt-[6px]">
            {reactions.map(r => (
              <button
                key={r.emoji}
                onClick={() => onReaction(message.id, r.emoji)}
                className={`inline-flex items-center gap-[3px] px-[6px] py-[2px] rounded-full text-[11px] border transition-colors ${
                  r.hasReacted
                    ? 'bg-mint-dd/10 border-mint-dd/30 text-mint-dd'
                    : 'bg-surf2 border-border2 text-text2 hover:border-mint'
                }`}
              >
                <span>{r.emoji}</span>
                <span className="font-semibold">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread indicator */}
        {message.reply_count > 0 && (
          <button className="flex items-center gap-[4px] mt-[4px] text-[11px] text-mint-dd hover:underline">
            <MessageSquare className="w-[12px] h-[12px]" />
            {message.reply_count} 件の返信
          </button>
        )}
      </div>

      {/* Hover actions */}
      {showActions && (
        <div className="absolute top-[-4px] right-[8px] flex items-center gap-[2px] bg-surface border border-border2 rounded-[8px] shadow-lg px-[4px] py-[2px] z-10">
          {QUICK_REACTIONS.slice(0, 3).map(emoji => (
            <button key={emoji} onClick={() => onReaction(message.id, emoji)} className="text-[14px] hover:scale-125 transition-transform p-[2px]">
              {emoji}
            </button>
          ))}
          <button onClick={() => setShowReactionPicker(!showReactionPicker)} className="p-[4px] text-text3 hover:text-text rounded-[4px] hover:bg-surf2">
            <Smile className="w-[14px] h-[14px]" />
          </button>
          {isOwn && (
            <button className="p-[4px] text-text3 hover:text-text rounded-[4px] hover:bg-surf2">
              <MoreHorizontal className="w-[14px] h-[14px]" />
            </button>
          )}
        </div>
      )}

      {/* Reaction picker dropdown */}
      {showReactionPicker && (
        <div className="absolute top-[24px] right-[8px] bg-surface border border-border2 rounded-[10px] shadow-xl p-[8px] flex flex-wrap gap-[4px] w-[180px] z-20">
          {QUICK_REACTIONS.map(emoji => (
            <button key={emoji} onClick={() => { onReaction(message.id, emoji); setShowReactionPicker(false) }} className="text-[18px] hover:scale-125 transition-transform p-[2px]">
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
