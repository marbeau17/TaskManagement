'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Smile, Paperclip } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useMembers } from '@/hooks/useMembers'

interface Props {
  onSend: (content: string) => void
  channelName: string
}

const QUICK_EMOJIS = ['👍', '❤️', '😊', '🎉', '👏', '🙏', '💪', '🔥', '✅', '👀']

export function ChatInput({ onSend, channelName }: Props) {
  const { t } = useI18n()
  const { data: members } = useMembers()
  const [content, setContent] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)

  // Close emoji on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSend = () => {
    if (!content.trim()) return
    onSend(content.trim())
    setContent('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContent(val)

    // Check for @ mention trigger
    const lastAt = val.lastIndexOf('@')
    if (lastAt >= 0 && (lastAt === 0 || val[lastAt - 1] === ' ')) {
      const afterAt = val.slice(lastAt + 1)
      if (!afterAt.includes(' ')) {
        setShowMentions(true)
        setMentionFilter(afterAt.toLowerCase())
        return
      }
    }
    setShowMentions(false)
  }

  const insertEmoji = (emoji: string) => {
    setContent(prev => prev + emoji)
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  return (
    <div className="px-[16px] py-[10px] border-t border-border2 bg-surface shrink-0">
      <div className="flex items-end gap-[8px] bg-surf2 rounded-[12px] border border-border2 px-[12px] py-[8px] relative">
        {/* Attachment */}
        <button className="p-[4px] text-text3 hover:text-text transition-colors shrink-0 mb-[2px]" title={t('chat.attach')}>
          <Paperclip className="w-[18px] h-[18px]" />
        </button>

        {/* Mention dropdown */}
        {showMentions && (
          <div className="absolute bottom-full left-[44px] mb-[4px] bg-surface border border-border2 rounded-[10px] shadow-xl max-h-[200px] overflow-y-auto w-[220px] z-50">
            {(members ?? [])
              .filter(m => m.is_active && m.name.toLowerCase().includes(mentionFilter))
              .slice(0, 8)
              .map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    const lastAt = content.lastIndexOf('@')
                    const before = content.slice(0, lastAt)
                    setContent(before + '@' + m.name + ' ')
                    setShowMentions(false)
                    inputRef.current?.focus()
                  }}
                  className="flex items-center gap-[8px] w-full px-[10px] py-[6px] text-[12px] text-text hover:bg-surf2 text-left"
                >
                  <span className="text-[14px]">👤</span>
                  <span className="font-medium">{m.name}</span>
                </button>
              ))}
            {(members ?? []).filter(m => m.is_active && m.name.toLowerCase().includes(mentionFilter)).length === 0 && (
              <p className="px-[10px] py-[8px] text-[11px] text-text3">メンバーが見つかりません</p>
            )}
          </div>
        )}

        {/* Text area */}
        <textarea
          ref={inputRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`#${channelName} ${t('chat.messagePlaceholder')}`}
          rows={1}
          className="flex-1 bg-transparent text-[13px] text-text placeholder:text-text3 outline-none resize-none max-h-[120px] min-h-[24px] leading-relaxed"
          style={{ height: 'auto', overflow: 'hidden' }}
          onInput={e => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }}
        />

        {/* Emoji */}
        <div className="relative shrink-0 mb-[2px]" ref={emojiRef}>
          <button onClick={() => setShowEmoji(!showEmoji)} className="p-[4px] text-text3 hover:text-text transition-colors">
            <Smile className="w-[18px] h-[18px]" />
          </button>
          {showEmoji && (
            <div className="absolute bottom-full right-0 mb-[4px] bg-surface border border-border2 rounded-[10px] shadow-xl p-[8px] flex flex-wrap gap-[4px] w-[200px] z-50">
              {QUICK_EMOJIS.map(e => (
                <button key={e} onClick={() => insertEmoji(e)} className="text-[20px] hover:scale-125 transition-transform p-[2px]">
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!content.trim()}
          className={`p-[6px] rounded-[8px] shrink-0 mb-[2px] transition-all ${
            content.trim()
              ? 'bg-mint-dd text-white hover:bg-mint-d shadow-sm'
              : 'bg-surf2 text-text3'
          }`}
        >
          <Send className="w-[16px] h-[16px]" />
        </button>
      </div>
      <p className="text-[9px] text-text3 mt-[4px] px-[4px]">{t('chat.enterToSend')}</p>
    </div>
  )
}
