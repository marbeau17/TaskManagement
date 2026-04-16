'use client'

import { useRef, useState } from 'react'
import { useAttachments } from '@/hooks/useTasks'
import { useUploadAttachment } from '@/hooks/useAttachments'
import { useI18n } from '@/hooks/useI18n'

interface AttachmentListProps {
  taskId: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

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
  const { t } = useI18n()
  const { data: attachments, isLoading } = useAttachments(taskId)
  const uploadMutation = useUploadAttachment()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleButtonClick = () => {
    setError(null)
    fileRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset the input so the same file can be selected again
    e.target.value = ''

    if (file.size > MAX_FILE_SIZE) {
      setError(t('attachment.fileTooLarge'))
      return
    }

    setError(null)
    uploadMutation.mutate(
      { taskId, file },
      {
        onError: (err) => {
          setError(err instanceof Error ? err.message : t('attachment.uploadFailed'))
        },
      }
    )
  }

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      <h3 className="text-[13px] font-bold text-text mb-4">
        {t('attachment.title')}
      </h3>

      {isLoading && (
        <p className="text-[12px] text-text3">{t('common.loading')}</p>
      )}

      {attachments && attachments.length === 0 && (
        <p className="text-[12px] text-text3 mb-3">{t('attachment.empty')}</p>
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

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <span className="text-red-500 text-sm">⚠</span>
          <p className="text-[12px] text-red-600 dark:text-red-400 font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        hidden
        ref={fileRef}
        onChange={handleFileChange}
      />

      {/* Upload button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={uploadMutation.isPending}
        className="w-full py-2 rounded-md text-[12px] font-bold border border-dashed border-wf-border text-text2 hover:border-mint hover:text-mint transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploadMutation.isPending ? t('attachment.uploading') : t('attachment.upload')}
      </button>
    </div>
  )
}
