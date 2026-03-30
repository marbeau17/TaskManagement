'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/useI18n'

interface WebhookConfig {
  id: string
  url: string
  events: string[]
  active: boolean
}

const WEBHOOK_EVENTS = [
  'task.created',
  'task.updated',
  'task.completed',
  'task.assigned',
  'issue.created',
  'issue.resolved',
  'comment.added',
]

export function WebhookSettings() {
  const { t } = useI18n()
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())

  const handleAdd = () => {
    if (!newUrl.trim()) return
    const webhook: WebhookConfig = {
      id: Date.now().toString(),
      url: newUrl.trim(),
      events: Array.from(selectedEvents),
      active: true,
    }
    setWebhooks((prev) => [...prev, webhook])
    setNewUrl('')
    setSelectedEvents(new Set())
    setShowAddForm(false)
  }

  const handleRemove = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id))
  }

  const handleToggle = (id: string) => {
    setWebhooks((prev) =>
      prev.map((w) => (w.id === id ? { ...w, active: !w.active } : w))
    )
  }

  return (
    <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow">
      <div className="flex items-center justify-between mb-[12px]">
        <h3 className="text-[14px] font-bold text-text">{t('settings.webhooks')}</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-[12px] py-[5px] text-[12px] font-semibold text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors"
        >
          + {t('settings.addWebhook')}
        </button>
      </div>

      <p className="text-[11px] text-text3 mb-[12px]">
        {t('settings.webhookDescription')}
      </p>

      {showAddForm && (
        <div className="border border-mint rounded-[8px] p-[12px] mb-[12px] bg-mint-ll/10">
          <div className="mb-[8px]">
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              Webhook URL
            </label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            />
          </div>
          <div className="mb-[8px]">
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('settings.webhookEvents')}
            </label>
            <div className="flex flex-wrap gap-[6px]">
              {WEBHOOK_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-[4px] text-[11px] text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEvents.has(event)}
                    onChange={() => {
                      setSelectedEvents((prev) => {
                        const next = new Set(prev)
                        if (next.has(event)) next.delete(event)
                        else next.add(event)
                        return next
                      })
                    }}
                    className="accent-mint w-[13px] h-[13px]"
                  />
                  {event}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-[6px]">
            <button onClick={() => setShowAddForm(false)} className="px-[12px] py-[5px] text-[11px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors">{t('common.cancel')}</button>
            <button onClick={handleAdd} disabled={!newUrl.trim()} className="px-[12px] py-[5px] text-[11px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50">{t('common.save')}</button>
          </div>
        </div>
      )}

      {webhooks.length === 0 && !showAddForm && (
        <div className="text-[12px] text-text3 text-center py-[20px]">
          {t('settings.noWebhooks')}
        </div>
      )}

      {webhooks.map((webhook) => (
        <div key={webhook.id} className="flex items-center gap-[8px] py-[8px] border-b border-border2 last:border-b-0">
          <div className={`w-[8px] h-[8px] rounded-full ${webhook.active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-text font-medium truncate">{webhook.url}</div>
            <div className="text-[10px] text-text3">{webhook.events.join(', ')}</div>
          </div>
          <button
            onClick={() => handleToggle(webhook.id)}
            className={`text-[10px] px-[8px] py-[2px] rounded-full font-semibold border ${webhook.active ? 'bg-ok-bg text-ok border-ok-b' : 'bg-surf2 text-text3 border-wf-border'}`}
          >
            {webhook.active ? 'Active' : 'Inactive'}
          </button>
          <button
            onClick={() => handleRemove(webhook.id)}
            className="text-[11px] text-danger hover:opacity-80 transition-colors"
          >
            {t('common.delete')}
          </button>
        </div>
      ))}
    </div>
  )
}
