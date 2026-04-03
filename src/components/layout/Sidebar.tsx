'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, KeyRound, LogOut, Sun, Moon, Monitor, User } from 'lucide-react'
import { Avatar } from '@/components/shared/Avatar'
import { APP_CONFIG } from '@/lib/config'
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
  { id: 'news', labelKey: 'nav.news', icon: '📢', href: '/news' },
  { id: 'mypage', labelKey: 'nav.mypage', icon: '👤', href: '/mypage' },
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: '📊', href: '/dashboard' },
  { id: 'request', labelKey: 'nav.taskRequest', icon: '📝', href: '/tasks/new', domain: 'tasks' },
  { id: 'tasks', labelKey: 'nav.taskList', icon: '📋', href: '/tasks', badgeDynamic: true, domain: 'tasks' },
  { id: 'issues', labelKey: 'nav.issues', icon: '🐛', href: '/issues', domain: 'issues' },
  { id: 'clients', labelKey: 'nav.clients', icon: '🏢', href: '/clients' },
  { id: 'projects', labelKey: 'nav.projects', icon: '📁', href: '/projects', domain: 'projects' },
  { id: 'workload', labelKey: 'nav.workload', icon: '⏱', href: '/workload', domain: 'workload' },
  { id: 'pipeline', labelKey: 'nav.pipeline', icon: '💰', href: '/pipeline', domain: 'pipeline' },
  { id: 'chat', labelKey: 'nav.chat', icon: '💬', href: '/chat', domain: 'chat' },
  { id: 'crm', labelKey: 'nav.crm', icon: '🤝', href: '/crm', domain: 'crm' },
]

function canAccessDomain(u: { role: string; name: string; access_domains?: string[] } | null, domain?: string): boolean {
  if (!u) return false
  if (!domain) return true // No domain restriction
  // Admin and director can see everything
  if (u.role === 'admin' || u.role === 'director') return true
  // Check user's access_domains
  const domains = u.access_domains ?? ['tasks', 'issues', 'projects', 'workload', 'chat', 'reports']
  return domains.includes(domain)
}

const SYSTEM_NAV = [
  { id: 'reports', labelKey: 'nav.reports', icon: '📊', href: '/reports' },
  { id: 'templates', labelKey: 'nav.templates', icon: '📝', href: '/templates', adminOnly: true },
  { id: 'import', labelKey: 'nav.import', icon: '📥', href: '/import', adminOnly: true },
  { id: 'members', labelKey: 'nav.members', icon: '👥', href: '/members', adminOnly: true },
  { id: 'settings', labelKey: 'nav.settings', icon: '⚙', href: '/settings', adminOnly: true },
]

export function Sidebar({ activePage, onNavigate, collapsed = false }: SidebarProps) {
  const { user, logout } = useAuth()
  const userWithDomains = user as (typeof user & { access_domains?: string[] }) | null
  const { data: members } = useMembers()
  const { data: waitingCount = 0 } = useWaitingTaskCount()
  const router = useRouter()
  const [showPasswordModal, _setShowPasswordModal] = useState(false)
  const setShowPasswordModal = (val: boolean) => {
    console.log('[PasswordModal] setShowPasswordModal called with:', val, 'stack:', new Error().stack?.split('\n').slice(1, 4).join(' | '))
    _setShowPasswordModal(val)
  }
  const [appName, setAppName] = useState(APP_CONFIG.branding.appName)
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()

  // Load app name from settings
  useEffect(() => {
    fetch('/api/settings?key=app_name').then(r => r.json()).then(d => {
      if (d.value) setAppName(d.value)
    }).catch(() => {})
  }, [])

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
        avatar_url: m.avatar_url,
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
        <Link href={APP_CONFIG.branding.landingPage} onClick={onNavigate} className="flex items-center gap-[7px] text-white no-underline" title={collapsed ? appName : undefined}>
          {APP_CONFIG.branding.logoUrl ? (
            <img src={APP_CONFIG.branding.logoUrl} alt={appName} width={APP_CONFIG.branding.logoWidth} height={APP_CONFIG.branding.logoHeight} className="shrink-0" />
          ) : (
            <span className="text-[18px]">✦</span>
          )}
          {!collapsed && <span className="text-[15px] font-bold tracking-wide">{appName}</span>}
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
          {MAIN_NAV.filter((item) => canAccessDomain(userWithDomains, (item as any).domain)).map((item) => {
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
              <Avatar name_short={creator.short} color={creator.color} avatar_url={creator.avatar_url} size="sm" />
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
          {SYSTEM_NAV.filter((item) => !(item as any).adminOnly || (user?.role === 'admin' || user?.role === 'director')).map((item) => {
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
                <Avatar name_short={user?.name_short ?? '?'} color={user?.avatar_color ?? 'av-a'} avatar_url={user?.avatar_url} size="sm" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" sideOffset={8}>
                <div className="px-[8px] py-[4px] text-[11px] text-muted-foreground">
                  {user?.name ?? '...'} - {user ? roleLabel(user.role) : ''}
                </div>
                <DropdownMenuSeparator />
                <a href="/profile" className="flex items-center gap-[8px] px-[8px] py-[6px] text-[12px] cursor-pointer hover:bg-accent rounded-sm transition-colors">
                  <User className="w-[14px] h-[14px]" />
                  {t('profile.title')}
                </a>
                <button
                  onClick={() => { console.log('[PasswordModal] button clicked'); setTimeout(() => setShowPasswordModal(true), 150) }}
                  className="flex items-center gap-[8px] px-[8px] py-[6px] text-[12px] cursor-pointer hover:bg-accent rounded-sm transition-colors w-full text-left"
                >
                  <KeyRound className="w-[14px] h-[14px]" />
                  {t('auth.changePassword')}
                </button>
                <button
                  onClick={nextTheme}
                  className="flex items-center gap-[8px] px-[8px] py-[6px] text-[12px] cursor-pointer hover:bg-accent rounded-sm transition-colors w-full text-left"
                >
                  <ThemeIcon className="w-[14px] h-[14px]" />
                  {t('settings.theme')}: {theme === 'light' ? t('settings.light') : theme === 'dark' ? t('settings.dark') : t('settings.system')}
                </button>
                <DropdownMenuSeparator />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-[8px] px-[8px] py-[6px] text-[12px] cursor-pointer hover:bg-accent rounded-sm transition-colors w-full text-left text-red-500"
                >
                  <LogOut className="w-[14px] h-[14px]" />
                  {t('auth.logout')}
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          /* Expanded: full user info */
          <div className="flex items-center gap-[8px] px-[10px] py-[8px] rounded-[6px] bg-white/[0.08]">
            <Avatar name_short={user?.name_short ?? '?'} color={user?.avatar_color ?? 'av-a'} avatar_url={user?.avatar_url} size="sm" />
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
                <a href="/profile" className="flex items-center gap-[8px] px-[8px] py-[6px] text-[12px] cursor-pointer hover:bg-accent rounded-sm transition-colors">
                  <User className="w-[14px] h-[14px]" />
                  {t('profile.title')}
                </a>
                <button
                  onClick={() => setTimeout(() => setShowPasswordModal(true), 150)}
                  className="flex items-center gap-[8px] px-[8px] py-[6px] text-[12px] cursor-pointer hover:bg-accent rounded-sm transition-colors w-full text-left"
                >
                  <KeyRound className="w-[14px] h-[14px]" />
                  {t('auth.changePassword')}
                </button>
                <button
                  onClick={nextTheme}
                  className="flex items-center gap-[8px] px-[8px] py-[6px] text-[12px] cursor-pointer hover:bg-accent rounded-sm transition-colors w-full text-left"
                >
                  <ThemeIcon className="w-[14px] h-[14px]" />
                  {t('settings.theme')}: {theme === 'light' ? t('settings.light') : theme === 'dark' ? t('settings.dark') : t('settings.system')}
                </button>
                <DropdownMenuSeparator />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-[8px] px-[8px] py-[6px] text-[12px] cursor-pointer hover:bg-accent rounded-sm transition-colors w-full text-left text-red-500"
                >
                  <LogOut className="w-[14px] h-[14px]" />
                  {t('auth.logout')}
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Password change modal */}
      {showPasswordModal && (() => { console.log('[PasswordModal] Rendering modal, open=true'); return null })()}
      <PasswordChangeModal
        open={showPasswordModal}
        onOpenChange={(val) => {
          console.log('[PasswordModal] onOpenChange called with:', val)
          setShowPasswordModal(val)
        }}
      />
    </aside>
  )
}
