'use client'

import { useRef, useState, useCallback } from 'react'
import { useAttachments } from '@/hooks/useTasks'
import { useUploadAttachment, useDeleteAttachment } from '@/hooks/useAttachments'
import { validateFile, getFileUrl, FILE_INPUT_ACCEPT } from '@/lib/data/storage'

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
  if (mimeType === 'application/pdf') return '\uD83D\uDCC4'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '\uD83D\uDCCA'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '\uD83D\uDCCA'
  if (mimeType.includes('word') || mimeType.includes('document')) return '\uD83D\uDCC3'
  if (mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed') return '\uD83D\uDDDC'
  return '\uD83D\uDCC4'
}

export function AttachmentList({ taskId }: AttachmentListProps) {
  const { data: attachments, isLoading } = useAttachments(taskId)
  const uploadMutation = useUploadAttachment()
  const deleteMutation = useDeleteAttachment()
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

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    uploadMutation.mutate(
      { taskId, file },
      {
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'アップロードに失敗しました')
        },
      }
    )
  }

  const handleDownload = useCallback(async (storagePath: string, fileName: string) => {
    try {
      const url = await getFileUrl(storagePath)
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.download = fileName
      link.click()
    } catch {
      setError('ファイルのダウンロードに失敗しました')
    }
  }, [])

  const handleDelete = useCallback(
    (attachmentId: string, storagePath: string, fileName: string) => {
      if (!window.confirm(`「${fileName}」を削除しますか?`)) return

      setError(null)
      deleteMutation.mutate(
        { attachmentId, storagePath, taskId },
        {
          onError: (err) => {
            setError(err instanceof Error ? err.message : '削除に失敗しました')
          },
        }
      )
    },
    [deleteMutation, taskId]
  )

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
            className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-surf2 transition-colors group"
          >
            <span className="text-[14px]">{getFileIcon(file.mime_type)}</span>
            <button
              type="button"
              onClick={() => handleDownload(file.storage_path, file.file_name)}
              className="text-[12px] text-info font-medium truncate flex-1 text-left hover:underline cursor-pointer"
              title={`ダウンロード: ${file.file_name}`}
            >
              {file.file_name}
            </button>
            <span className="text-[10px] text-text3 shrink-0">
              {formatFileSize(file.file_size)}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(file.id, file.storage_path, file.file_name)}
              disabled={deleteMutation.isPending}
              className="text-[12px] text-text3 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 disabled:opacity-50"
              title="削除"
            >
              {'✕'}
            </button>
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-[11px] text-red-500 mb-2">{error}</p>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        hidden
        ref={fileRef}
        accept={FILE_INPUT_ACCEPT}
        onChange={handleFileChange}
      />

      {/* Upload button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={uploadMutation.isPending}
        className="w-full py-2 rounded-md text-[12px] font-bold border border-dashed border-wf-border text-text2 hover:border-mint hover:text-mint transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploadMutation.isPending ? 'アップロード中...' : '＋ ファイルを添付'}
      </button>
    </div>
  )
}
