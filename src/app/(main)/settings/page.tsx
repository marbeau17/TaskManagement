'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

export default function SettingsPage() {
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

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // In mock mode, just show a saved indicator
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <Topbar title="設定" />

      <div className="flex-1 overflow-auto p-[12px] md:p-[20px] space-y-[16px] max-w-[640px]">
        {/* Theme Settings */}
        <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow">
          <h2 className="text-[14px] font-bold text-text mb-[12px]">
            テーマ設定
          </h2>
          <p className="text-[11px] text-text2 mb-[10px]">
            アプリの表示テーマを選択します。システムを選ぶとOSの設定に従います。
          </p>
          <ThemeToggle />
        </div>

        {/* Organization Settings */}
        <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow">
          <h2 className="text-[14px] font-bold text-text mb-[12px]">
            組織設定
          </h2>
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              組織名
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            />
          </div>
        </div>

        {/* Workload Management Settings */}
        <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow">
          <h2 className="text-[14px] font-bold text-text mb-[12px]">
            稼働管理設定
          </h2>
          <div className="space-y-[12px]">
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                警告しきい値 (%)
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
                稼働率がこの値を超えると注意表示になります
              </p>
            </div>
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                超過しきい値 (%)
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
                稼働率がこの値を超えると超過表示になります
              </p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-surface border border-border2 rounded-[10px] p-[20px] shadow">
          <h2 className="text-[14px] font-bold text-text mb-[12px]">
            通知設定
          </h2>
          <div className="space-y-[10px]">
            {[
              {
                label: '新規タスク作成時',
                checked: notifyNewTask,
                onChange: setNotifyNewTask,
              },
              {
                label: 'タスクがアサインされた時',
                checked: notifyAssigned,
                onChange: setNotifyAssigned,
              },
              {
                label: '納期が近づいた時 (3日前)',
                checked: notifyDeadline,
                onChange: setNotifyDeadline,
              },
              {
                label: 'コメントが追加された時',
                checked: notifyComment,
                onChange: setNotifyComment,
              },
              {
                label: '稼働超過時',
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

        {/* Save button */}
        <div className="flex items-center gap-[12px]">
          <button
            onClick={handleSave}
            className="px-[20px] py-[8px] text-[13px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-medium"
          >
            保存
          </button>
          {saved && (
            <span className="text-[12px] text-ok font-medium">
              設定を保存しました
            </span>
          )}
        </div>
      </div>
    </>
  )
}
