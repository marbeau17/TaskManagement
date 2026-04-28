// =============================================================================
// Data abstraction layer – Storage (file upload/download)
// Switches between mock handlers and Supabase Storage
// =============================================================================

import { isMockMode } from '@/lib/utils'
import { APP_CONFIG } from '@/lib/config'

const MAX_FILE_SIZE = APP_CONFIG.upload.maxFileSizeBytes

// ---------------------------------------------------------------------------
// Allowed file types
// ---------------------------------------------------------------------------

export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // PDF
  'application/pdf',
  // Office docs
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text / CSV
  'text/plain',
  'text/csv',
  // ZIP
  'application/zip',
  'application/x-zip-compressed',
] as const

/** Value for `<input accept="...">` — mirrors ALLOWED_MIME_TYPES */
export const FILE_INPUT_ACCEPT = ALLOWED_MIME_TYPES.join(',')

// ---------------------------------------------------------------------------
// validateFile — checks size + MIME type, returns Japanese error or null
// ---------------------------------------------------------------------------

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `ファイルサイズが${APP_CONFIG.upload.maxFileSizeLabel}を超えています`
  }
  if (
    !(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)
  ) {
    return '許可されていないファイル形式です。画像、PDF、Office文書、テキスト、CSV、ZIPファイルのみアップロードできます'
  }
  return null
}

// ---------------------------------------------------------------------------
// deleteFile — removes a file from Supabase Storage
// ---------------------------------------------------------------------------

export async function deleteFile(path: string): Promise<void> {
  if (isMockMode()) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { error } = await supabase.storage.from('attachments').remove([path])
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// uploadFile
// ---------------------------------------------------------------------------

// Supabase Storage はキーに ASCII セーフ文字しか許さない（非 ASCII は HTTP 400 InvalidKey）。
// オリジナル名は attachments.file_name に保持されるので、ストレージキーは UUID で合成し
// 拡張子だけ残す。
function buildStorageKey(taskId: string, file: File): string {
  const ext = file.name.match(/\.[A-Za-z0-9]{1,8}$/)?.[0]?.toLowerCase() ?? ''
  return `tasks/${taskId}/${Date.now()}_${crypto.randomUUID()}${ext}`
}

export async function uploadFile(
  taskId: string,
  file: File
): Promise<{ path: string; name: string; size: number; type: string }> {
  const validationError = validateFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  if (isMockMode()) {
    // Simulate a small delay for realism
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      path: `/mock/${taskId}/${file.name}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const filePath = buildStorageKey(taskId, file)
  const { error } = await supabase.storage.from('attachments').upload(filePath, file)
  if (error) throw new Error(error.message)
  return { path: filePath, name: file.name, size: file.size, type: file.type }
}

export async function getFileUrl(path: string, downloadName?: string): Promise<string> {
  if (isMockMode()) return '#'

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // WEB-40: 'attachments' bucket is private, so getPublicUrl returns an unsigned URL that 403s on download.
  // Use createSignedUrl with a 1h expiry so authenticated users get a working download link.
  // download にオリジナル名を渡すと Storage 側が Content-Disposition を組み立て、UUID キーではなく日本語名で保存される。
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(path, 60 * 60, downloadName ? { download: downloadName } : undefined)
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Failed to create download URL')
  }
  return data.signedUrl
}
