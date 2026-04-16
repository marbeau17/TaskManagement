'use client'

import { useEffect, useState } from 'react'
import type { User } from '@/types/database'
import { useI18n } from '@/hooks/useI18n'
import { Avatar } from '@/components/shared/Avatar'

// Org node type matching docs/org.html
export interface OrgNodeData {
  role: string
  name?: string
  theme?: string
  children?: OrgNodeData[]
}

// Theme colors matching docs/org.html
const THEME_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'navy':        { bg: 'bg-[#1e325c]', text: 'text-white',        border: 'border-[#1e325c]' },
  'slate':       { bg: 'bg-[#3b4c6b]', text: 'text-white',        border: 'border-[#3b4c6b]' },
  'blue':        { bg: 'bg-[#4a72b2]', text: 'text-white',        border: 'border-[#4a72b2]' },
  'blue-light':  { bg: 'bg-[#eff6ff]', text: 'text-[#4a72b2]',    border: 'border-[#4a72b2]' },
  'green':       { bg: 'bg-[#5b8045]', text: 'text-white',        border: 'border-[#5b8045]' },
  'gold':        { bg: 'bg-[#b8860b]', text: 'text-white',        border: 'border-[#b8860b]' },
  'gold-light':  { bg: 'bg-[#fffbeb]', text: 'text-[#b8860b]',    border: 'border-[#b8860b]' },
  'red':         { bg: 'bg-[#a32a2a]', text: 'text-white',        border: 'border-[#a32a2a]' },
  'red-light':   { bg: 'bg-[#fef2f2]', text: 'text-[#a32a2a]',    border: 'border-[#a32a2a]' },
  'orange-light':{ bg: 'bg-[#fff7ed]', text: 'text-[#ea580c]',    border: 'border-[#ea580c]' },
}

function NodeCard({ node, user }: { node: OrgNodeData; user?: User }) {
  const styles = THEME_STYLES[node.theme || ''] || { bg: 'bg-white', text: 'text-gray-800', border: 'border-gray-300' }
  return (
    <div className={`relative flex flex-col items-center justify-center min-w-[130px] max-w-[160px] p-2 rounded-lg border-2 shadow-sm z-10 transition-transform hover:-translate-y-1 hover:shadow-md ${styles.bg} ${styles.text} ${styles.border}`}>
      <div className="text-[0.75rem] font-bold text-center whitespace-pre-wrap leading-tight mb-1">
        {node.role}
      </div>
      {node.name && (
        <div className="flex flex-col items-center gap-1 mt-1">
          {user && (
            <Avatar
              name_short={user.name_short}
              color={user.avatar_color}
              avatar_url={user.avatar_url}
              size="sm"
            />
          )}
          <div className="text-[0.8rem] text-center">
            {node.name}
          </div>
        </div>
      )}
    </div>
  )
}

function findMatchingUser(name: string, members: User[]): User | undefined {
  const exact = members.find(u => u.name === name)
  if (exact) return exact
  const partial = members.find(u => u.name?.includes(name) || name.includes(u.name ?? ''))
  if (partial) return partial
  const nameWords = new Set(name.toLowerCase().split(/\s+/))
  return members.find(u => {
    if (!u.name) return false
    const userWords = u.name.toLowerCase().split(/\s+/)
    return userWords.length > 0 && userWords.every(w => nameWords.has(w))
  })
}

function OrgTreeNode({ node, members }: { node: OrgNodeData; members: User[] }) {
  const user = node.name ? findMatchingUser(node.name, members) : undefined
  return (
    <li>
      <NodeCard node={node} user={user} />
      {node.children && node.children.length > 0 && (
        <ul>
          {node.children.map((child, index) => (
            <OrgTreeNode key={index} node={child} members={members} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function OrgChart({ members = [] }: { members?: User[] }) {
  const { t } = useI18n()
  const [orgData, setOrgData] = useState<OrgNodeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/org-chart')
      .then(r => r.ok ? r.json() : null)
      .then(data => setOrgData(data))
      .catch(() => setOrgData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center py-[40px] text-[12px] text-text3">読み込み中...</div>
  }

  if (!orgData) {
    return (
      <div className="flex items-center justify-center py-[40px] text-[12px] text-text3">
        {t('members.orgChartEmpty')}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="w-full mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#1e325c] tracking-wider mb-2">
            Meets Consulting <span className="text-lg md:text-xl font-normal text-gray-500">組織図</span>
          </h1>
          <p className="text-xs md:text-sm text-gray-500">最新名簿 反映版</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-2 md:p-4">
          <div className="org-tree overflow-x-auto" style={{ padding: '20px', paddingBottom: '60px' }}>
            <div className="inline-block min-w-full">
              <ul className="org-tree-ul">
                <OrgTreeNode node={orgData} members={members} />
              </ul>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .org-tree ul {
          padding-top: 20px;
          position: relative;
          display: flex;
          justify-content: center;
          margin: 0;
          padding-left: 0;
        }
        .org-tree li {
          text-align: center;
          list-style-type: none;
          position: relative;
          padding: 20px 4px 0 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .org-tree ul::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 2px solid #94a3b8;
          width: 0;
          height: 20px;
          transform: translateX(-50%);
        }
        .org-tree li::before, .org-tree li::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          border-top: 2px solid #94a3b8;
          width: 50%;
          height: 20px;
        }
        .org-tree li::after {
          right: auto;
          left: 50%;
          border-left: 2px solid #94a3b8;
        }
        .org-tree li:only-child::after, .org-tree li:only-child::before {
          display: none;
        }
        .org-tree li:only-child {
          padding-top: 0;
        }
        .org-tree li:first-child::before, .org-tree li:last-child::after {
          border: 0 none;
        }
        .org-tree li:last-child::before {
          border-right: 2px solid #94a3b8;
          border-radius: 0 4px 0 0;
        }
        .org-tree li:first-child::after {
          border-radius: 4px 0 0 0;
        }
      `}</style>
    </div>
  )
}
