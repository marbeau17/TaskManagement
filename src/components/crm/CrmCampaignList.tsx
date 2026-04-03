'use client'

import { useState, useEffect } from 'react'
import { Plus, Send, BarChart3, Edit2, Trash2 } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { toast } from '@/stores/toastStore'
import type { CrmCampaign, CampaignType, CampaignStatus } from '@/types/crm-marketing'

const STATUS_BADGE: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  sending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  sent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
}

const TYPE_ICON: Record<CampaignType, string> = {
  email: '📧', line: '💬', instagram: '📷', multi: '📢',
}

export function CrmCampaignList() {
  const { t } = useI18n()
  const [campaigns, setCampaigns] = useState<CrmCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', campaign_type: 'email' as CampaignType, subject: '', description: '' })
  const [sending, setSending] = useState<string | null>(null)

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/crm/campaigns')
      if (res.ok) setCampaigns(await res.json())
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchCampaigns() }, [])

  const handleCreate = async () => {
    if (!formData.name.trim()) return
    const res = await fetch('/api/crm/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, content: { email_html: `<p>${formData.description}</p>` } }),
    })
    if (res.ok) {
      toast.success(t('crm.campaign.created'))
      await fetchCampaigns()
      setShowForm(false)
      setFormData({ name: '', campaign_type: 'email', subject: '', description: '' })
    }
  }

  const handleSend = async (id: string) => {
    if (!confirm(t('crm.campaign.sendConfirm'))) return
    setSending(id)
    try {
      const res = await fetch(`/api/crm/campaigns/${id}/send`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${t('crm.campaign.sent')}: ${data.sent}/${data.target}`)
        await fetchCampaigns()
      } else {
        toast.error(data.error || t('crm.campaign.sendFailed'))
      }
    } catch {
      toast.error(t('crm.campaign.sendFailed'))
    } finally {
      setSending(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.deleteConfirm'))) return
    await fetch(`/api/crm/campaigns/${id}`, { method: 'DELETE' })
    await fetchCampaigns()
  }

  const inputClass = 'w-full text-[13px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint'

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-text">{t('crm.campaign.title')}</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-[4px] px-[14px] py-[6px] text-[12px] font-bold bg-mint-dd text-white rounded-[6px] hover:bg-mint-d">
          <Plus className="w-[14px] h-[14px]" /> {t('crm.campaign.create')}
        </button>
      </div>

      {showForm && (
        <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow space-y-[8px]">
          <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder={t('crm.campaign.name')} className={inputClass} />
          <div className="flex gap-[8px]">
            <select value={formData.campaign_type} onChange={e => setFormData(p => ({...p, campaign_type: e.target.value as CampaignType}))} className={`flex-1 ${inputClass}`}>
              <option value="email">📧 {t('crm.campaign.typeEmail')}</option>
              <option value="line">💬 LINE</option>
              <option value="instagram">📷 Instagram</option>
              <option value="multi">📢 {t('crm.campaign.typeMulti')}</option>
            </select>
            <input type="text" value={formData.subject} onChange={e => setFormData(p => ({...p, subject: e.target.value}))} placeholder={t('crm.campaign.subject')} className={`flex-1 ${inputClass}`} />
          </div>
          <textarea value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} placeholder={t('crm.campaign.content')} rows={3} className={`${inputClass} resize-y`} />
          <div className="flex gap-[8px] justify-end">
            <button onClick={() => setShowForm(false)} className="px-[12px] py-[6px] text-[12px] text-text2 bg-surf2 rounded-[6px]">{t('common.cancel')}</button>
            <button onClick={handleCreate} className="px-[12px] py-[6px] text-[12px] font-bold text-white bg-mint-dd rounded-[6px]">{t('common.save')}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-[8px] animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-[72px] bg-surf2 rounded-[10px]" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-surface border border-border2 rounded-[10px] shadow p-[40px] text-center">
          <p className="text-[14px] text-text3">{t('crm.campaign.empty')}</p>
        </div>
      ) : (
        <div className="space-y-[8px]">
          {campaigns.map(c => (
            <div key={c.id} className="bg-surface border border-border2 rounded-[10px] shadow p-[14px] flex items-center gap-[12px]">
              <span className="text-[18px]">{TYPE_ICON[c.campaign_type] ?? '📧'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[6px]">
                  <h4 className="text-[13px] font-bold text-text truncate">{c.name}</h4>
                  <span className={`text-[9px] px-[6px] py-[1px] rounded-full font-bold ${STATUS_BADGE[c.status] ?? STATUS_BADGE.draft}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-[11px] text-text3 mt-[2px]">
                  {c.subject || c.description?.slice(0, 50) || '—'}
                  {c.status === 'sent' && ` • ${t('crm.campaign.sentLabel')}: ${c.sent_count}/${c.target_count}`}
                </p>
              </div>
              <div className="flex items-center gap-[4px] shrink-0">
                {c.status === 'draft' && (
                  <button onClick={() => handleSend(c.id)} disabled={sending === c.id} className="flex items-center gap-[2px] px-[8px] py-[4px] text-[11px] font-semibold text-white bg-mint-dd rounded-[6px] hover:bg-mint-d disabled:opacity-50">
                    <Send className="w-[12px] h-[12px]" /> {sending === c.id ? '...' : t('crm.campaign.send')}
                  </button>
                )}
                {c.status === 'sent' && (
                  <span className="flex items-center gap-[2px] px-[8px] py-[4px] text-[11px] text-text2">
                    <BarChart3 className="w-[12px] h-[12px]" /> {c.open_count}/{c.sent_count}
                  </span>
                )}
                <button onClick={() => handleDelete(c.id)} className="p-[6px] rounded-[6px] text-danger hover:bg-danger/5">
                  <Trash2 className="w-[14px] h-[14px]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
