'use client'

import { useState, useEffect } from 'react'
import { Inbox, Reply, Send, Clock, User, Mail, CheckCircle, MessageSquare, ArrowLeft } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/stores/toastStore'
import type { CrmFormSubmission } from '@/types/crm-form'

interface SubmissionWithForm extends CrmFormSubmission {
  form?: { id: string; name: string }
  replied_at?: string
}

interface ReplyRecord {
  id: string
  subject: string
  body: string
  reply_to: string
  sent_at: string
  sender?: { id: string; name: string }
}

export function CrmInbox() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<SubmissionWithForm[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SubmissionWithForm | null>(null)
  const [replies, setReplies] = useState<ReplyRecord[]>([])
  const [replyBody, setReplyBody] = useState('')
  const [replySubject, setReplySubject] = useState('')
  const [sending, setSending] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)

  useEffect(() => {
    // Fetch all submissions across all forms
    fetch('/api/crm/forms')
      .then(r => r.json())
      .then(async (forms) => {
        if (!Array.isArray(forms)) return
        const allSubs: SubmissionWithForm[] = []
        for (const form of forms) {
          const r = await fetch(`/api/crm/forms/${form.id}/submissions`)
          const subs = await r.json()
          if (Array.isArray(subs)) {
            allSubs.push(...subs.map((s: any) => ({ ...s, form: { id: form.id, name: form.name } })))
          }
        }
        allSubs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setSubmissions(allSubs)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const selectSubmission = async (sub: SubmissionWithForm) => {
    setSelected(sub)
    setShowReplyForm(false)
    setReplyBody('')
    setReplySubject(`Re: ${sub.form?.name ?? 'お問い合わせ'}`)
    // Fetch replies
    try {
      const r = await fetch(`/api/crm/forms/${sub.form_id}/submissions/${sub.id}/reply`)
      if (r.ok) setReplies(await r.json())
      else setReplies([])
    } catch { setReplies([]) }
  }

  const handleReply = async () => {
    if (!selected || !replyBody.trim()) return
    const email = selected.data?.email
    if (!email) { toast.error('メールアドレスがありません'); return }

    setSending(true)
    try {
      const r = await fetch(`/api/crm/forms/${selected.form_id}/submissions/${selected.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply_to: email, subject: replySubject, body: replyBody }),
      })
      if (r.ok) {
        toast.success(t('crm.inbox.replySent'))
        setReplyBody('')
        setShowReplyForm(false)
        // Refresh replies
        const rr = await fetch(`/api/crm/forms/${selected.form_id}/submissions/${selected.id}/reply`)
        if (rr.ok) setReplies(await rr.json())
        // Update submission status locally
        setSubmissions(prev => prev.map(s => s.id === selected.id ? { ...s, status: 'contacted', replied_at: new Date().toISOString() } : s))
        setSelected(prev => prev ? { ...prev, status: 'contacted', replied_at: new Date().toISOString() } : null)
      } else {
        toast.error(t('crm.inbox.replyFailed'))
      }
    } catch {
      toast.error(t('crm.inbox.replyFailed'))
    } finally {
      setSending(false)
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex items-center gap-[8px]">
        <Inbox className="w-[18px] h-[18px] text-mint-dd" />
        <h3 className="text-[14px] font-bold text-text">{t('crm.inbox.title')}</h3>
        <span className="text-[10px] bg-mint-dd/10 text-mint-dd px-[6px] py-[1px] rounded-full font-bold">
          {submissions.filter(s => s.status === 'new').length} {t('crm.inbox.new')}
        </span>
      </div>

      <div className="flex gap-[12px] min-h-[500px]">
        {/* Submission list */}
        <div className="w-[360px] bg-surface border border-border2 rounded-[12px] shadow overflow-hidden shrink-0">
          {loading ? (
            <div className="p-[16px] animate-pulse space-y-[8px]">
              {[1,2,3,4].map(i => <div key={i} className="h-[60px] bg-surf2 rounded-[8px]" />)}
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-[32px] text-center">
              <MessageSquare className="w-[32px] h-[32px] text-text3 mx-auto mb-[8px]" />
              <p className="text-[13px] text-text3">{t('crm.inbox.empty')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border2 max-h-[600px] overflow-y-auto">
              {submissions.map(sub => {
                const name = sub.data?.last_name ? `${sub.data.last_name} ${sub.data.first_name ?? ''}`.trim() : sub.data?.email ?? t('crm.forms.anonymous')
                const isNew = sub.status === 'new'
                return (
                  <button
                    key={sub.id}
                    onClick={() => selectSubmission(sub)}
                    className={`w-full text-left px-[14px] py-[12px] hover:bg-surf2 transition-colors ${selected?.id === sub.id ? 'bg-mint-dd/5 border-l-2 border-l-mint-dd' : ''}`}
                  >
                    <div className="flex items-start gap-[8px]">
                      <div className={`w-[8px] h-[8px] rounded-full mt-[5px] shrink-0 ${isNew ? 'bg-blue-500' : sub.replied_at ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-[12px] truncate ${isNew ? 'font-bold text-text' : 'text-text2'}`}>{name}</span>
                          <span className="text-[9px] text-text3 shrink-0 ml-[8px]">{formatDate(sub.created_at)}</span>
                        </div>
                        <p className="text-[10px] text-mint-dd truncate">{sub.form?.name ?? ''}</p>
                        <p className="text-[10px] text-text3 truncate mt-[1px]">
                          {sub.data?.message?.slice(0, 60) ?? sub.data?.inquiry_type ?? sub.data?.document ?? ''}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail + Reply panel */}
        <div className="flex-1 bg-surface border border-border2 rounded-[12px] shadow overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Mail className="w-[40px] h-[40px] text-text3 mx-auto mb-[8px]" />
                <p className="text-[13px] text-text3">{t('crm.inbox.selectMessage')}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-[16px] py-[12px] border-b border-border2 bg-gradient-to-r from-surf2 to-surface">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[14px] font-bold text-text">
                      {selected.data?.last_name ?? ''} {selected.data?.first_name ?? ''}
                    </h4>
                    <p className="text-[11px] text-text2">{selected.data?.email ?? ''} • {selected.form?.name}</p>
                  </div>
                  <div className="flex items-center gap-[4px]">
                    {selected.replied_at ? (
                      <span className="flex items-center gap-[4px] text-[10px] text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-[12px] h-[12px]" /> {t('crm.inbox.replied')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-[4px] text-[10px] text-blue-600 dark:text-blue-400">
                        <Clock className="w-[12px] h-[12px]" /> {t('crm.inbox.awaiting')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Submitted data */}
              <div className="px-[16px] py-[12px] border-b border-border2 overflow-y-auto max-h-[200px]">
                <p className="text-[10px] text-text3 font-semibold uppercase mb-[6px]">{t('crm.forms.submittedData')}</p>
                {Object.entries(selected.data ?? {}).filter(([k]) => !k.startsWith('_')).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-[8px] mb-[4px]">
                    <span className="text-[11px] text-text3 w-[90px] shrink-0 font-medium">{key}</span>
                    <span className="text-[12px] text-text flex-1 break-all whitespace-pre-wrap">{String(value)}</span>
                  </div>
                ))}
              </div>

              {/* Reply thread */}
              <div className="flex-1 overflow-y-auto px-[16px] py-[12px] space-y-[10px]">
                {replies.length > 0 && (
                  <>
                    <p className="text-[10px] text-text3 font-semibold uppercase">{t('crm.inbox.replyHistory')}</p>
                    {replies.map(r => (
                      <div key={r.id} className="bg-mint-dd/5 border border-mint-dd/20 rounded-[8px] p-[10px]">
                        <div className="flex items-center justify-between mb-[4px]">
                          <span className="text-[11px] font-semibold text-mint-dd">{r.sender?.name ?? 'Staff'}</span>
                          <span className="text-[9px] text-text3">{formatDate(r.sent_at)}</span>
                        </div>
                        <p className="text-[12px] text-text whitespace-pre-wrap">{r.body}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Reply form */}
              <div className="px-[16px] py-[12px] border-t border-border2 bg-surf2/50">
                {!showReplyForm ? (
                  <button onClick={() => setShowReplyForm(true)} className="flex items-center gap-[6px] px-[14px] py-[8px] text-[12px] font-bold text-white bg-mint-dd rounded-[8px] hover:bg-mint-d transition-colors">
                    <Reply className="w-[14px] h-[14px]" /> {t('crm.inbox.reply')}
                  </button>
                ) : (
                  <div className="space-y-[8px]">
                    <div className="flex items-center gap-[6px] text-[11px] text-text2">
                      <Mail className="w-[12px] h-[12px]" />
                      To: {selected.data?.email}
                    </div>
                    <input
                      type="text"
                      value={replySubject}
                      onChange={e => setReplySubject(e.target.value)}
                      placeholder={t('crm.inbox.subject')}
                      className="w-full text-[12px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
                    />
                    <textarea
                      value={replyBody}
                      onChange={e => setReplyBody(e.target.value)}
                      placeholder={t('crm.inbox.replyPlaceholder')}
                      rows={4}
                      className="w-full text-[12px] px-[10px] py-[6px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint resize-y"
                      autoFocus
                    />
                    <div className="flex gap-[6px] justify-end">
                      <button onClick={() => setShowReplyForm(false)} className="px-[12px] py-[6px] text-[12px] text-text2 bg-surface border border-border2 rounded-[6px]">{t('common.cancel')}</button>
                      <button onClick={handleReply} disabled={sending || !replyBody.trim()} className="flex items-center gap-[4px] px-[14px] py-[6px] text-[12px] font-bold text-white bg-mint-dd rounded-[6px] disabled:opacity-50">
                        <Send className="w-[12px] h-[12px]" /> {sending ? '...' : t('crm.inbox.send')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
