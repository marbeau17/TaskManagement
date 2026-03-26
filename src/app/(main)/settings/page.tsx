'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { LanguageToggle } from '@/components/shared/LanguageToggle'
import { useI18n } from '@/hooks/useI18n'

type SettingsTab = 'general' | 'theme' | 'language' | 'workload' | 'notification' | 'ai'

export default function SettingsPage() {
  const { t } = useI18n()
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

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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

  const tabs: { id: SettingsTab; labelKey: string }[] = [
    { id: 'general', labelKey: 'settings.general' },
    { id: 'theme', labelKey: 'settings.theme' },
    { id: 'language', labelKey: 'settings.language' },
    { id: 'workload', labelKey: 'settings.workload' },
    { id: 'notification', labelKey: 'settings.notification' },
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
                  {t('settings.general') === 'General' ? 'Organization Name' : '組織名'}
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
                {t('settings.theme') === 'Theme'
                  ? 'Select the display theme. Choosing System follows your OS preference.'
                  : 'アプリの表示テーマを選択します。システムを選ぶとOSの設定に従います。'
                }
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
                {t('settings.language') === 'Language'
                  ? 'Select your preferred display language.'
                  : 'UIの表示言語を選択します。'
                }
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
                  {t('settings.language') === 'Language'
                    ? 'Auto-detect language from browser'
                    : 'ブラウザの言語設定から自動検出する'
                  }
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
                    {t('settings.workload') === 'Workload' ? 'Warning Threshold (%)' : '警告しきい値 (%)'}
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
                    {t('settings.workload') === 'Workload'
                      ? 'Shows a warning when workload exceeds this value'
                      : '稼働率がこの値を超えると注意表示になります'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                    {t('settings.workload') === 'Workload' ? 'Danger Threshold (%)' : '超過しきい値 (%)'}
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
                    {t('settings.workload') === 'Workload'
                      ? 'Shows overloaded when workload exceeds this value'
                      : '稼働率がこの値を超えると超過表示になります'
                    }
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
                    label: t('settings.notification') === 'Notifications' ? 'When a new task is created' : '新規タスク作成時',
                    checked: notifyNewTask,
                    onChange: setNotifyNewTask,
                  },
                  {
                    label: t('settings.notification') === 'Notifications' ? 'When a task is assigned' : 'タスクがアサインされた時',
                    checked: notifyAssigned,
                    onChange: setNotifyAssigned,
                  },
                  {
                    label: t('settings.notification') === 'Notifications' ? 'When deadline is approaching (3 days)' : '納期が近づいた時 (3日前)',
                    checked: notifyDeadline,
                    onChange: setNotifyDeadline,
                  },
                  {
                    label: t('settings.notification') === 'Notifications' ? 'When a comment is added' : 'コメントが追加された時',
                    checked: notifyComment,
                    onChange: setNotifyComment,
                  },
                  {
                    label: t('settings.notification') === 'Notifications' ? 'When workload is exceeded' : '稼働超過時',
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

          {/* AI Settings */}
          {activeTab === 'ai' && (
            <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow">
              <h2 className="text-[14px] font-bold text-text mb-[12px]">
                {t('settings.ai')}
              </h2>
              <p className="text-[11px] text-text2 mb-[10px]">
                {t('settings.ai') === 'AI Settings'
                  ? 'Configure the Gemini API key for AI translation features.'
                  : 'AI翻訳機能で使用するGemini APIキーを設定します。'
                }
              </p>
              <div className="space-y-[12px]">
                <div>
                  <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint font-mono"
                  />
                  <p className="text-[10px] text-text3 mt-[2px]">
                    {t('settings.ai') === 'AI Settings'
                      ? 'Set GEMINI_API_KEY in your .env file or enter it here.'
                      : '.envファイルにGEMINI_API_KEYを設定するか、ここに入力してください。'
                    }
                  </p>
                </div>
                <div className="flex items-center gap-[8px]">
                  <button
                    onClick={handleTestAi}
                    disabled={aiTesting}
                    className="px-[14px] py-[6px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-medium disabled:opacity-50 cursor-pointer"
                  >
                    {aiTesting
                      ? (t('common.loading'))
                      : (t('settings.ai') === 'AI Settings' ? 'Test Connection' : '接続テスト')
                    }
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
        <div className="flex items-center gap-[12px] mt-[16px]">
          <button
            onClick={handleSave}
            className="px-[20px] py-[8px] text-[13px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-medium cursor-pointer"
          >
            {t('common.save')}
          </button>
          {saved && (
            <span className="text-[12px] text-ok font-medium">
              {t('common.save') === 'Save' ? 'Settings saved' : '設定を保存しました'}
            </span>
          )}
        </div>
      </div>
    </>
  )
}
