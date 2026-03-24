'use client'

import { useAttachments } from '@/hooks/useTasks'

interface AttachmentListProps {
  taskId: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '\uD83D\uDDBC'
  return '\uD83D\uDCC4'
}

export function AttachmentList({ taskId }: AttachmentListProps) {
  const { data: attachments, isLoading } = useAttachments(taskId)

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      <h3 className="text-[13px] font-bold text-text mb-4">
        {'📎 添付ファイル'}
      </h3>

      {isLoading && (
        <p className="text-[12px] text-text3">読み込み中...</p>
      )}

      {attachments && attachments.length === 0 && (
        <p className="text-[12px] text-text3 mb-3">添付ファイルはありません</p>
      )}

      <div className="flex flex-col gap-2 mb-4">
        {attachments?.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-surf2 transition-colors"
          >
            <span className="text-[14px]">{getFileIcon(file.mime_type)}</span>
            <span className="text-[12px] text-info font-medium truncate flex-1">
              {file.file_name}
            </span>
            <span className="text-[10px] text-text3 shrink-0">
              {formatFileSize(file.file_size)}
            </span>
          </div>
        ))}
      </div>

      {/* Upload button */}
      <button
        type="button"
        className="w-full py-2 rounded-md text-[12px] font-bold border border-dashed border-wf-border text-text2 hover:border-mint hover:text-mint transition-colors"
      >
        ＋ ファイルを添付
      </button>
    </div>
  )
}
