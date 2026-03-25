// =============================================================================
// Data abstraction layer – Storage (file upload/download)
// Switches between mock handlers and Supabase Storage
// =============================================================================

import { useMock } from '@/lib/utils'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function uploadFile(
  taskId: string,
  file: File
): Promise<{ path: string; name: string; size: number; type: string }> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('ファイルサイズが10MBを超えています')
  }

  if (useMock()) {
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
  const filePath = `tasks/${taskId}/${Date.now()}_${file.name}`
  const { error } = await supabase.storage.from('attachments').upload(filePath, file)
  if (error) throw new Error(error.message)
  return { path: filePath, name: file.name, size: file.size, type: file.type }
}

export async function getFileUrl(path: string): Promise<string> {
  if (useMock()) return '#'

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data } = supabase.storage.from('attachments').getPublicUrl(path)
  return data.publicUrl
}
