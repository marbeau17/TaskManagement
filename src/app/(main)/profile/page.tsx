'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { useTheme } from '@/hooks/useTheme'
import { Topbar } from '@/components/layout'
import { Avatar } from '@/components/shared'
import { toast } from '@/stores/toastStore'
import type { AvatarColor } from '@/types/database'

const AVATAR_COLORS: { value: AvatarColor; bg: string }[] = [
  { value: 'av-a', bg: '#D8ECEA' },
  { value: 'av-b', bg: '#E8E0EE' },
  { value: 'av-c', bg: '#EEE4D8' },
  { value: 'av-d', bg: '#E0ECF4' },
  { value: 'av-e', bg: '#EEE0E4' },
]

export default function ProfilePage() {
  const { t, locale, setLocale } = useI18n()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  const [name, setName] = useState('')
  const [nameShort, setNameShort] = useState('')
  const [avatarColor, setAvatarColor] = useState<AvatarColor>('av-a')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [notifyAssigned, setNotifyAssigned] = useState(true)
  const [notifyDeadline, setNotifyDeadline] = useState(true)
  const [notifyComment, setNotifyComment] = useState(true)
  const [notifyOverload, setNotifyOverload] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name)
      setNameShort(user.name_short ?? '')
      setAvatarColor(user.avatar_color)
      setAvatarUrl((user as any).avatar_url ?? null)
    }
  }, [user])

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const { uploadFile, getFileUrl } = await import('@/lib/data/storage')
      const result = await uploadFile(`avatars-${user.id}`, file)
      const url = await getFileUrl(result.path)
      setAvatarUrl(url)
      await fetch(`/api/members/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: url }),
      })
      toast.success('写真をアップロードしました')
    } catch {
      toast.error('アップロードに失敗しました')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const res = await fetch(`/api/members/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, name_short: nameShort, avatar_color: avatarColor,
        }),
      })
      if (res.ok) {
        toast.success(t('profile.saved'))
        // Refresh page to update sidebar avatar
        window.location.reload()
      } else {
        toast.error(t('profile.saveFailed'))
      }
    } catch {
      toast.error(t('profile.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <>
      <Topbar title={t('profile.title')} />

      <div className="p-[12px] md:p-[20px] max-w-[600px]">
        {/* Profile Header */}
        <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow mb-[16px]">
          <div className="flex items-center gap-[16px] mb-[20px]">
            <div className="relative group">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-[48px] h-[48px] rounded-full object-cover" />
              ) : (
                <Avatar name_short={nameShort || name.charAt(0)} color={avatarColor} size="lg" />
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/50 text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                {uploading ? '...' : '📷'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-text">{name}</h2>
              <p className="text-[12px] text-text2">{user.email}</p>
              <span className="text-[10px] px-[8px] py-[1px] rounded-full font-semibold border bg-info-bg text-info border-info-b mt-[4px] inline-block">
                {user.role}
              </span>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-[12px]">
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">{t('profile.displayName')}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint" />
            </div>
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">{t('profile.shortName')}</label>
              <input type="text" value={nameShort} onChange={(e) => setNameShort(e.target.value)} maxLength={4}
                className="w-[100px] text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                placeholder={name.charAt(0)} />
            </div>

            {/* Avatar Color */}
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[6px]">{t('profile.avatarColor')}</label>
              <div className="flex gap-[8px]">
                {AVATAR_COLORS.map((c) => (
                  <button key={c.value} onClick={() => setAvatarColor(c.value)}
                    className={`w-[36px] h-[36px] rounded-full border-2 transition-colors flex items-center justify-center text-[12px] font-bold ${
                      avatarColor === c.value ? 'border-mint ring-2 ring-mint/30' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.bg }}
                  >
                    {nameShort || name.charAt(0)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="mt-[16px] px-[20px] py-[8px] text-[12px] font-bold text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50">
            {saving ? '...' : t('profile.save')}
          </button>
        </div>

        {/* Appearance */}
        <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow mb-[16px]">
          <h3 className="text-[14px] font-bold text-text mb-[12px]">{t('profile.appearance')}</h3>

          {/* Theme */}
          <div className="mb-[16px]">
            <label className="text-[11px] text-text2 font-medium block mb-[6px]">{t('profile.theme')}</label>
            <div className="flex gap-[8px]">
              {(['light', 'dark', 'system'] as const).map((opt) => (
                <button key={opt} onClick={() => setTheme(opt)}
                  className={`px-[14px] py-[6px] rounded-[6px] text-[12px] font-medium border transition-colors ${
                    theme === opt ? 'bg-mint text-white border-mint' : 'bg-surface text-text2 border-wf-border hover:bg-surf2'
                  }`}
                >
                  {opt === 'light' ? '☀ ' + t('profile.light') : opt === 'dark' ? '🌙 ' + t('profile.dark') : '💻 ' + t('profile.system')}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[6px]">{t('profile.language')}</label>
            <div className="flex gap-[8px]">
              <button onClick={() => setLocale('ja')}
                className={`px-[14px] py-[6px] rounded-[6px] text-[12px] font-medium border transition-colors ${
                  locale === 'ja' ? 'bg-mint text-white border-mint' : 'bg-surface text-text2 border-wf-border hover:bg-surf2'
                }`}>🇯🇵 日本語</button>
              <button onClick={() => setLocale('en')}
                className={`px-[14px] py-[6px] rounded-[6px] text-[12px] font-medium border transition-colors ${
                  locale === 'en' ? 'bg-mint text-white border-mint' : 'bg-surface text-text2 border-wf-border hover:bg-surf2'
                }`}>🇺🇸 English</button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow">
          <h3 className="text-[14px] font-bold text-text mb-[12px]">{t('profile.notifications')}</h3>
          <div className="space-y-[10px]">
            {[
              { label: t('profile.notifyAssigned'), checked: notifyAssigned, set: setNotifyAssigned },
              { label: t('profile.notifyDeadline'), checked: notifyDeadline, set: setNotifyDeadline },
              { label: t('profile.notifyComment'), checked: notifyComment, set: setNotifyComment },
              { label: t('profile.notifyOverload'), checked: notifyOverload, set: setNotifyOverload },
            ].map((item, i) => (
              <label key={i} className="flex items-center gap-[10px] cursor-pointer">
                <input type="checkbox" checked={item.checked} onChange={(e) => item.set(e.target.checked)}
                  className="accent-mint w-[16px] h-[16px]" />
                <span className="text-[12px] text-text">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
