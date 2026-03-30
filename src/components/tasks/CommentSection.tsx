'use client'

import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useComments, useAddComment } from '@/hooks/useTasks'
import { Avatar, MentionInput, MentionText } from '@/components/shared'
import { useMock } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'

interface CommentSectionProps {
  taskId: string
  currentUserId: string
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const date = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} ${time}`
}

export function CommentSection({ taskId, currentUserId }: CommentSectionProps) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const { data: comments, isLoading } = useComments(taskId)
  const addComment = useAddComment()
  const [body, setBody] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachingFile, setAttachingFile] = useState(false)

  // Supabase Realtime: auto-refresh comments when a new comment is inserted
  useEffect(() => {
    if (useMock()) return

    let cleanup: (() => void) | undefined

    const setup = async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const channel = supabase
        .channel(`comments-${taskId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'comments',
            filter: `task_id=eq.${taskId}`,
          },
          () => {
            // Invalidate the comments query to refresh
            queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
          }
        )
        .subscribe()

      cleanup = () => {
        supabase.removeChannel(channel)
      }
    }

    setup()

    return () => {
      cleanup?.()
    }
  }, [taskId, queryClient])

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachingFile(true)
    try {
      const { uploadFile, getFileUrl } = await import('@/lib/data/storage')
      const result = await uploadFile(taskId, file)
      const url = await getFileUrl(result.path)
      setBody((prev) => prev + (prev ? '\n' : '') + `📎 [${file.name}](${url})`)
    } catch (err) {
      console.error('File attach failed:', err)
    } finally {
      setAttachingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSend = () => {
    const trimmed = body.trim()
    if (!trimmed) return
    addComment.mutate(
      { taskId, body: trimmed },
      { onSuccess: () => setBody('') }
    )
  }

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      <h3 className="text-[13px] font-bold text-text mb-4">
        {`💬 ${t('comment.title')}`}
      </h3>

      {/* Comment list */}
      <div className="flex flex-col gap-3 mb-4 max-h-[400px] overflow-y-auto">
        {isLoading && (
          <p className="text-[12px] text-text3">{t('comment.loading')}</p>
        )}
        {comments && comments.length === 0 && (
          <p className="text-[12px] text-text3">{t('comment.empty')}</p>
        )}
        {comments?.map((comment) => {
          const isOwn = comment.user_id === currentUserId
          return (
            <div
              key={comment.id}
              className={`rounded-md p-3 ${isOwn ? 'bg-mint-ll' : 'bg-surf2'}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {comment.user && (
                  <Avatar
                    name_short={comment.user.name_short}
                    color={comment.user.avatar_color}
                    size="sm"
                  />
                )}
                <span className="text-[12px] font-semibold text-text">
                  {comment.user?.name ?? t('comment.unknownUser')}
                </span>
                <span className="text-[10px] text-text3 ml-auto">
                  {formatDateTime(comment.created_at)}
                </span>
              </div>
              <p className="text-[12.5px] text-text whitespace-pre-wrap leading-relaxed">
                {comment.body.split(/(\[.*?\]\(.*?\))/).map((part, i) => {
                  const match = part.match(/\[(.*?)\]\((.*?)\)/)
                  if (match) {
                    return <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-mint hover:text-mint-d underline">{match[1]}</a>
                  }
                  return <MentionText key={i} text={part} />
                })}
              </p>
            </div>
          )
        })}
      </div>

      {/* New comment input */}
      <div className="flex flex-col gap-2">
        <MentionInput
          value={body}
          onChange={setBody}
          placeholder={t('comment.placeholder')}
          rows={3}
          className="w-full border border-wf-border rounded-md px-3 py-2 text-[12.5px] text-text bg-surface resize-none focus:outline-none focus:border-mint"
        />
        <div className="flex justify-end gap-[8px]">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileAttach}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={attachingFile}
            className="px-3 py-1.5 rounded-md text-[12px] font-semibold border border-wf-border text-text2 hover:bg-surf2 transition-colors disabled:opacity-50"
          >
            {attachingFile ? '...' : `📎 ${t('comment.attachFile')}`}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!body.trim() || addComment.isPending}
            className="px-4 py-1.5 rounded-md text-[12px] font-bold bg-mint text-white hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {addComment.isPending ? t('comment.sending') : t('comment.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
