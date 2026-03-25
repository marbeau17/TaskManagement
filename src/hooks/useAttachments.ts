'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadFile } from '@/lib/data/storage'
import { addAttachmentRecord } from '@/lib/data/tasks'

// ---------------------------------------------------------------------------
// useUploadAttachment — uploads a file and creates the DB record
// ---------------------------------------------------------------------------

export function useUploadAttachment() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      // 1. Upload to storage (or mock)
      const uploaded = await uploadFile(taskId, file)

      // 2. Insert attachment record into DB
      const record = await addAttachmentRecord(taskId, {
        file_name: uploaded.name,
        file_size: uploaded.size,
        mime_type: uploaded.type,
        storage_path: uploaded.path,
      })

      return record
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['attachments', variables.taskId] })
    },
  })
}
