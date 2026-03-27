'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useIssueRelations, useAddIssueRelation, useRemoveIssueRelation } from '@/hooks/useRelations'
import { useIssues } from '@/hooks/useIssues'
import { IssueStatusBadge } from '@/components/shared'
import { useI18n } from '@/hooks/useI18n'
import type { RelationType, IssueRelation } from '@/types/relation'

// ---------------------------------------------------------------------------
// Relation type config
// ---------------------------------------------------------------------------

const RELATION_TYPE_KEYS: Record<RelationType, { labelKey: string; icon: string }> = {
  blocks: { labelKey: 'issues.relationBlocks', icon: '\u26D4' },
  is_blocked_by: { labelKey: 'issues.relationBlockedBy', icon: '\u23F3' },
  relates_to: { labelKey: 'issues.relationRelatesTo', icon: '\uD83D\uDD17' },
  duplicates: { labelKey: 'issues.relationDuplicates', icon: '\uD83D\uDCC4' },
}

const RELATION_TYPES: RelationType[] = ['blocks', 'is_blocked_by', 'relates_to', 'duplicates']

// ---------------------------------------------------------------------------
// IssueRelations component
// ---------------------------------------------------------------------------

interface IssueRelationsProps {
  issueId: string
}

export function IssueRelations({ issueId }: IssueRelationsProps) {
  const { t } = useI18n()
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
        <h3 className="text-[13px] font-bold text-text">{t('issues.relatedIssues')}</h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="text-[12px] font-bold text-mint hover:text-mint-d transition-colors"
        >
          {showForm ? t('common.cancel') : t('issues.addRelation')}
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
            {RELATION_TYPES.map((rt) => (
              <option key={rt} value={rt}>
                {RELATION_TYPE_KEYS[rt].icon} {t(RELATION_TYPE_KEYS[rt].labelKey)}
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
              placeholder={t('issues.searchIssuePlaceholder')}
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
            {addRelation.isPending ? t('issues.adding') : t('common.add')}
          </button>
        </div>
      )}

      {/* Relations list */}
      {isLoading && <p className="text-[12px] text-text3">{t('common.loading')}</p>}

      {relations && relations.length === 0 && !showForm && (
        <p className="text-[12px] text-text3">{t('issues.noRelatedIssues')}</p>
      )}

      {relations && relations.length > 0 && (
        <div className="space-y-1.5">
          {relations.map((relation) => {
            const { issue, type } = getLinkedIssue(relation)
            if (!issue) return null
            const config = RELATION_TYPE_KEYS[type]
            return (
              <div
                key={relation.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surf2 transition-colors group"
              >
                <span className="text-[12px] shrink-0" title={t(config.labelKey)}>
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
                  title={t('common.delete')}
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
