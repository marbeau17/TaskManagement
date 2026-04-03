'use client'

import { useState, useEffect } from 'react'
import { Calendar, Link2, Unlink, RefreshCw, CheckCircle, Shield } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/stores/toastStore'

export function CalendarConnect() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [connected, setConnected] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!user) return
    // Check connection status
    fetch(`/api/ms365/events?user_id=${user.id}&start_date=${new Date().toISOString().slice(0, 10)}&end_date=${new Date().toISOString().slice(0, 10)}&viewer_id=${user.id}`)
      .then(r => {
        if (r.ok) setConnected(true)
      })
      .catch(() => {})
  }, [user])

  const handleSync = async () => {
    setSyncing(true)
    toast.success(t('calendar.syncStarted'))
    // In production, this would call /api/ms365/sync
    // For now, just show the UI flow
    setTimeout(() => {
      setSyncing(false)
      setLastSync(new Date().toISOString())
      toast.success(t('calendar.syncComplete'))
    }, 2000)
  }

  return (
    <div className="bg-surface border border-border2 rounded-[12px] shadow overflow-hidden">
      <div className="px-[16px] py-[12px] border-b border-border2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 flex items-center gap-[10px]">
        <Calendar className="w-[20px] h-[20px] text-blue-600 dark:text-blue-400" />
        <div>
          <h3 className="text-[14px] font-bold text-text">{t('calendar.title')}</h3>
          <p className="text-[11px] text-text2">{t('calendar.description')}</p>
        </div>
        <div className="ml-auto flex items-center gap-[6px]">
          {connected ? (
            <span className="flex items-center gap-[4px] text-[11px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-[14px] h-[14px]" /> {t('calendar.connected')}
            </span>
          ) : (
            <span className="text-[11px] text-text3">{t('calendar.notConnected')}</span>
          )}
        </div>
      </div>

      <div className="p-[16px] space-y-[12px]">
        {/* Connection info */}
        <div className="flex items-center gap-[8px] text-[12px] text-text2">
          <Shield className="w-[14px] h-[14px] text-text3" />
          <span>{t('calendar.privacyNote')}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-[8px]">
          {!connected ? (
            <button
              onClick={() => {
                // In production: redirect to /api/ms365/auth
                toast.success(t('calendar.connectRedirect'))
                setConnected(true)
              }}
              className="flex items-center gap-[6px] px-[14px] py-[8px] text-[12px] font-bold text-white bg-blue-600 rounded-[8px] hover:bg-blue-700 transition-colors"
            >
              <Link2 className="w-[14px] h-[14px]" />
              {t('calendar.connect')}
            </button>
          ) : (
            <>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-[6px] px-[14px] py-[8px] text-[12px] font-bold text-white bg-mint-dd rounded-[8px] hover:bg-mint-d disabled:opacity-50"
              >
                <RefreshCw className={`w-[14px] h-[14px] ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? t('calendar.syncing') : t('calendar.sync')}
              </button>
              <button
                onClick={() => {
                  if (confirm(t('calendar.disconnectConfirm'))) {
                    setConnected(false)
                    toast.success(t('calendar.disconnected'))
                  }
                }}
                className="flex items-center gap-[6px] px-[14px] py-[8px] text-[12px] font-semibold text-danger bg-danger/5 border border-danger/20 rounded-[8px] hover:bg-danger/10"
              >
                <Unlink className="w-[14px] h-[14px]" />
                {t('calendar.disconnect')}
              </button>
            </>
          )}
        </div>

        {lastSync && (
          <p className="text-[10px] text-text3">
            {t('calendar.lastSync')}: {new Date(lastSync).toLocaleString('ja-JP')}
          </p>
        )}
      </div>
    </div>
  )
}
