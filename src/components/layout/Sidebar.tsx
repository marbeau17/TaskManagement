'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, KeyRound, LogOut, Sun, Moon, Monitor } from 'lucide-react'
import { Avatar } from '@/components/shared/Avatar'
import { useAuth } from '@/hooks/useAuth'
import { useMembers } from '@/hooks/useMembers'
import { useWaitingTaskCount } from '@/hooks/useTasks'
import { useI18n } from '@/hooks/useI18n'
import { LanguageToggle } from '@/components/shared/LanguageToggle'
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
  /** Called when a nav link is clicked (used to close mobile sidebar) */
  onNavigate?: () => void
  /** When true, show only icons (tablet collapsed mode) */
  collapsed?: boolean
}

const MAIN_NAV = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: '📊', href: '/dashboard' },
  { id: 'request', labelKey: 'nav.taskRequest', icon: '📝', href: '/tasks/new' },
  { id: 'tasks', labelKey: 'nav.taskList', icon: '📋', href: '/tasks', badgeDynamic: true },
  { id: 'issues', labelKey: 'nav.issues', icon: '🐛', href: '/issues' },
  { id: 'clients', labelKey: 'nav.clients', icon: '🏢', href: '/clients' },
  { id: 'projects', labelKey: 'nav.projects', icon: '📁', href: '/projects' },
  { id: 'workload', labelKey: 'nav.workload', icon: '⏱', href: '/workload' },
]

const SYSTEM_NAV = [
  { id: 'reports', labelKey: 'nav.reports', icon: '📊', href: '/reports' },
  { id: 'templates', labelKey: 'nav.templates', icon: '📝', href: '/templates' },
  { id: 'import', labelKey: 'nav.import', icon: '📥', href: '/import' },
  { id: 'members', labelKey: 'nav.members', icon: '👥', href: '/members' },
  { id: 'settings', labelKey: 'nav.settings', icon: '⚙', href: '/settings' },
]

export function Sidebar({ activePage, onNavigate, collapsed = false }: SidebarProps) {
  const { user, logout } = useAuth()
  const { data: members } = useMembers()
  const { data: waitingCount = 0 } = useWaitingTaskCount()
  const router = useRouter()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()

  // Derive creator list dynamically from members data
  const creators = useMemo(() => {
    if (!members) return []
    return members
      .filter((m) => m.is_active)
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
    const next = order[(idx + 1) % order.length]
    console.log('[DarkMode] Toggle:', theme, '->', next)
    setTheme(next)
  }

  const themeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const ThemeIcon = themeIcon

  const handleLogout = useCallback(async () => {
    await logout()
    router.push('/login')
  }, [logout, router])

  const roleLabel = (role: string) => {
    const key = `role.${role}`
    const translated = t(key)
    return translated !== key ? translated : role
  }

  return (
    <aside className={`${collapsed ? 'w-[56px]' : 'w-[192px]'} bg-mint-dd flex flex-col h-full shrink-0 select-none overflow-y-auto overflow-x-hidden`}>
      {/* Logo */}
      <div className={`${collapsed ? 'px-[8px] pt-[16px] pb-[12px] flex justify-center' : 'px-[16px] pt-[16px] pb-[12px]'}`}>
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-[7px] text-white no-underline" title={collapsed ? 'WorkFlow' : undefined}>
          <span className="text-[18px]">✦</span>
          {!collapsed && <span className="text-[15px] font-bold tracking-wide">WorkFlow</span>}
        </Link>
      </div>

      {/* メイン section */}
      <div className={`${collapsed ? 'px-[4px]' : 'px-[10px]'} mt-[4px]`}>
        {!collapsed && (
          <div className="text-[9px] text-white/40 font-semibold uppercase tracking-wider px-[6px] mb-[4px]">
            {t('sidebar.main')}
          </div>
        )}
        <nav className="flex flex-col gap-[2px]">
          {MAIN_NAV.map((item) => {
            const isActive = activePage === item.id
            const label = t(item.labelKey)
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? label : undefined}
                className={`
                  flex items-center ${collapsed ? 'justify-center px-[4px]' : 'gap-[8px] px-[10px]'} py-[7px] rounded-[6px]
                  text-[12.5px] no-underline transition-colors relative group
                  ${isActive
                    ? 'bg-white/[0.17] text-white font-semibold'
                    : 'text-white/[0.68] hover:bg-white/[0.08] hover:text-white/[0.85]'
                  }
                `}
              >
                <span className="text-[14px] w-[18px] text-center">{item.icon}</span>
                {!collapsed && <span className="flex-1">{label}</span>}
                {!collapsed && item.badgeDynamic && waitingCount > 0 && (
                  <span className="bg-white/25 text-white text-[9px] font-bold px-[5px] py-[1px] rounded-full min-w-[18px] text-center">
                    {waitingCount}
                  </span>
                )}
                {collapsed && item.badgeDynamic && waitingCount > 0 && (
                  <span className="absolute -top-[2px] -right-[2px] bg-white/25 text-white text-[8px] font-bold w-[14px] h-[14px] rounded-full flex items-center justify-center">
                    {waitingCount}
                  </span>
                )}
                {/* Tooltip for collapsed mode */}
                {collapsed && (
                  <span className="absolute left-full ml-[8px] px-[8px] py-[4px] bg-text text-white text-[11px] rounded-[4px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* メンバー section */}
      <div className={`${collapsed ? 'px-[4px]' : 'px-[10px]'} mt-[16px]`}>
        {!collapsed && (
          <div className="text-[9px] text-white/40 font-semibold uppercase tracking-wider px-[6px] mb-[4px]">
            {t('sidebar.members')}
          </div>
        )}
        <nav className="flex flex-col gap-[2px]">
          {creators.map((creator) => (
            <Link
              key={creator.id}
              href={`/workload?creator=${creator.id}`}
              onClick={onNavigate}
              title={collapsed ? creator.name : undefined}
              className={`
                flex items-center ${collapsed ? 'justify-center px-[4px]' : 'gap-[8px] px-[10px]'} py-[5px] rounded-[6px]
                text-[12px] text-white/[0.68] no-underline transition-colors relative group
                hover:bg-white/[0.08] hover:text-white/[0.85]
              `}
            >
              <Avatar name_short={creator.short} color={creator.color} size="sm" />
              {!collapsed && <span className="flex-1">{creator.name}</span>}
              {/* Tooltip for collapsed mode */}
              {collapsed && (
                <span className="absolute left-full ml-[8px] px-[8px] py-[4px] bg-text text-white text-[11px] rounded-[4px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  {creator.name}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      {/* システム section */}
      <div className={`${collapsed ? 'px-[4px]' : 'px-[10px]'} mt-[16px]`}>
        {!collapsed && (
          <div className="text-[9px] text-white/40 font-semibold uppercase tracking-wider px-[6px] mb-[4px]">
            {t('sidebar.system')}
          </div>
        )}
        <nav className="flex flex-col gap-[2px]">
          {SYSTEM_NAV.map((item) => {
            const isActive = activePage === item.id
            const label = t(item.labelKey)
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? label : undefined}
                className={`
                  flex items-center ${collapsed ? 'justify-center px-[4px]' : 'gap-[8px] px-[10px]'} py-[7px] rounded-[6px]
                  text-[12.5px] no-underline transition-colors relative group
                  ${isActive
                    ? 'bg-white/[0.17] text-white font-semibold'
                    : 'text-white/[0.68] hover:bg-white/[0.08] hover:text-white/[0.85]'
                  }
                `}
              >
                <span className="text-[14px] w-[18px] text-center">{item.icon}</span>
                {!collapsed && <span>{label}</span>}
                {/* Tooltip for collapsed mode */}
                {collapsed && (
                  <span className="absolute left-full ml-[8px] px-[8px] py-[4px] bg-text text-white text-[11px] rounded-[4px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Language toggle */}
      <div className={`${collapsed ? 'px-[4px]' : 'px-[10px]'} pb-[8px] ${collapsed ? 'flex justify-center' : ''}`}>
        <LanguageToggle variant="sidebar" />
      </div>

      {/* Current user info */}
      <div className={`${collapsed ? 'px-[4px]' : 'px-[10px]'} pb-[14px]`}>
        {collapsed ? (
          /* Collapsed: avatar only with dropdown */
          <div className="flex flex-col items-center gap-[6px]">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="p-[6px] rounded-[6px] bg-white/[0.08] hover:bg-white/[0.15] transition-colors cursor-pointer"
                title={user?.name ?? ''}
              >
                <Avatar name_short={user?.name_short ?? '?'} color={user?.avatar_color ?? 'av-a'} size="sm" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" sideOffset={8}>
                <div className="px-[8px] py-[4px] text-[11px] text-muted-foreground">
                  {user?.name ?? '...'} - {user ? roleLabel(user.role) : ''}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-[12px] gap-[8px] cursor-pointer"
                  onSelect={() => setShowPasswordModal(true)}
                >
                  <KeyRound className="w-[14px] h-[14px]" />
                  {t('auth.changePassword')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-[12px] gap-[8px] cursor-pointer"
                  onSelect={nextTheme}
                >
                  <ThemeIcon className="w-[14px] h-[14px]" />
                  {t('settings.theme')}: {theme === 'light' ? t('settings.light') : theme === 'dark' ? t('settings.dark') : t('settings.system')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-[12px] gap-[8px] cursor-pointer text-red-500 focus:text-red-500"
                  onSelect={handleLogout}
                >
                  <LogOut className="w-[14px] h-[14px]" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          /* Expanded: full user info */
          <div className="flex items-center gap-[8px] px-[10px] py-[8px] rounded-[6px] bg-white/[0.08]">
            <Avatar name_short={user?.name_short ?? '?'} color={user?.avatar_color ?? 'av-a'} size="sm" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[11.5px] text-white font-semibold leading-tight truncate">
                {user?.name ?? '...'}
              </span>
              <span className="text-[9.5px] text-white/50 leading-tight">
                {user ? roleLabel(user.role) : ''}
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
                  {t('auth.changePassword')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-[12px] gap-[8px] cursor-pointer"
                  onSelect={nextTheme}
                >
                  <ThemeIcon className="w-[14px] h-[14px]" />
                  {t('settings.theme')}: {theme === 'light' ? t('settings.light') : theme === 'dark' ? t('settings.dark') : t('settings.system')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-[12px] gap-[8px] cursor-pointer text-red-500 focus:text-red-500"
                  onSelect={handleLogout}
                >
                  <LogOut className="w-[14px] h-[14px]" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Password change modal */}
      <PasswordChangeModal
        open={showPasswordModal}
        onOpenChange={setShowPasswordModal}
      />
    </aside>
  )
}
