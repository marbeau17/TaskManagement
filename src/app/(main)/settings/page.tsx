'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { LanguageToggle } from '@/components/shared/LanguageToggle'
import { useI18n } from '@/hooks/useI18n'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { getSetting, setSetting } from '@/lib/data/settings'

type SettingsTab = 'general' | 'theme' | 'language' | 'workload' | 'notification' | 'email' | 'ai'

export default function SettingsPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { can } = usePermission()
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  // Organization settings
  const [orgName, setOrgName] = useState('ワークフロー株式会社')

  // Workload thresholds
  const [warningThreshold, setWarningThreshold] = useState('80')
  const [dangerThreshold, setDangerThreshold] = useState('100')

  // Notification settings
  const [notifyNewTask, setNotifyNewTask] = useState(true)
  const [notifyAssigned, setNotifyAssigned] = useState(true)
  const [notifyDeadline, setNotifyDeadline] = useState(true)
  const [notifyComment, setNotifyComment] = useState(false)
  const [notifyOverload, setNotifyOverload] = useState(true)

  // Language settings
  const [autoDetect, setAutoDetect] = useState(true)

  // AI settings
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [aiTestResult, setAiTestResult] = useState<string | null>(null)
  const [aiTesting, setAiTesting] = useState(false)

  // Email settings
  const [emailSmtpConfigured, setEmailSmtpConfigured] = useState<boolean | null>(null)
  const [emailTestResult, setEmailTestResult] = useState<string | null>(null)
  const [emailTesting, setEmailTesting] = useState(false)
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpFromName, setSmtpFromName] = useState('WorkFlow Task Management')
  const [smtpFromEmail, setSmtpFromEmail] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)

  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load saved Gemini API key from database on mount
  useEffect(() => {
    getSetting('gemini_api_key').then((val) => {
      if (val) setGeminiApiKey(val)
    })
  }, [])

  // Load SMTP settings from database on mount
  useEffect(() => {
    Promise.all([
      getSetting('smtp_host'),
      getSetting('smtp_port'),
      getSetting('smtp_user'),
      getSetting('smtp_password'),
      getSetting('smtp_from_name'),
      getSetting('smtp_from_email'),
    ]).then(([host, port, user, pass, fromName, fromEmail]) => {
      if (host) setSmtpHost(host)
      if (port) setSmtpPort(port)
      if (user) setSmtpUser(user)
      if (pass) setSmtpPassword(pass)
      if (fromName) setSmtpFromName(fromName)
      if (fromEmail) setSmtpFromEmail(fromEmail)
      setEmailSmtpConfigured(!!(user && pass))
    }).catch(() => setEmailSmtpConfigured(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Persist Gemini API key to app_settings
      if (geminiApiKey) {
        await setSetting('gemini_api_key', geminiApiKey)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save settings:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleTestAi = async () => {
    setAiTesting(true)
    setAiTestResult(null)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello, world!', targetLang: 'ja' }),
      })
      const data = await res.json()
      if (data.error) {
        setAiTestResult(`Error: ${data.error}`)
      } else {
        setAiTestResult(`OK: "${data.translated}"`)
      }
    } catch {
      setAiTestResult('Error: Connection failed')
    } finally {
      setAiTesting(false)
    }
  }

  const handleTestEmail = async () => {
    setEmailTesting(true)
    setEmailTestResult(null)
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email }),
      })
      const data = await res.json()
      if (res.ok) {
        setEmailTestResult(t('settings.emailTestSuccess'))
      } else {
        setEmailTestResult(`${t('settings.emailTestError')}: ${data.error || 'Unknown error'}`)
      }
    } catch {
      setEmailTestResult(`${t('settings.emailTestError')}: Connection failed`)
    } finally {
      setEmailTesting(false)
    }
  }

  const tabs: { id: SettingsTab; labelKey: string }[] = [
    { id: 'general', labelKey: 'settings.general' },
    { id: 'theme', labelKey: 'settings.theme' },
    { id: 'language', labelKey: 'settings.language' },
    { id: 'workload', labelKey: 'settings.workload' },
    { id: 'notification', labelKey: 'settings.notification' },
    { id: 'email', labelKey: 'settings.email' },
    { id: 'ai', labelKey: 'settings.ai' },
  ]

  return (
    <>
      <Topbar title={t('settings.title')} />

      <div className="flex-1 overflow-auto p-[12px] md:p-[20px] max-w-[720px]">
        {/* Tab navigation */}
        <div className="flex flex-wrap gap-[4px] mb-[16px] bg-surf2 rounded-[8px] p-[3px]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-[12px] py-[6px] rounded-[6px] text-[12px] font-medium transition-all cursor-pointer
                ${activeTab === tab.id
                  ? 'bg-surface text-mint-d shadow'
                  : 'text-text2 hover:text-text'
                }
              `}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-[16px]">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow">
              <h2 className="text-[14px] font-bold text-text mb-[12px]">
                {t('settings.general')}
              </h2>
              <div>
                <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                  {t('settings.orgName')}
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                />
              </div>
            </div>
          )}

          {/* Theme Settings */}
          {activeTab === 'theme' && (
            <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow">
              <h2 className="text-[14px] font-bold text-text mb-[12px]">
                {t('settings.theme')}
              </h2>
              <p className="text-[11px] text-text2 mb-[10px]">
                {t('settings.themeDescription')}
              </p>
              <ThemeToggle />
            </div>
          )}

          {/* Language Settings */}
          {activeTab === 'language' && (
            <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow">
              <h2 className="text-[14px] font-bold text-text mb-[12px]">
                {t('settings.language')}
              </h2>
              <p className="text-[11px] text-text2 mb-[10px]">
                {t('settings.languageDescription')}
              </p>
              <LanguageToggle />
              <label className="flex items-center gap-[8px] mt-[14px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDetect}
                  onChange={(e) => setAutoDetect(e.target.checked)}
                  className="w-[16px] h-[16px] rounded border-border2 text-mint focus:ring-mint accent-[#6FB5A3]"
                />
                <span className="text-[12px] text-text">
                  {t('settings.autoDetectLanguage')}
                </span>
              </label>
            </div>
          )}

          {/* Workload Management Settings */}
          {activeTab === 'workload' && (
            <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow">
              <h2 className="text-[14px] font-bold text-text mb-[12px]">
                {t('settings.workload')}
              </h2>
              <div className="space-y-[12px]">
                <div>
                  <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                    {t('settings.warningThreshold')}
                  </label>
                  <input
                    type="number"
                    value={warningThreshold}
                    onChange={(e) => setWarningThreshold(e.target.value)}
                    className="w-[120px] text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                    min={0}
                    max={100}
                  />
                  <p className="text-[10px] text-text3 mt-[2px]">
                    {t('settings.warningThresholdHelp')}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                    {t('settings.dangerThreshold')}
                  </label>
                  <input
                    type="number"
                    value={dangerThreshold}
                    onChange={(e) => setDangerThreshold(e.target.value)}
                    className="w-[120px] text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                    min={0}
                    max={200}
                  />
                  <p className="text-[10px] text-text3 mt-[2px]">
                    {t('settings.dangerThresholdHelp')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notification' && (
            <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow">
              <h2 className="text-[14px] font-bold text-text mb-[12px]">
                {t('settings.notification')}
              </h2>
              <div className="space-y-[10px]">
                {[
                  {
                    label: t('settings.notifyNewTask'),
                    checked: notifyNewTask,
                    onChange: setNotifyNewTask,
                  },
                  {
                    label: t('settings.notifyAssigned'),
                    checked: notifyAssigned,
                    onChange: setNotifyAssigned,
                  },
                  {
                    label: t('settings.notifyDeadline'),
                    checked: notifyDeadline,
                    onChange: setNotifyDeadline,
                  },
                  {
                    label: t('settings.notifyComment'),
                    checked: notifyComment,
                    onChange: setNotifyComment,
                  },
                  {
                    label: t('settings.notifyOverload'),
                    checked: notifyOverload,
                    onChange: setNotifyOverload,
                  },
                ].map((item) => (
                  <label
                    key={item.label}
                    className="flex items-center gap-[8px] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => item.onChange(e.target.checked)}
                      className="w-[16px] h-[16px] rounded border-border2 text-mint focus:ring-mint accent-[#6FB5A3]"
                    />
                    <span className="text-[12px] text-text">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Email Settings */}
          {activeTab === 'email' && (
            <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow">
              <h2 className="text-[14px] font-bold text-text mb-[4px]">
                {t('email.title')}
              </h2>
              <p className="text-[11px] text-text2 mb-[16px]">
                {t('email.description')}
              </p>
              <div className="space-y-[12px]">
                {/* SMTP Host */}
                <div>
                  <label className="text-[11px] text-text2 font-medium block mb-[4px]">SMTP Host</label>
                  <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                    placeholder="smtp.gmail.com" />
                </div>
                {/* SMTP Port */}
                <div>
                  <label className="text-[11px] text-text2 font-medium block mb-[4px]">SMTP Port</label>
                  <input type="text" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)}
                    className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                    placeholder="587" />
                </div>
                {/* SMTP User */}
                <div>
                  <label className="text-[11px] text-text2 font-medium block mb-[4px]">{t('email.smtpUser')}</label>
                  <input type="email" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)}
                    className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                    placeholder="your-email@gmail.com" />
                </div>
                {/* SMTP Password */}
                <div>
                  <label className="text-[11px] text-text2 font-medium block mb-[4px]">{t('email.smtpPassword')}</label>
                  <input type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)}
                    className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                    placeholder="Gmail App Password" />
                  <p className="text-[10px] text-text3 mt-[2px]">{t('email.smtpPasswordHelp')}</p>
                </div>
                {/* From Name */}
                <div>
                  <label className="text-[11px] text-text2 font-medium block mb-[4px]">{t('email.fromName')}</label>
                  <input type="text" value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)}
                    className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                    placeholder="WorkFlow Task Management" />
                </div>
                {/* From Email */}
                <div>
                  <label className="text-[11px] text-text2 font-medium block mb-[4px]">{t('email.fromEmail')}</label>
                  <input type="email" value={smtpFromEmail} onChange={(e) => setSmtpFromEmail(e.target.value)}
                    className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                    placeholder="your-email@gmail.com" />
                </div>
                {/* Save + Status */}
                <div className="flex items-center gap-[8px] pt-[8px]">
                  <button
                    onClick={async () => {
                      setEmailSaving(true)
                      setEmailSaved(false)
                      try {
                        await Promise.all([
                          setSetting('smtp_host', smtpHost),
                          setSetting('smtp_port', smtpPort),
                          setSetting('smtp_user', smtpUser),
                          setSetting('smtp_password', smtpPassword),
                          setSetting('smtp_from_name', smtpFromName),
                          setSetting('smtp_from_email', smtpFromEmail),
                        ])
                        setEmailSmtpConfigured(!!(smtpUser && smtpPassword))
                        setEmailSaved(true)
                        setTimeout(() => setEmailSaved(false), 3000)
                      } catch (err) {
                        console.error('Failed to save email settings:', err)
                      } finally {
                        setEmailSaving(false)
                      }
                    }}
                    disabled={emailSaving || !can('settings', 'update')}
                    className="px-[14px] py-[6px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-medium disabled:opacity-50"
                  >
                    {emailSaving ? t('common.saving') : t('common.save')}
                  </button>
                  {emailSaved && <span className="text-[11px] text-ok font-medium">{t('settings.saved')}</span>}
                  {emailSmtpConfigured !== null && (
                    <span className={`text-[11px] font-medium ml-auto ${emailSmtpConfigured ? 'text-ok' : 'text-text3'}`}>
                      {emailSmtpConfigured ? t('email.configured') : t('email.notConfigured')}
                    </span>
                  )}
                </div>
                {/* Divider */}
                <div className="border-t border-border2 pt-[12px] mt-[4px]">
                  <h3 className="text-[12px] font-bold text-text mb-[8px]">{t('email.testSend')}</h3>
                  <div className="flex items-center gap-[8px]">
                    <button
                      onClick={handleTestEmail}
                      disabled={emailTesting || !smtpUser}
                      className="px-[14px] py-[6px] text-[12px] text-white bg-info rounded-[6px] hover:opacity-90 transition-colors font-medium disabled:opacity-50"
                    >
                      {emailTesting ? t('email.testSending') : t('email.testSend')}
                    </button>
                    {emailTestResult && (
                      <span className={`text-[11px] font-medium ${emailTestResult.includes('Success') || emailTestResult.includes('成功') || emailTestResult.includes('送信しました') ? 'text-ok' : 'text-red-500'}`}>
                        {emailTestResult}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Settings */}
          {activeTab === 'ai' && (
            <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow">
              <h2 className="text-[14px] font-bold text-text mb-[12px]">
                {t('settings.ai')}
              </h2>
              <p className="text-[11px] text-text2 mb-[10px]">
                {t('settings.aiDescription')}
              </p>
              <div className="space-y-[12px]">
                <div>
                  <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                    {t('settings.geminiApiKey')}
                  </label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint font-mono"
                  />
                  <p className="text-[10px] text-text3 mt-[2px]">
                    {t('settings.geminiApiKeyHelp')}
                  </p>
                </div>
                <div className="flex items-center gap-[8px]">
                  <button
                    onClick={handleTestAi}
                    disabled={aiTesting}
                    className="px-[14px] py-[6px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-medium disabled:opacity-50 cursor-pointer"
                  >
                    {aiTesting ? t('common.loading') : t('settings.testConnection')}
                  </button>
                  {aiTestResult && (
                    <span className={`text-[11px] font-medium ${aiTestResult.startsWith('OK') ? 'text-ok' : 'text-red-500'}`}>
                      {aiTestResult}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        {can('settings', 'update') && (
          <div className="flex items-center gap-[12px] mt-[16px]">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-[20px] py-[8px] text-[13px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-medium cursor-pointer disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
            {saved && (
              <span className="text-[12px] text-ok font-medium">
                {t('settings.saved')}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  )
}
