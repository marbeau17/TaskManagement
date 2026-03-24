'use client'

import { useState } from 'react'
import { useComments, useAddComment } from '@/hooks/useTasks'
import { Avatar } from '@/components/shared'

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
  const { data: comments, isLoading } = useComments(taskId)
  const addComment = useAddComment()
  const [body, setBody] = useState('')

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
        {'💬 コメント'}
      </h3>

      {/* Comment list */}
      <div className="flex flex-col gap-3 mb-4 max-h-[400px] overflow-y-auto">
        {isLoading && (
          <p className="text-[12px] text-text3">読み込み中...</p>
        )}
        {comments && comments.length === 0 && (
          <p className="text-[12px] text-text3">コメントはまだありません</p>
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
                  {comment.user?.name ?? '不明'}
                </span>
                <span className="text-[10px] text-text3 ml-auto">
                  {formatDateTime(comment.created_at)}
                </span>
              </div>
              <p className="text-[12.5px] text-text whitespace-pre-wrap leading-relaxed">
                {comment.body}
              </p>
            </div>
          )
        })}
      </div>

      {/* New comment input */}
      <div className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="コメントを入力..."
          rows={3}
          className="w-full border border-wf-border rounded-md px-3 py-2 text-[12.5px] text-text bg-surface resize-none focus:outline-none focus:border-mint"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSend}
            disabled={!body.trim() || addComment.isPending}
            className="px-4 py-1.5 rounded-md text-[12px] font-bold bg-mint text-white hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {addComment.isPending ? '送信中...' : '送信'}
          </button>
        </div>
      </div>
    </div>
  )
}
