'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useDeleteMember } from '@/hooks/useMembers'
import { ROLE_LABELS } from '@/lib/constants'
import type { User } from '@/types/database'

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
  const deleteMember = useDeleteMember()

  const handleDelete = async () => {
    if (!member) return
    try {
      await deleteMember.mutateAsync(member.id)
      onOpenChange(false)
      onSuccess?.()
    } catch {
      // Error is handled by mutation state
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      deleteMember.reset()
    }
    onOpenChange(nextOpen)
  }

  if (!member) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-surface border border-border2 sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold text-text">
            メンバー削除の確認
          </DialogTitle>
          <DialogDescription className="text-[11px] text-text2">
            以下のメンバーを削除しようとしています
          </DialogDescription>
        </DialogHeader>

        {/* Member info */}
        <div className="bg-surf2 rounded-[6px] px-[12px] py-[10px] space-y-[4px]">
          <div className="text-[13px] font-medium text-text">
            {member.name}
          </div>
          <div className="text-[11px] text-text2">
            {member.email} / {ROLE_LABELS[member.role]}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-danger-bg border border-danger-b rounded-[6px] px-[10px] py-[8px] text-[11px] text-danger leading-relaxed">
          このメンバーを削除すると、担当タスクの再アサインが必要になります。
        </div>

        {/* Mutation error */}
        {deleteMember.isError && (
          <div className="bg-danger-bg border border-danger-b rounded-[6px] px-[10px] py-[8px] text-[11px] text-danger">
            削除に失敗しました。もう一度お試しください。
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMember.isPending}
            className="px-[16px] py-[7px] text-[12px] text-white bg-danger rounded-[6px] hover:opacity-90 transition-colors disabled:opacity-50 border border-danger-b"
          >
            {deleteMember.isPending ? '削除中...' : '削除する'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
