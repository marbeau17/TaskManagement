'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Key, Globe, Save, ToggleLeft, ToggleRight } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { toast } from '@/stores/toastStore'

interface LineSettings {
  id?: string
  channel_access_token: string
  channel_secret: string
  webhook_url: string
  rich_menu_id: string
  greeting_message: string
  is_active: boolean
}

export function CrmLineSettings() {
  const { t } = useI18n()
  const [settings, setSettings] = useState<LineSettings>({
    channel_access_token: '',
    channel_secret: '',
    webhook_url: '',
    rich_menu_id: '',
    greeting_message: 'ご登録ありがとうございます！お気軽にお問い合わせください。',
    is_active: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)

  useEffect(() => {
    fetch('/api/crm/line-settings')
      .then(r => r.json())
      .then(data => { if (data && !data.error) setSettings(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/crm/line-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) toast.success(t('crm.line.saved'))
      else toast.error(t('crm.line.saveFailed'))
    } catch {
      toast.error(t('crm.line.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full text-[13px] px-[10px] py-[8px] bg-surface border border-border2 rounded-[8px] outline-none focus:border-mint font-mono'

  if (loading) {
    return <div className="bg-surface border border-border2 rounded-[12px] shadow p-[20px] animate-pulse h-[300px]" />
  }

  return (
    <div className="bg-surface border border-border2 rounded-[12px] shadow overflow-hidden">
      <div className="px-[16px] py-[12px] border-b border-border2 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 flex items-center gap-[10px]">
        <MessageCircle className="w-[20px] h-[20px] text-emerald-600 dark:text-emerald-400" />
        <div>
          <h3 className="text-[14px] font-bold text-text">{t('crm.line.title')}</h3>
          <p className="text-[11px] text-text2">{t('crm.line.description')}</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setSettings(s => ({ ...s, is_active: !s.is_active }))}
            className={`flex items-center gap-[4px] px-[10px] py-[4px] rounded-full text-[11px] font-bold transition-colors ${
              settings.is_active
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300'
            }`}
          >
            {settings.is_active ? <ToggleRight className="w-[14px] h-[14px]" /> : <ToggleLeft className="w-[14px] h-[14px]" />}
            {settings.is_active ? 'Active' : 'Inactive'}
          </button>
        </div>
      </div>

      <div className="p-[16px] space-y-[14px]">
        {/* Channel Access Token */}
        <div>
          <label className="flex items-center gap-[4px] text-[12px] font-semibold text-text2 mb-[4px]">
            <Key className="w-[12px] h-[12px]" />
            Channel Access Token
          </label>
          <input
            type={showSecrets ? 'text' : 'password'}
            value={settings.channel_access_token}
            onChange={e => setSettings(s => ({ ...s, channel_access_token: e.target.value }))}
            placeholder="Enter LINE Channel Access Token"
            className={inputClass}
          />
        </div>

        {/* Channel Secret */}
        <div>
          <label className="flex items-center gap-[4px] text-[12px] font-semibold text-text2 mb-[4px]">
            <Key className="w-[12px] h-[12px]" />
            Channel Secret
          </label>
          <input
            type={showSecrets ? 'text' : 'password'}
            value={settings.channel_secret}
            onChange={e => setSettings(s => ({ ...s, channel_secret: e.target.value }))}
            placeholder="Enter LINE Channel Secret"
            className={inputClass}
          />
          <button onClick={() => setShowSecrets(!showSecrets)} className="text-[10px] text-mint-dd hover:underline mt-[4px]">
            {showSecrets ? '🔒 Hide' : '👁 Show'} secrets
          </button>
        </div>

        {/* Webhook URL */}
        <div>
          <label className="flex items-center gap-[4px] text-[12px] font-semibold text-text2 mb-[4px]">
            <Globe className="w-[12px] h-[12px]" />
            Webhook URL
          </label>
          <div className="flex gap-[6px]">
            <input
              type="url"
              value={settings.webhook_url}
              onChange={e => setSettings(s => ({ ...s, webhook_url: e.target.value }))}
              placeholder="https://your-app.vercel.app/api/line/webhook"
              className={`flex-1 ${inputClass}`}
            />
          </div>
          <p className="text-[10px] text-text3 mt-[2px]">{t('crm.line.webhookHint')}</p>
        </div>

        {/* Greeting Message */}
        <div>
          <label className="text-[12px] font-semibold text-text2 mb-[4px] block">{t('crm.line.greeting')}</label>
          <textarea
            value={settings.greeting_message}
            onChange={e => setSettings(s => ({ ...s, greeting_message: e.target.value }))}
            rows={3}
            className={`${inputClass} resize-y`}
            style={{ fontFamily: 'inherit' }}
          />
        </div>

        {/* Rich Menu ID */}
        <div>
          <label className="text-[12px] font-semibold text-text2 mb-[4px] block">Rich Menu ID</label>
          <input
            type="text"
            value={settings.rich_menu_id}
            onChange={e => setSettings(s => ({ ...s, rich_menu_id: e.target.value }))}
            placeholder="richmenu-xxxxxxxx"
            className={inputClass}
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-[6px] px-[16px] py-[8px] text-[13px] font-bold text-white bg-mint-dd rounded-[8px] hover:bg-mint-d disabled:opacity-50"
        >
          <Save className="w-[14px] h-[14px]" />
          {saving ? '...' : t('common.save')}
        </button>
      </div>
    </div>
  )
}
