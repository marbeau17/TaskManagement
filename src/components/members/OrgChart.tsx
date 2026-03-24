'use client'

import type { User } from '@/types/database'
import { Avatar } from '@/components/shared/Avatar'

// ---------------------------------------------------------------------------
// OrgNode – recursive tree node
// ---------------------------------------------------------------------------

function OrgNode({ user, allUsers }: { user: User; allUsers: User[] }) {
  const children = allUsers.filter(
    (u) => u.manager_id === user.id && u.is_active
  )

  return (
    <div className="flex flex-col items-center">
      {/* Node card */}
      <div className="bg-surface border border-border2 rounded-[10px] p-[12px] min-w-[160px] text-center shadow hover:border-mint/40 transition-colors">
        <div className="flex justify-center mb-[6px]">
          <Avatar
            name_short={user.name_short || user.name.charAt(0)}
            color={user.avatar_color}
            size="md"
          />
        </div>
        <div className="font-bold text-[12px] text-text leading-tight">
          {user.name}
        </div>
        {user.title && (
          <div className="text-[10px] text-mint font-medium mt-[2px]">
            {user.title}
          </div>
        )}
        {user.department && (
          <div className="text-[9px] text-text3 mt-[1px]">
            {user.department}
          </div>
        )}
        {user.level && (
          <div className="text-[9px] text-text3 mt-[1px]">
            {user.level}
          </div>
        )}
      </div>

      {/* Children */}
      {children.length > 0 && (
        <div className="flex flex-col items-center mt-0">
          {/* Vertical connector from parent */}
          <div className="w-[1px] h-[16px] bg-border2" />

          {/* Horizontal bar connecting children */}
          {children.length > 1 && (
            <div className="relative w-full flex justify-center">
              <div
                className="h-[1px] bg-border2"
                style={{
                  width: `calc(100% - 160px)`,
                  minWidth: children.length > 1 ? '80px' : '0px',
                }}
              />
            </div>
          )}

          {/* Children nodes */}
          <div className="flex gap-[20px]">
            {children.map((child) => (
              <div
                key={child.id}
                className="flex flex-col items-center"
              >
                {/* Vertical connector to child */}
                <div className="w-[1px] h-[16px] bg-border2" />
                <OrgNode user={child} allUsers={allUsers} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// OrgChart – main component
// ---------------------------------------------------------------------------

export function OrgChart({ members }: { members: User[] }) {
  const activeMembers = members.filter((m) => m.is_active)

  // Find root nodes (members with no manager or whose manager is not in the list)
  const memberIds = new Set(activeMembers.map((m) => m.id))
  const roots = activeMembers.filter(
    (m) => !m.manager_id || !memberIds.has(m.manager_id)
  )

  if (roots.length === 0) {
    return (
      <div className="flex items-center justify-center py-[40px] text-[12px] text-text3">
        組織図データがありません。メンバーに上司を設定してください。
      </div>
    )
  }

  return (
    <div className="overflow-auto p-[24px]">
      <div className="flex gap-[32px] justify-center items-start">
        {roots.map((root) => (
          <OrgNode key={root.id} user={root} allUsers={activeMembers} />
        ))}
      </div>
    </div>
  )
}
