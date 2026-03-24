'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, KeyRound, LogOut, Sun, Moon, Monitor } from 'lucide-react'
import { Avatar } from '@/components/shared/Avatar'
import { useAuth } from '@/hooks/useAuth'
import { useMembers } from '@/hooks/useMembers'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { PasswordChangeModal } from '@/components/members/PasswordChangeModal'
import { useTheme } from '@/hooks/useTheme'

interface SidebarProps {
  activePage: string
}

const MAIN_NAV = [
  { id: 'dashboard', label: 'ダッシュボード', icon: '📊', href: '/dashboard' },
  { id: 'request', label: 'タスク依頼', icon: '📝', href: '/tasks/new' },
  { id: 'tasks', label: 'タスク一覧', icon: '📋', href: '/tasks', badge: 3 },
  { id: 'clients', label: 'クライアント', icon: '🏢', href: '/clients' },
  { id: 'workload', label: '稼働管理', icon: '⏱', href: '/workload' },
]

const SYSTEM_NAV = [
  { id: 'members', label: 'メンバー', icon: '👥', href: '/members' },
  { id: 'settings', label: '設定', icon: '⚙', href: '/settings' },
]

export function Sidebar({ activePage }: SidebarProps) {
  const { user, logout } = useAuth()
  const { data: members } = useMembers()
  const router = useRouter()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const { theme, setTheme } = useTheme()

  // Derive creator list dynamically from members data
  const creators = useMemo(() => {
    if (!members) return []
    return members
      .filter((m) => m.role === 'creator' && m.is_active)
      .map((m) => ({
        id: m.id,
        name: m.name_short ? m.name.split(' ').pop() ?? m.name : m.name,
        short: m.name_short || m.name.charAt(0),
        color: m.avatar_color,
      }))
  }, [members])

  const nextTheme = () => {
    const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
    const idx = order.indexOf(theme)
    setTheme(order[(idx + 1) % order.length])
  }

  const themeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const ThemeIcon = themeIcon

  const handleLogout = useCallback(async () => {
    await logout()
    router.push('/login')
  }, [logout, router])

  const roleLabel: Record<string, string> = {
    admin: '管理者',
    director: 'ディレクター',
    requester: '依頼者',
    creator: 'クリエイター',
  }
  // For custom roles, fall back to the raw role string

  return (
    <aside className="w-[192px] bg-mint-dd flex flex-col h-full shrink-0 select-none">
      {/* Logo */}
      <div className="px-[16px] pt-[16px] pb-[12px]">
        <Link href="/dashboard" className="flex items-center gap-[7px] text-white no-underline">
          <span className="text-[18px]">✦</span>
          <span className="text-[15px] font-bold tracking-wide">WorkFlow</span>
        </Link>
      </div>

      {/* メイン section */}
      <div className="px-[10px] mt-[4px]">
        <div className="text-[9px] text-white/40 font-semibold uppercase tracking-wider px-[6px] mb-[4px]">
          メイン
        </div>
        <nav className="flex flex-col gap-[2px]">
          {MAIN_NAV.map((item) => {
            const isActive = activePage === item.id
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`
                  flex items-center gap-[8px] px-[10px] py-[7px] rounded-[6px]
                  text-[12.5px] no-underline transition-colors
                  ${isActive
                    ? 'bg-white/[0.17] text-white font-semibold'
                    : 'text-white/[0.68] hover:bg-white/[0.08] hover:text-white/[0.85]'
                  }
                `}
              >
                <span className="text-[14px] w-[18px] text-center">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-white/25 text-white text-[9px] font-bold px-[5px] py-[1px] rounded-full min-w-[18px] text-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* クリエイター section */}
      <div className="px-[10px] mt-[16px]">
        <div className="text-[9px] text-white/40 font-semibold uppercase tracking-wider px-[6px] mb-[4px]">
          クリエイター
        </div>
        <nav className="flex flex-col gap-[2px]">
          {creators.map((creator) => (
            <Link
              key={creator.id}
              href={`/workload?creator=${creator.id}`}
              className="
                flex items-center gap-[8px] px-[10px] py-[5px] rounded-[6px]
                text-[12px] text-white/[0.68] no-underline transition-colors
                hover:bg-white/[0.08] hover:text-white/[0.85]
              "
            >
              <Avatar name_short={creator.short} color={creator.color} size="sm" />
              <span className="flex-1">{creator.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* システム section */}
      <div className="px-[10px] mt-[16px]">
        <div className="text-[9px] text-white/40 font-semibold uppercase tracking-wider px-[6px] mb-[4px]">
          システム
        </div>
        <nav className="flex flex-col gap-[2px]">
          {SYSTEM_NAV.map((item) => {
            const isActive = activePage === item.id
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`
                  flex items-center gap-[8px] px-[10px] py-[7px] rounded-[6px]
                  text-[12.5px] no-underline transition-colors
                  ${isActive
                    ? 'bg-white/[0.17] text-white font-semibold'
                    : 'text-white/[0.68] hover:bg-white/[0.08] hover:text-white/[0.85]'
                  }
                `}
              >
                <span className="text-[14px] w-[18px] text-center">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Current user info */}
      <div className="px-[10px] pb-[14px]">
        <div className="flex items-center gap-[8px] px-[10px] py-[8px] rounded-[6px] bg-white/[0.08]">
          <Avatar name_short={user?.name_short ?? '?'} color={user?.avatar_color ?? 'av-a'} size="sm" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[11.5px] text-white font-semibold leading-tight truncate">
              {user?.name ?? '...'}
            </span>
            <span className="text-[9.5px] text-white/50 leading-tight">
              {user ? (roleLabel[user.role] ?? user.role) : ''}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="p-[4px] rounded-[4px] text-white/50 hover:text-white hover:bg-white/[0.12] transition-colors cursor-pointer"
            >
              <Settings className="w-[14px] h-[14px]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" sideOffset={8}>
              <DropdownMenuItem
                className="text-[12px] gap-[8px] cursor-pointer"
                onSelect={() => setShowPasswordModal(true)}
              >
                <KeyRound className="w-[14px] h-[14px]" />
                パスワード変更
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-[12px] gap-[8px] cursor-pointer"
                onSelect={nextTheme}
              >
                <ThemeIcon className="w-[14px] h-[14px]" />
                テーマ: {theme === 'light' ? 'ライト' : theme === 'dark' ? 'ダーク' : 'システム'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-[12px] gap-[8px] cursor-pointer text-red-500 focus:text-red-500"
                onSelect={handleLogout}
              >
                <LogOut className="w-[14px] h-[14px]" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Password change modal */}
      <PasswordChangeModal
        open={showPasswordModal}
        onOpenChange={setShowPasswordModal}
      />
    </aside>
  )
}
