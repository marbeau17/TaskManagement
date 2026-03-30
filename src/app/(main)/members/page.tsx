'use client'

import { useState, useCallback, useMemo } from 'react'
import { Topbar } from '@/components/layout'
import { Avatar, RoleChip, Pagination } from '@/components/shared'
import { useMembers } from '@/hooks/useMembers'
import { updateMember } from '@/lib/data/members'
import { ROLE_LABELS, getRoleLabel } from '@/lib/constants'
import type { User, UserRole } from '@/types/database'
import { useQueryClient } from '@tanstack/react-query'
import { InviteMemberModal } from '@/components/members/InviteMemberModal'
import { DeleteMemberDialog } from '@/components/members/DeleteMemberDialog'
import { OrgChart } from '@/components/members/OrgChart'
import { useAllRoles, useAddCustomRole, useDeleteCustomRole } from '@/hooks/useRoles'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/hooks/useI18n'

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------

type TabId = 'list' | 'orgchart' | 'roles'

// ---------------------------------------------------------------------------
// Feedback message component
// ---------------------------------------------------------------------------

function FeedbackMessage({
  type,
  message,
  onDismiss,
}: {
  type: 'success' | 'error'
  message: string
  onDismiss: () => void
}) {
  const styles =
    type === 'success'
      ? 'bg-ok-bg border-ok-b text-ok'
      : 'bg-danger-bg border-danger-b text-danger'

  return (
    <div
      className={`flex items-center justify-between px-[12px] py-[8px] rounded-[6px] border text-[12px] ${styles}`}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="ml-[8px] text-[14px] opacity-60 hover:opacity-100 transition-opacity"
      >
        &times;
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Edit member modal (inline)
// ---------------------------------------------------------------------------

function EditMemberModal({
  member,
  allMembers,
  onClose,
}: {
  member: User
  allMembers: User[]
  onClose: () => void
}) {
  const { t } = useI18n()
  const [name, setName] = useState(member.name)
  const [nameShort, setNameShort] = useState(member.name_short ?? '')
  const [role, setRole] = useState<UserRole>(member.role)
  const [capacity, setCapacity] = useState(
    String(member.weekly_capacity_hours)
  )
  const [managerId, setManagerId] = useState(member.manager_id ?? '')
  const [department, setDepartment] = useState(member.department ?? '')
  const [title, setTitle] = useState(member.title ?? '')
  const [level, setLevel] = useState(member.level ?? '')
  const [saving, setSaving] = useState(false)
  const [newCustomRole, setNewCustomRole] = useState('')
  const queryClient = useQueryClient()
  const { allRoles } = useAllRoles()
  const addCustomRoleMutation = useAddCustomRole()

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await updateMember(member.id, {
        name: name.trim() || member.name,
        name_short: nameShort.trim() || undefined,
        role,
        weekly_capacity_hours: parseFloat(capacity) || 16,
        manager_id: managerId || null,
        department: department.trim(),
        title: title.trim(),
        level,
      })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      onClose()
    } catch {
      // Handle error silently in mock mode
    } finally {
      setSaving(false)
    }
  }, [member.id, member.name, name, nameShort, role, capacity, managerId, department, title, level, queryClient, onClose])

  const handleAddCustomRole = useCallback(async () => {
    const trimmed = newCustomRole.trim()
    if (!trimmed) return
    try {
      await addCustomRoleMutation.mutateAsync(trimmed)
      setRole(trimmed)
      setNewCustomRole('')
    } catch {
      // Error handled by mutation state
    }
  }, [newCustomRole, addCustomRoleMutation])

  // Potential managers: all active members except the member being edited
  const managerOptions = allMembers.filter(
    (m) => m.id !== member.id && m.is_active
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 md:p-0">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[16px] md:p-[24px] w-full max-w-[400px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-[15px] font-bold text-text mb-[16px]">
          {t('members.editMember')}
        </h2>

        <div className="space-y-[12px]">
          {/* Name */}
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('members.name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              placeholder={t('members.fullNamePlaceholder')}
            />
          </div>

          {/* Short name */}
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('members.displayNameShort')}
            </label>
            <input
              type="text"
              value={nameShort}
              onChange={(e) => setNameShort(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              placeholder={t('members.displayNameShortPlaceholder')}
              maxLength={10}
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('members.email')}
            </label>
            <div className="text-[13px] text-text px-[10px] py-[7px] bg-surf2 rounded-[6px]">
              {member.email}
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('members.role')}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            >
              {allRoles.map((r) => (
                <option key={r} value={r}>
                  {getRoleLabel(r)}
                </option>
              ))}
            </select>
            {/* Add new custom role inline */}
            <div className="flex gap-[6px] mt-[6px]">
              <input
                type="text"
                value={newCustomRole}
                onChange={(e) => setNewCustomRole(e.target.value)}
                placeholder={t('members.newCustomRolePlaceholder')}
                className="flex-1 text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCustomRole()
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomRole}
                disabled={!newCustomRole.trim() || addCustomRoleMutation.isPending}
                className="shrink-0 px-[10px] py-[7px] text-[11px] text-mint font-medium bg-surface border border-border2 rounded-[6px] hover:bg-surf2 transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {addCustomRoleMutation.isPending ? '...' : t('members.addRole')}
              </button>
            </div>
          </div>

          {/* Weekly capacity */}
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('members.weeklyCapacity')}
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

          {/* --- New org fields --- */}

          {/* Manager */}
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('members.manager')}
            </label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            >
              <option value="">{t('members.none')}</option>
              {managerOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('members.department')}
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              placeholder={t('members.departmentPlaceholder')}
            />
          </div>

          {/* Title */}
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('members.titleField')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              placeholder={t('members.titlePlaceholder')}
            />
          </div>

          {/* Level */}
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('members.level')}
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            >
              <option value="">{t('members.levelUnset')}</option>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
              <option value="L4">L4</option>
              <option value="L5">L5</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-[8px] mt-[20px]">
          <button
            onClick={onClose}
            className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-[16px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {saving ? t('members.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Role management panel (tab content)
// ---------------------------------------------------------------------------

function RoleManagementPanel() {
  const { t } = useI18n()
  const { allRoles, customRoles } = useAllRoles()
  const addCustomRoleMutation = useAddCustomRole()
  const deleteCustomRoleMutation = useDeleteCustomRole()
  const [newRoleName, setNewRoleName] = useState('')

  const builtinRoleSet = new Set(Object.keys(ROLE_LABELS))

  const handleAdd = async () => {
    const trimmed = newRoleName.trim()
    if (!trimmed) return
    try {
      await addCustomRoleMutation.mutateAsync(trimmed)
      setNewRoleName('')
    } catch {
      // Error handled by mutation state
    }
  }

  const handleDelete = async (id: string) => {
    await deleteCustomRoleMutation.mutateAsync(id)
  }

  return (
    <div className="max-w-[520px]">
      <p className="text-[12px] text-text2 mb-[12px]">
        {t('members.roleDescription')}
      </p>

      {/* Add new role */}
      <div className="flex gap-[6px] mb-[16px]">
        <input
          type="text"
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          placeholder={t('members.newRolePlaceholder')}
          className="flex-1 text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!newRoleName.trim() || addCustomRoleMutation.isPending}
          className="px-[14px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-medium disabled:opacity-50"
        >
          {addCustomRoleMutation.isPending ? t('members.adding') : t('members.addRole')}
        </button>
      </div>

      {/* Role list */}
      <div className="bg-surface border border-border2 rounded-[10px] overflow-hidden shadow">
        <div className="grid grid-cols-[1fr_80px_80px] gap-[8px] px-[16px] py-[10px] bg-surf2 border-b border-border2 text-[10.5px] font-bold text-text2">
          <div>{t('members.roleName')}</div>
          <div className="text-center">{t('members.roleType')}</div>
          <div className="text-center">{t('members.roleActions')}</div>
        </div>

        {/* Built-in roles */}
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <div
            key={value}
            className="grid grid-cols-[1fr_80px_80px] gap-[8px] px-[16px] py-[10px] border-b border-border2 last:border-b-0 items-center text-[12px] text-text"
          >
            <div className="font-medium">{label}<span className="text-text3 ml-[6px] text-[10px]">({value})</span></div>
            <div className="text-center">
              <span className="text-[10px] px-[8px] py-[2px] rounded-full font-semibold border bg-info-bg text-info border-info-b inline-block">
                {t('members.builtin')}
              </span>
            </div>
            <div className="text-center text-[11px] text-text3">-</div>
          </div>
        ))}

        {/* Custom roles */}
        {customRoles.map((cr) => (
          <div
            key={cr.id}
            className="grid grid-cols-[1fr_80px_80px] gap-[8px] px-[16px] py-[10px] border-b border-border2 last:border-b-0 items-center text-[12px] text-text"
          >
            <div className="font-medium">{cr.name}</div>
            <div className="text-center">
              <span className="text-[10px] px-[8px] py-[2px] rounded-full font-semibold border bg-slate-50 text-slate-600 border-slate-200 inline-block">
                {t('members.custom')}
              </span>
            </div>
            <div className="text-center">
              <button
                onClick={() => handleDelete(cr.id)}
                disabled={deleteCustomRoleMutation.isPending}
                className="text-[11px] text-danger hover:opacity-80 font-medium transition-colors disabled:opacity-50"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}

        {customRoles.length === 0 && (
          <div className="px-[16px] py-[20px] text-center text-[12px] text-text3 border-t border-border2">
            {t('members.noCustomRoles')}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function MembersPage() {
  const { t } = useI18n()
  const { data: members, isLoading } = useMembers()
  const { can } = usePermission()
  const [activeTab, setActiveTab] = useState<TabId>('list')
  const [editingMember, setEditingMember] = useState<User | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [deletingMember, setDeletingMember] = useState<User | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    // Auto-dismiss after 4 seconds
    setTimeout(() => setFeedback(null), 4000)
  }

  const handleDeleteClick = (member: User) => {
    setDeletingMember(member)
    setDeleteDialogOpen(true)
  }

  const handleDeleteDialogChange = (open: boolean) => {
    setDeleteDialogOpen(open)
    if (!open) {
      setDeletingMember(null)
    }
  }

  const paginatedMembers = useMemo(() => {
    if (!members) return []
    if (pageSize === 0) return members
    const start = (currentPage - 1) * pageSize
    return members.slice(start, start + pageSize)
  }, [members, currentPage, pageSize])

  const activeCount = members?.filter((m) => m.is_active).length ?? 0
  const totalCount = members?.length ?? 0

  const tabs: { id: TabId; label: string }[] = [
    { id: 'list', label: t('members.list') },
    { id: 'orgchart', label: t('members.orgChart') },
    { id: 'roles', label: t('members.roleManagement') },
  ]

  return (
    <>
      <Topbar title={t('members.title')}>
        {can('members', 'create') && (
          <button
            onClick={() => setInviteOpen(true)}
            className="px-[14px] py-[6px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-medium"
          >
            {t('members.invite')}
          </button>
        )}
      </Topbar>

      <div className="flex-1 overflow-auto p-[12px] md:p-[20px]">
        {/* Tab bar */}
        <div className="flex gap-[4px] mb-[16px] border-b border-border2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-[16px] py-[8px] text-[12px] font-medium transition-colors
                border-b-2 -mb-[1px]
                ${
                  activeTab === tab.id
                    ? 'border-mint text-mint'
                    : 'border-transparent text-text3 hover:text-text2'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feedback message */}
        {feedback && (
          <div className="mb-[12px]">
            <FeedbackMessage
              type={feedback.type}
              message={feedback.message}
              onDismiss={() => setFeedback(null)}
            />
          </div>
        )}

        {/* Tab content */}
        {activeTab === 'list' && (
          <>
            {/* Subtitle with count */}
            <div className="flex items-center justify-between mb-[12px]">
              <p className="text-[12px] text-text2">
                {t('members.memberCount')} {activeCount}{t('members.memberUnit')}{' '}
                {totalCount !== activeCount && (
                  <span className="text-text3">({t('members.totalPrefix')}{totalCount}{t('members.memberUnit')})</span>
                )}
              </p>
            </div>

            <div className="mb-[12px]">
              <Pagination
                page={currentPage}
                pageSize={pageSize}
                totalCount={members?.length ?? 0}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>

            <div className="bg-surface border border-border2 rounded-[10px] overflow-hidden shadow overflow-x-auto">
              {/* Header */}
              <div className="min-w-[600px] grid grid-cols-[1fr_1fr_100px_80px_80px_110px] gap-[8px] px-[16px] py-[10px] bg-surf2 border-b border-border2 text-[10.5px] font-bold text-text2">
                <div>{t('members.name')}</div>
                <div>{t('members.email')}</div>
                <div className="text-center">{t('members.role')}</div>
                <div className="text-right">{t('members.weeklyCapacity')}</div>
                <div className="text-center">{t('members.status')}</div>
                <div className="text-center">{t('members.actions')}</div>
              </div>

              {/* Rows */}
              {isLoading ? (
                <div className="px-[16px] py-[32px] text-center text-[12px] text-text3">
                  {t('common.loading')}
                </div>
              ) : (
                paginatedMembers?.map((member) => (
                  <div
                    key={member.id}
                    className="min-w-[600px] grid grid-cols-[1fr_1fr_100px_80px_80px_110px] gap-[8px] px-[16px] py-[10px] border-b border-border2 last:border-b-0 items-center text-[12px] text-text hover:bg-surf2/50 transition-colors"
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
                        {member.is_active ? t('members.active') : t('members.inactive')}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center gap-[8px]">
                      <button
                        onClick={() => setEditingMember(member)}
                        className="text-[11px] text-mint hover:text-mint-d font-medium transition-colors"
                      >
                        {t('common.edit')}
                      </button>
                      {can('members', 'delete') && (
                        <button
                          onClick={() => handleDeleteClick(member)}
                          className="text-[11px] text-danger hover:opacity-80 font-medium transition-colors"
                        >
                          {t('common.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}

              {!isLoading && members?.length === 0 && (
                <div className="px-[16px] py-[32px] text-center text-[12px] text-text3">
                  {t('members.noMembers')}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'orgchart' && (
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-[32px] text-center text-[12px] text-text3">
                {t('common.loading')}
              </div>
            ) : members ? (
              <OrgChart members={members} />
            ) : null}
          </div>
        )}

        {activeTab === 'roles' && <RoleManagementPanel />}
      </div>

      {/* Edit modal */}
      {editingMember && (
        <EditMemberModal
          member={editingMember}
          allMembers={members ?? []}
          onClose={() => setEditingMember(null)}
        />
      )}

      {/* Invite modal */}
      <InviteMemberModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={() => showFeedback('success', t('members.inviteSuccess'))}
      />

      {/* Delete confirmation dialog */}
      <DeleteMemberDialog
        member={deletingMember}
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogChange}
        onSuccess={() => showFeedback('success', t('members.deleteSuccess'))}
      />
    </>
  )
}
