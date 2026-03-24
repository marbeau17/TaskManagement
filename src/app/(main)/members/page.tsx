'use client'

import { useState, useCallback } from 'react'
import { Shell } from '@/components/layout'
import { Topbar } from '@/components/layout'
import { Avatar, RoleChip } from '@/components/shared'
import { useMembers } from '@/hooks/useMembers'
import { updateMember } from '@/lib/data/members'
import { ROLE_LABELS } from '@/lib/constants'
import type { User, UserRole } from '@/types/database'
import { useQueryClient } from '@tanstack/react-query'

function EditMemberModal({
  member,
  onClose,
}: {
  member: User
  onClose: () => void
}) {
  const [role, setRole] = useState<UserRole>(member.role)
  const [capacity, setCapacity] = useState(
    String(member.weekly_capacity_hours)
  )
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await updateMember(member.id, {
        role,
        weekly_capacity_hours: parseFloat(capacity) || 16,
      })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      onClose()
    } catch {
      // Handle error silently in mock mode
    } finally {
      setSaving(false)
    }
  }, [member.id, role, capacity, queryClient, onClose])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[24px] w-[400px]">
        <h2 className="text-[15px] font-bold text-text mb-[16px]">
          メンバー編集
        </h2>

        <div className="space-y-[12px]">
          {/* Name (read-only) */}
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              名前
            </label>
            <div className="text-[13px] text-text px-[10px] py-[7px] bg-surf2 rounded-[6px]">
              {member.name}
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              メール
            </label>
            <div className="text-[13px] text-text px-[10px] py-[7px] bg-surf2 rounded-[6px]">
              {member.email}
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              ロール
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            >
              {(
                Object.entries(ROLE_LABELS) as [UserRole, string][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Weekly capacity */}
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              週キャパ (h)
            </label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              min={0}
              max={80}
              step={0.5}
            />
          </div>
        </div>

        <div className="flex justify-end gap-[8px] mt-[20px]">
          <button
            onClick={onClose}
            className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-[16px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MembersPage() {
  const { data: members, isLoading } = useMembers()
  const [editingMember, setEditingMember] = useState<User | null>(null)

  return (
    <Shell activePage="members">
      <Topbar title="メンバー管理">
        <button className="px-[14px] py-[6px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-medium">
          + メンバー招待
        </button>
      </Topbar>

      <div className="flex-1 overflow-auto p-[20px]">
        <div className="bg-surface border border-border2 rounded-[10px] overflow-hidden shadow">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_100px_80px_80px_70px] gap-[8px] px-[16px] py-[10px] bg-surf2 border-b border-border2 text-[10.5px] font-bold text-text2">
            <div>名前</div>
            <div>メール</div>
            <div className="text-center">ロール</div>
            <div className="text-right">週キャパ</div>
            <div className="text-center">ステータス</div>
            <div className="text-center">操作</div>
          </div>

          {/* Rows */}
          {isLoading ? (
            <div className="px-[16px] py-[32px] text-center text-[12px] text-text3">
              読み込み中...
            </div>
          ) : (
            members?.map((member) => (
              <div
                key={member.id}
                className="grid grid-cols-[1fr_1fr_100px_80px_80px_70px] gap-[8px] px-[16px] py-[10px] border-b border-border2 last:border-b-0 items-center text-[12px] text-text hover:bg-surf2/50 transition-colors"
              >
                {/* Name */}
                <div className="flex items-center gap-[8px]">
                  <Avatar
                    name_short={member.name_short}
                    color={member.avatar_color}
                    size="sm"
                  />
                  <span className="font-medium truncate">{member.name}</span>
                </div>

                {/* Email */}
                <div className="text-[11px] text-text2 truncate">
                  {member.email}
                </div>

                {/* Role */}
                <div className="text-center">
                  <RoleChip role={member.role} />
                </div>

                {/* Weekly capacity */}
                <div className="text-right text-[11px] text-text2">
                  {member.weekly_capacity_hours}h
                </div>

                {/* Status */}
                <div className="text-center">
                  <span
                    className={`
                      text-[10px] px-[8px] py-[2px] rounded-full font-semibold border inline-block
                      ${
                        member.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }
                    `}
                  >
                    {member.is_active ? '有効' : '無効'}
                  </span>
                </div>

                {/* Actions */}
                <div className="text-center">
                  <button
                    onClick={() => setEditingMember(member)}
                    className="text-[11px] text-mint hover:text-mint-d font-medium transition-colors"
                  >
                    編集
                  </button>
                </div>
              </div>
            ))
          )}

          {!isLoading && members?.length === 0 && (
            <div className="px-[16px] py-[32px] text-center text-[12px] text-text3">
              メンバーがいません
            </div>
          )}
        </div>
      </div>

      {editingMember && (
        <EditMemberModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
        />
      )}
    </Shell>
  )
}
