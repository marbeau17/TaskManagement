'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useDeleteMember } from '@/hooks/useMembers'
import { getRoleLabel } from '@/lib/constants'
import type { User } from '@/types/database'
import { useI18n } from '@/hooks/useI18n'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DeleteMemberDialogProps {
  member: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DeleteMemberDialog({
  member,
  open,
  onOpenChange,
  onSuccess,
}: DeleteMemberDialogProps) {
  const { t } = useI18n()
  const deleteMember = useDeleteMember()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!member) return
    setErrorMessage(null)
    try {
      await deleteMember.mutateAsync(member.id)
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('members.deleteUnknownError')
      setErrorMessage(message)
      console.error('[DeleteMember] Failed to delete member:', err)
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      deleteMember.reset()
      setErrorMessage(null)
    }
    onOpenChange(nextOpen)
  }

  if (!member) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-surface border border-border2 sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold text-text">
            {t('members.deleteTitle')}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-text2">
            {t('members.deleteDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Member info */}
        <div className="bg-surf2 rounded-[6px] px-[12px] py-[10px] space-y-[4px]">
          <div className="text-[13px] font-medium text-text">
            {member.name}
          </div>
          <div className="text-[11px] text-text2">
            {member.email} / {getRoleLabel(member.role)}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-danger-bg border border-danger-b rounded-[6px] px-[10px] py-[8px] text-[11px] text-danger leading-relaxed">
          {t('members.deleteWarning')}
        </div>

        {/* Mutation error */}
        {(deleteMember.isError || errorMessage) && (
          <div className="bg-danger-bg border border-danger-b rounded-[6px] px-[10px] py-[8px] text-[11px] text-danger">
            {t('members.deleteFailed')} {errorMessage ?? t('members.deleteFailedRetry')}
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMember.isPending}
            className="px-[16px] py-[7px] text-[12px] text-white bg-danger rounded-[6px] hover:opacity-90 transition-colors disabled:opacity-50 border border-danger-b"
          >
            {deleteMember.isPending ? t('members.deleting') : t('members.deleteAction')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
