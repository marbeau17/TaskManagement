'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Sparkles } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

interface ReleaseNote {
  id: string
  title: string
  content_html: string
  published_at: string
}

const DISMISSED_KEY = 'workflow-dismissed-releases'

function getDismissed(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')
  } catch {
    return []
  }
}

function setDismissed(ids: string[]) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-50)))
}

export function ReleaseNoteBanner() {
  const { t } = useI18n()
  const [notes, setNotes] = useState<ReleaseNote[]>([])
  const [dismissed, setDismissedState] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setDismissedState(getDismissed())
    fetch('/api/news?category=release')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) setNotes(data.slice(0, 3))
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const handleDismiss = (id: string) => {
    const updated = [...dismissed, id]
    setDismissedState(updated)
    setDismissed(updated)
  }

  const visible = notes.filter(n => !dismissed.includes(n.id))

  if (!loaded || visible.length === 0) return null

  return (
    <div data-testid="release-note-banner" className="flex flex-col gap-[8px]">
      {visible.map(note => {
        // Strip HTML tags for preview
        const preview = note.content_html
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120)

        return (
          <div
            key={note.id}
            className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-200 dark:border-indigo-700 rounded-[10px] shadow-sm overflow-hidden"
          >
            <div className="flex items-start gap-[10px] px-[14px] py-[10px]">
              <Sparkles className="w-[16px] h-[16px] text-indigo-500 dark:text-indigo-400 shrink-0 mt-[2px]" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[6px] mb-[2px]">
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-500 text-white px-[6px] py-[1px] rounded-full">
                    NEW
                  </span>
                  <Link
                    href="/news"
                    className="text-[12.5px] font-bold text-text hover:text-indigo-600 dark:hover:text-indigo-400 no-underline truncate"
                  >
                    {note.title}
                  </Link>
                </div>
                {preview && (
                  <p className="text-[11px] text-text2 line-clamp-1">{preview}...</p>
                )}
              </div>
              <button
                onClick={() => handleDismiss(note.id)}
                className="p-[4px] rounded-[4px] text-text3 hover:text-text hover:bg-white/50 dark:hover:bg-white/10 transition-colors shrink-0"
                title={t('common.close') ?? 'Close'}
              >
                <X className="w-[14px] h-[14px]" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
