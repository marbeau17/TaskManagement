'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout'
import { Avatar } from '@/components/shared'
import { useI18n } from '@/hooks/useI18n'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/stores/toastStore'
import { formatDate } from '@/lib/utils'

interface NewsArticle {
  id: string
  title: string
  content_html: string
  category: string
  author_id: string | null
  published_at: string
  updated_at: string
  author?: { name: string; name_short: string; avatar_color: string } | null
}

const CATEGORY_STYLES: Record<string, string> = {
  general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  release: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400',
  important: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
}

export default function NewsPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<NewsArticle | null>(null)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [articleCategory, setArticleCategory] = useState('general')

  const isAdmin = user?.role === 'admin' || user?.role === 'director'
  const canEdit = (article: NewsArticle) => isAdmin || article.author_id === user?.id

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch('/api/news')
      if (res.ok) setArticles(await res.json())
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchArticles() }, [fetchArticles])

  const handleSave = async () => {
    if (!title.trim()) { toast.error('タイトルを入力してください'); return }
    try {
      if (editing) {
        const res = await fetch(`/api/news/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content_html: contentHtml, category: articleCategory }),
        })
        if (res.ok) { toast.success('更新しました'); await fetchArticles() }
        else toast.error('更新に失敗しました')
      } else {
        const res = await fetch('/api/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content_html: contentHtml, category: articleCategory, author_id: user?.id }),
        })
        if (res.ok) { toast.success('投稿しました'); await fetchArticles() }
        else toast.error('投稿に失敗しました')
      }
      setEditing(null); setCreating(false); setTitle(''); setContentHtml('')
    } catch { toast.error('エラーが発生しました') }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('この記事を削除しますか？')) return
    const res = await fetch(`/api/news/${id}`, { method: 'DELETE' }).catch(() => null)
    if (res?.ok) { toast.success('削除しました'); setArticles((p) => p.filter((a) => a.id !== id)) }
    else toast.error('削除に失敗しました')
  }

  const startEdit = (article: NewsArticle) => {
    setEditing(article); setCreating(true)
    setTitle(article.title); setContentHtml(article.content_html)
    setArticleCategory(article.category || 'general')
  }

  const startCreate = () => {
    setEditing(null); setCreating(true)
    setTitle(''); setContentHtml('')
    setArticleCategory('general')
  }

  return (
    <>
      <Topbar title={t('news.title')}>
        {isAdmin && !creating && (
          <button onClick={startCreate}
            className="h-[30px] px-[12px] rounded-[6px] text-[12px] font-bold bg-mint text-white hover:bg-mint-d transition-colors">
            {t('news.newArticle')}
          </button>
        )}
      </Topbar>

      <div className="p-[12px] md:p-[20px]">
        {/* Category Tabs */}
        <div className="flex items-center gap-[4px] mb-[16px] border-b border-border2 pb-[1px]">
          {[
            { id: 'all', label: t('news.tab.all') },
            { id: 'release', label: t('news.tab.release') },
            { id: 'important', label: t('news.tab.important') },
            { id: 'maintenance', label: t('news.tab.maintenance') },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-[14px] py-[7px] text-[12px] font-semibold rounded-t-[8px] transition-colors ${
                activeTab === tab.id
                  ? 'bg-surface text-mint-dd border border-border2 border-b-surface -mb-[1px]'
                  : 'text-text2 hover:text-text hover:bg-surf2'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Editor */}
        {creating && isAdmin && (
          <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow mb-[16px]">
            <h3 className="text-[14px] font-bold text-text mb-[12px]">
              {editing ? t('news.editArticle') : t('news.newArticle')}
            </h3>
            <div className="space-y-[10px]">
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder={t('news.titlePlaceholder')}
                className="w-full text-[14px] text-text px-[10px] py-[8px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint font-bold"
              />
              <select
                value={articleCategory}
                onChange={(e) => setArticleCategory(e.target.value)}
                className="w-full text-[13px] text-text px-[10px] py-[8px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              >
                <option value="general">{t('news.category.general')}</option>
                <option value="release">{t('news.category.release')}</option>
                <option value="important">{t('news.category.important')}</option>
                <option value="maintenance">{t('news.category.maintenance')}</option>
              </select>
              <textarea
                value={contentHtml} onChange={(e) => setContentHtml(e.target.value)}
                placeholder={t('news.contentPlaceholder')}
                rows={10}
                className="w-full text-[13px] text-text px-[10px] py-[8px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint font-mono resize-y"
              />
              <p className="text-[10px] text-text3">{t('news.htmlHint')}</p>
              {contentHtml && (
                <div className="border border-border2 rounded-[6px] p-[12px]">
                  <p className="text-[10px] text-text3 mb-[6px] font-semibold">{t('news.preview')}</p>
                  {contentHtml.includes('<!DOCTYPE') || contentHtml.includes('<html') ? (
                    <iframe
                      srcDoc={contentHtml}
                      className="w-full border-0 rounded"
                      style={{ minHeight: '400px' }}
                      sandbox="allow-scripts allow-same-origin"
                    />
                  ) : (
                    <div className="text-[13px] text-text prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: contentHtml }} />
                  )}
                </div>
              )}
              <div className="flex gap-[8px] justify-end">
                <button onClick={() => { setCreating(false); setEditing(null) }}
                  className="px-[14px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors">
                  {t('common.cancel')}
                </button>
                <button onClick={handleSave}
                  className="px-[14px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-bold">
                  {editing ? t('news.update') : t('news.publish')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Article List */}
        {(() => {
          const filteredArticles = activeTab === 'all'
            ? articles
            : articles.filter(a => a.category === activeTab)
          return loading ? (
          <div className="text-center py-[40px] text-[13px] text-text3">{t('common.loading')}</div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-[40px] text-[13px] text-text3">{t('news.noArticles')}</div>
        ) : (
          <div className="space-y-[16px]">
            {filteredArticles.map((article) => (
              <div key={article.id} className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
                <div className="px-[16px] py-[12px] border-b border-border2 bg-surf2/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-[6px]">
                      <span className={`text-[9px] font-bold px-[6px] py-[1px] rounded-full ${CATEGORY_STYLES[article.category] ?? CATEGORY_STYLES.general}`}>
                        {t(`news.category.${article.category}`) || article.category}
                      </span>
                      <h2 className="text-[15px] font-bold text-text">{article.title}</h2>
                    </div>
                    {canEdit(article) && (
                      <div className="flex gap-[6px]">
                        <button onClick={() => startEdit(article)} className="text-[11px] text-mint hover:text-mint-d font-medium">{t('common.edit')}</button>
                        <button onClick={() => handleDelete(article.id)} className="text-[11px] text-danger hover:opacity-80 font-medium">{t('common.delete')}</button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-[6px] mt-[4px]">
                    {article.author && (
                      <Avatar name_short={article.author.name_short} color={article.author.avatar_color as any} avatar_url={(article.author as any).avatar_url} size="sm" />
                    )}
                    <span className="text-[11px] text-text2">{article.author?.name ?? ''}</span>
                    <span className="text-[10px] text-text3 ml-auto">{formatDate(article.published_at)}</span>
                  </div>
                </div>
                <div className="px-[16px] py-[14px]">
                  {article.content_html.includes('<!DOCTYPE') || article.content_html.includes('<html') ? (
                    <iframe
                      srcDoc={article.content_html}
                      className="w-full border-0 rounded"
                      style={{ minHeight: '80vh' }}
                      sandbox="allow-scripts allow-same-origin allow-popups"
                      onLoad={(e) => {
                        const iframe = e.target as HTMLIFrameElement
                        if (iframe.contentDocument) {
                          iframe.style.height = iframe.contentDocument.documentElement.scrollHeight + 'px'
                        }
                      }}
                    />
                  ) : (
                    <div className="text-[13px] text-text leading-relaxed" dangerouslySetInnerHTML={{ __html: article.content_html }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )
        })()}
      </div>
    </>
  )
}
