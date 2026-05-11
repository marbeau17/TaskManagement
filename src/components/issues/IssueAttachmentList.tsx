'use client'

import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getIssueAttachments,
  addIssueAttachmentRecord,
  deleteIssueAttachmentRecord,
  type IssueAttachment,
} from '@/lib/data/issues'
import { uploadFile, deleteFile, getFileUrl } from '@/lib/data/storage'
import { APP_CONFIG } from '@/lib/config'

interface IssueAttachmentListProps {
  issueId: string
}

const MAX_FILE_SIZE = APP_CONFIG.upload.maxFileSizeBytes

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼'
  if (mimeType.includes('json') || mimeType.includes('text') || mimeType.includes('log')) return '📋'
  return '📄'
}

export function IssueAttachmentList({ issueId }: IssueAttachmentListProps) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: attachments, isLoading } = useQuery<IssueAttachment[]>({
    queryKey: ['issue-attachments', issueId],
    queryFn: () => getIssueAttachments(issueId),
    enabled: !!issueId,
  })

  const upload = useMutation({
    mutationFn: async (file: File) => {
      // 添付の Storage パスを issues/{id}/ 配下にし、task の attachments と
      // ぶつからないよう task 側と空間を分ける。
      const uploaded = await uploadFile(`issue-${issueId}`, file)
      return addIssueAttachmentRecord(issueId, {
        file_name: uploaded.name,
        file_size: uploaded.size,
        mime_type: uploaded.type,
        storage_path: uploaded.path,
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issue-attachments', issueId] }),
  })

  const remove = useMutation({
    mutationFn: async (a: { id: string; storage_path: string }) => {
      await deleteFile(a.storage_path)
      await deleteIssueAttachmentRecord(a.id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issue-attachments', issueId] }),
  })

  const handleDownload = async (storagePath: string, fileName: string) => {
    try {
      const url = await getFileUrl(storagePath, fileName)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.target = '_blank'
      a.click()
    } catch {
      setError('ダウンロードに失敗しました')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > MAX_FILE_SIZE) {
      setError(`ファイルサイズが大きすぎます (上限 ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)} MB)`)
      return
    }
    setError(null)
    upload.mutate(file, {
      onError: (err) => setError(err instanceof Error ? err.message : 'アップロードに失敗しました'),
    })
  }

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      <h3 className="text-[13px] font-bold text-text mb-1">📎 添付ファイル (スクリーンショット・ログ)</h3>
      <p className="text-[11px] text-text3 mb-3">
        バグの再現スクリーンショット、エラーログ、関連ファイルを添付してください。
      </p>

      {isLoading && <p className="text-[12px] text-text3">読み込み中...</p>}

      {attachments && attachments.length === 0 && !isLoading && (
        <p className="text-[12px] text-text3 mb-3">まだ添付ファイルはありません</p>
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
              title={file.file_name}
            >
              {file.file_name}
            </button>
            <span className="text-[10px] text-text3 shrink-0">{formatFileSize(file.file_size)}</span>
            <button
              type="button"
              onClick={() => handleDownload(file.storage_path, file.file_name)}
              className="text-[10px] text-mint hover:text-mint-d opacity-0 group-hover:opacity-100 transition-opacity"
              title="ダウンロード"
            >
              ⬇
            </button>
            <button
              type="button"
              onClick={() => {
                if (!confirm(`「${file.file_name}」を削除しますか？`)) return
                remove.mutate({ id: file.id, storage_path: file.storage_path })
              }}
              className="text-[10px] text-text3 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
              title="削除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <span className="text-red-500 text-sm">⚠</span>
          <p className="text-[12px] text-red-600 dark:text-red-400 font-medium flex-1">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      )}

      <input
        type="file"
        hidden
        ref={fileRef}
        accept="image/*,.log,.txt,.json,.csv,application/pdf,application/zip"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={() => { setError(null); fileRef.current?.click() }}
        disabled={upload.isPending}
        className="w-full py-2 rounded-md text-[12px] font-bold border border-dashed border-wf-border text-text2 hover:border-mint hover:text-mint transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {upload.isPending ? 'アップロード中...' : '＋ スクリーンショット / ログを添付'}
      </button>
    </div>
  )
}
