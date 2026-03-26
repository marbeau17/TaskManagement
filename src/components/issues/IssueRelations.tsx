'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useIssueRelations, useAddIssueRelation, useRemoveIssueRelation } from '@/hooks/useRelations'
import { useIssues } from '@/hooks/useIssues'
import { IssueStatusBadge } from '@/components/shared'
import type { RelationType, IssueRelation } from '@/types/relation'

// ---------------------------------------------------------------------------
// Relation type config
// ---------------------------------------------------------------------------

const RELATION_TYPE_CONFIG: Record<RelationType, { label: string; icon: string }> = {
  blocks: { label: 'ブロック', icon: '\u26D4' },
  is_blocked_by: { label: 'ブロックされている', icon: '\u23F3' },
  relates_to: { label: '関連', icon: '\uD83D\uDD17' },
  duplicates: { label: '重複', icon: '\uD83D\uDCC4' },
}

const RELATION_TYPES: RelationType[] = ['blocks', 'is_blocked_by', 'relates_to', 'duplicates']

// ---------------------------------------------------------------------------
// IssueRelations component
// ---------------------------------------------------------------------------

interface IssueRelationsProps {
  issueId: string
}

export function IssueRelations({ issueId }: IssueRelationsProps) {
  const { data: relations, isLoading } = useIssueRelations(issueId)
  const addRelation = useAddIssueRelation()
  const removeRelation = useRemoveIssueRelation()

  const [showForm, setShowForm] = useState(false)
  const [relationType, setRelationType] = useState<RelationType>('relates_to')
  const [searchText, setSearchText] = useState('')
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch all issues for autocomplete
  const { data: allIssues } = useIssues()

  // Filter suggestions
  const suggestions = (allIssues ?? []).filter((issue) => {
    if (issue.id === issueId) return false
    if (!searchText) return false
    const q = searchText.toLowerCase()
    return (
      issue.issue_key.toLowerCase().includes(q) ||
      issue.title.toLowerCase().includes(q)
    )
  }).slice(0, 8)

  const handleAdd = () => {
    if (!selectedIssueId) return
    addRelation.mutate(
      { sourceId: issueId, targetId: selectedIssueId, type: relationType },
      {
        onSuccess: () => {
          setSearchText('')
          setSelectedIssueId(null)
          setShowForm(false)
        },
      }
    )
  }

  const handleRemove = (relationId: string) => {
    removeRelation.mutate({ id: relationId, issueId })
  }

  // Determine which issue to show for each relation row
  const getLinkedIssue = (relation: IssueRelation) => {
    if (relation.source_issue_id === issueId) {
      return {
        issue: relation.target_issue,
        type: relation.relation_type,
      }
    }
    // If this issue is the target, invert the relation label
    const invertedType: RelationType =
      relation.relation_type === 'blocks'
        ? 'is_blocked_by'
        : relation.relation_type === 'is_blocked_by'
          ? 'blocks'
          : relation.relation_type
    return {
      issue: relation.source_issue,
      type: invertedType,
    }
  }

  // Close suggestions on click outside
  const wrapperRef = useRef<HTMLDivElement>(null)
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
      setShowSuggestions(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-text">関連課題</h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="text-[12px] font-bold text-mint hover:text-mint-d transition-colors"
        >
          {showForm ? 'キャンセル' : '+ 関連追加'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-4 p-3 bg-surf2 rounded-md border border-border2 space-y-2">
          {/* Relation type select */}
          <select
            value={relationType}
            onChange={(e) => setRelationType(e.target.value as RelationType)}
            className="w-full border border-wf-border rounded-md px-2 py-1.5 text-[12px] text-text bg-surface focus:outline-none focus:border-mint"
          >
            {RELATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {RELATION_TYPE_CONFIG[t].icon} {RELATION_TYPE_CONFIG[t].label}
              </option>
            ))}
          </select>

          {/* Issue search */}
          <div className="relative" ref={wrapperRef}>
            <input
              ref={inputRef}
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value)
                setSelectedIssueId(null)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="課題キーまたはタイトルで検索..."
              className="w-full border border-wf-border rounded-md px-2 py-1.5 text-[12px] text-text bg-surface focus:outline-none focus:border-mint"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border2 rounded-md shadow-lg z-20 max-h-[180px] overflow-y-auto">
                {suggestions.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => {
                      setSelectedIssueId(issue.id)
                      setSearchText(`${issue.issue_key} ${issue.title}`)
                      setShowSuggestions(false)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-surf2 transition-colors flex items-center gap-2"
                  >
                    <span className="text-[11px] font-mono text-mint font-semibold shrink-0">
                      {issue.issue_key}
                    </span>
                    <span className="text-[11px] text-text truncate">{issue.title}</span>
                    <IssueStatusBadge status={issue.status} size="sm" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add button */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedIssueId || addRelation.isPending}
            className="w-full py-1.5 rounded-md text-[12px] font-bold bg-mint text-white hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {addRelation.isPending ? '追加中...' : '追加'}
          </button>
        </div>
      )}

      {/* Relations list */}
      {isLoading && <p className="text-[12px] text-text3">読み込み中...</p>}

      {relations && relations.length === 0 && !showForm && (
        <p className="text-[12px] text-text3">関連課題はまだありません</p>
      )}

      {relations && relations.length > 0 && (
        <div className="space-y-1.5">
          {relations.map((relation) => {
            const { issue, type } = getLinkedIssue(relation)
            if (!issue) return null
            const config = RELATION_TYPE_CONFIG[type]
            return (
              <div
                key={relation.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surf2 transition-colors group"
              >
                <span className="text-[12px] shrink-0" title={config.label}>
                  {config.icon}
                </span>
                <span className="text-[11px] font-mono text-mint font-semibold shrink-0">
                  {issue.issue_key}
                </span>
                <span className="text-[11px] text-text truncate flex-1">
                  {issue.title}
                </span>
                <IssueStatusBadge status={issue.status as any} size="sm" />
                <button
                  type="button"
                  onClick={() => handleRemove(relation.id)}
                  disabled={removeRelation.isPending}
                  className="text-[14px] text-text3 hover:text-danger transition-colors opacity-0 group-hover:opacity-100 leading-none px-1"
                  title="削除"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
