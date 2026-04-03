'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Building2, User, Target, DollarSign } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

interface SearchResults {
  companies: { id: string; name: string; industry: string }[]
  contacts: { id: string; first_name: string; last_name: string; email: string; company?: { name: string } }[]
  leads: { id: string; title: string; status: string }[]
  deals: { id: string; title: string; stage: string; amount: number }[]
}

interface Props {
  onSelect?: (entityType: string, entity: any) => void
}

export function CrmGlobalSearch({ onSelect }: Props) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (query.length < 2) { setResults(null); setOpen(false); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/crm/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
          setOpen(true)
        }
      } catch {}
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const totalResults = results
    ? results.companies.length + results.contacts.length + results.leads.length + results.deals.length
    : 0

  return (
    <div ref={ref} className="relative w-full max-w-[400px]">
      <div className="relative">
        <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-text3" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results && setOpen(true)}
          placeholder={t('crm.search.placeholder')}
          className="w-full pl-[32px] pr-[10px] py-[7px] text-[12px] bg-surface border border-border2 rounded-[8px] outline-none focus:border-mint"
        />
      </div>

      {open && results && totalResults > 0 && (
        <div className="absolute top-full mt-[4px] w-full bg-surface border border-border2 rounded-[10px] shadow-xl z-50 max-h-[400px] overflow-y-auto">
          {results.companies.length > 0 && (
            <Section icon={Building2} title={t('crm.companies')} color="text-blue-500">
              {results.companies.map(c => (
                <ResultRow key={c.id} onClick={() => { onSelect?.('company', c); setOpen(false) }}>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-text3 ml-auto">{c.industry}</span>
                </ResultRow>
              ))}
            </Section>
          )}
          {results.contacts.length > 0 && (
            <Section icon={User} title={t('crm.contacts')} color="text-emerald-500">
              {results.contacts.map(c => (
                <ResultRow key={c.id} onClick={() => { onSelect?.('contact', c); setOpen(false) }}>
                  <span className="font-medium">{c.last_name} {c.first_name}</span>
                  <span className="text-text3 ml-auto">{c.email}</span>
                </ResultRow>
              ))}
            </Section>
          )}
          {results.leads.length > 0 && (
            <Section icon={Target} title={t('crm.leads')} color="text-purple-500">
              {results.leads.map(l => (
                <ResultRow key={l.id} onClick={() => { onSelect?.('lead', l); setOpen(false) }}>
                  <span className="font-medium">{l.title}</span>
                  <span className="text-text3 ml-auto capitalize">{l.status}</span>
                </ResultRow>
              ))}
            </Section>
          )}
          {results.deals.length > 0 && (
            <Section icon={DollarSign} title={t('crm.deals')} color="text-amber-500">
              {results.deals.map(d => (
                <ResultRow key={d.id} onClick={() => { onSelect?.('deal', d); setOpen(false) }}>
                  <span className="font-medium">{d.title}</span>
                  <span className="text-text3 ml-auto">¥{(d.amount ?? 0).toLocaleString()}</span>
                </ResultRow>
              ))}
            </Section>
          )}
        </div>
      )}

      {open && results && totalResults === 0 && query.length >= 2 && (
        <div className="absolute top-full mt-[4px] w-full bg-surface border border-border2 rounded-[10px] shadow-xl z-50 p-[16px] text-center text-[12px] text-text3">
          {t('crm.search.noResults')}
        </div>
      )}
    </div>
  )
}

function Section({ icon: Icon, title, color, children }: { icon: any; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border2 last:border-b-0">
      <div className="flex items-center gap-[6px] px-[12px] py-[6px] bg-surf2">
        <Icon className={`w-[12px] h-[12px] ${color}`} />
        <span className="text-[10px] font-bold text-text2 uppercase">{title}</span>
      </div>
      {children}
    </div>
  )
}

function ResultRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-[8px] px-[12px] py-[8px] text-[12px] text-text hover:bg-surf2 transition-colors text-left">
      {children}
    </button>
  )
}
