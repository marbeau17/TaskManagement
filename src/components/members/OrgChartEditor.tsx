'use client'

import { useState, useEffect } from 'react'
import { toast } from '@/stores/toastStore'
import type { OrgNodeData } from './OrgChart'

const THEMES = [
  'navy', 'slate', 'blue', 'blue-light', 'green',
  'gold', 'gold-light', 'red', 'red-light', 'orange-light',
]

const THEME_PREVIEW: Record<string, string> = {
  'navy': 'bg-[#1e325c] text-white',
  'slate': 'bg-[#3b4c6b] text-white',
  'blue': 'bg-[#4a72b2] text-white',
  'blue-light': 'bg-[#eff6ff] text-[#4a72b2] border border-[#4a72b2]',
  'green': 'bg-[#5b8045] text-white',
  'gold': 'bg-[#b8860b] text-white',
  'gold-light': 'bg-[#fffbeb] text-[#b8860b] border border-[#b8860b]',
  'red': 'bg-[#a32a2a] text-white',
  'red-light': 'bg-[#fef2f2] text-[#a32a2a] border border-[#a32a2a]',
  'orange-light': 'bg-[#fff7ed] text-[#ea580c] border border-[#ea580c]',
}

function NodeEditor({
  node,
  path,
  onChange,
  onDelete,
  onAddChild,
}: {
  node: OrgNodeData
  path: number[]
  onChange: (path: number[], updates: Partial<OrgNodeData>) => void
  onDelete: (path: number[]) => void
  onAddChild: (path: number[]) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const indent = path.length * 16

  return (
    <div className="mb-2">
      <div style={{ marginLeft: indent }} className="flex items-center gap-2 p-2 bg-surf2/50 rounded-lg border border-border2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-text3 hover:text-mint text-xs w-4"
          disabled={!node.children || node.children.length === 0}
        >
          {node.children && node.children.length > 0 ? (expanded ? '▼' : '▶') : '•'}
        </button>
        <input
          type="text"
          value={node.role}
          onChange={(e) => onChange(path, { role: e.target.value })}
          placeholder="役職名"
          className="flex-1 min-w-[120px] px-2 py-1 text-xs rounded border border-wf-border bg-surface text-text focus:outline-none focus:border-mint"
        />
        <input
          type="text"
          value={node.name ?? ''}
          onChange={(e) => onChange(path, { name: e.target.value || undefined })}
          placeholder="氏名"
          className="flex-1 min-w-[100px] px-2 py-1 text-xs rounded border border-wf-border bg-surface text-text focus:outline-none focus:border-mint"
        />
        <select
          value={node.theme ?? ''}
          onChange={(e) => onChange(path, { theme: e.target.value || undefined })}
          className={`text-xs px-2 py-1 rounded border border-wf-border focus:outline-none focus:border-mint ${node.theme ? THEME_PREVIEW[node.theme] : 'bg-surface text-text'}`}
        >
          <option value="" className="bg-surface text-text">(theme)</option>
          {THEMES.map(th => (
            <option key={th} value={th} className="bg-surface text-text">{th}</option>
          ))}
        </select>
        <button
          onClick={() => onAddChild(path)}
          className="text-[10px] px-2 py-1 rounded bg-mint/10 text-mint hover:bg-mint hover:text-white transition-colors"
          title="子を追加"
        >
          + 子
        </button>
        {path.length > 0 && (
          <button
            onClick={() => onDelete(path)}
            className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
            title="削除"
          >
            ✕
          </button>
        )}
      </div>
      {expanded && node.children && node.children.length > 0 && (
        <div className="mt-2">
          {node.children.map((child, i) => (
            <NodeEditor
              key={i}
              node={child}
              path={[...path, i]}
              onChange={onChange}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function OrgChartEditor({ onClose }: { onClose?: () => void }) {
  const [orgData, setOrgData] = useState<OrgNodeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/org-chart')
      .then(r => r.ok ? r.json() : null)
      .then(data => setOrgData(data || { role: 'ROOT', theme: 'navy', children: [] }))
      .finally(() => setLoading(false))
  }, [])

  const updateAtPath = (path: number[], updates: Partial<OrgNodeData>) => {
    if (!orgData) return
    const clone = JSON.parse(JSON.stringify(orgData)) as OrgNodeData
    let node: OrgNodeData = clone
    for (const i of path) {
      node = node.children![i]
    }
    Object.assign(node, updates)
    setOrgData(clone)
  }

  const deleteAtPath = (path: number[]) => {
    if (!orgData || path.length === 0) return
    if (!confirm('このノードとその配下をすべて削除しますか？')) return
    const clone = JSON.parse(JSON.stringify(orgData)) as OrgNodeData
    let parent: OrgNodeData = clone
    for (let i = 0; i < path.length - 1; i++) {
      parent = parent.children![path[i]]
    }
    parent.children!.splice(path[path.length - 1], 1)
    setOrgData(clone)
  }

  const addChildAtPath = (path: number[]) => {
    if (!orgData) return
    const clone = JSON.parse(JSON.stringify(orgData)) as OrgNodeData
    let node: OrgNodeData = clone
    for (const i of path) {
      node = node.children![i]
    }
    if (!node.children) node.children = []
    node.children.push({ role: '新規', theme: 'gold-light' })
    setOrgData(clone)
  }

  const handleSave = async () => {
    if (!orgData) return
    setSaving(true)
    try {
      const res = await fetch('/api/org-chart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgData),
      })
      if (res.ok) {
        toast.success('組織図を保存しました')
        onClose?.()
      } else {
        const err = await res.json()
        toast.error(err.error || '保存に失敗しました')
      }
    } catch {
      toast.error('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-text3 text-xs">読み込み中...</div>
  if (!orgData) return <div className="p-6 text-center text-text3 text-xs">データなし</div>

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text">組織図エディター</h3>
        <div className="flex gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-md border border-wf-border text-text2 hover:bg-surf2"
            >
              キャンセル
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-4 py-1.5 rounded-md bg-mint text-white font-semibold hover:bg-mint-d disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
      <div className="text-[10px] text-text3">役職名・氏名・カラーテーマを編集できます。「+子」で部下ノード追加、✕で削除。</div>
      <div className="bg-surface border border-border2 rounded-lg p-3 max-h-[70vh] overflow-y-auto">
        <NodeEditor
          node={orgData}
          path={[]}
          onChange={updateAtPath}
          onDelete={deleteAtPath}
          onAddChild={addChildAtPath}
        />
      </div>
    </div>
  )
}
