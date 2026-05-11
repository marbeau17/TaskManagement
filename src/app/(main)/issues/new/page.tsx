'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/layout'
import { useProjects } from '@/hooks/useProjects'
import { useMembers } from '@/hooks/useMembers'
import { useTasks } from '@/hooks/useTasks'
import { useCreateIssue } from '@/hooks/useIssues'
import { useI18n } from '@/hooks/useI18n'
import type { IssueType, IssueSeverity, CreateIssueData } from '@/types/issue'

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function NewIssuePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const initialProjectId = searchParams.get('project_id') ?? ''

  const { data: projects } = useProjects()
  const { data: members } = useMembers()
  const createIssue = useCreateIssue()

  const [projectId, setProjectId] = useState(initialProjectId)
  const [issueType, setIssueType] = useState<IssueType>('bug')
  const [title, setTitle] = useState('')
  const [severity, setSeverity] = useState<IssueSeverity>('medium')
  const [description, setDescription] = useState('')
  const [reproductionSteps, setReproductionSteps] = useState('')
  const [expectedResult, setExpectedResult] = useState('')
  const [actualResult, setActualResult] = useState('')
  const [environment, setEnvironment] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [taskSearch, setTaskSearch] = useState('')
  const [source, setSource] = useState<'internal' | 'customer'>('internal')
  const [labelsInput, setLabelsInput] = useState('')

  // Fetch tasks belonging to the selected project
  const { data: projectTasks } = useTasks(
    projectId ? { project_id: projectId } : undefined
  )

  const filteredTasks = useMemo(() => {
    if (!projectTasks) return []
    if (!taskSearch.trim()) return projectTasks
    const q = taskSearch.toLowerCase()
    return projectTasks.filter((t) => t.title.toLowerCase().includes(q))
  }, [projectTasks, taskSearch])

  const activeMembers = useMemo(
    () => (members ?? []).filter((m) => m.is_active),
    [members]
  )

  const showBugFields = issueType === 'bug'
  const showIncidentFields = issueType === 'incident'

  const handleSubmit = async () => {
    if (!projectId || !title.trim()) return

    const labels = labelsInput
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean)

    const envObj: Record<string, string> = {}
    if (environment.trim()) {
      environment.split('\n').forEach((line) => {
        const [key, ...val] = line.split(':')
        if (key && val.length > 0) {
          envObj[key.trim()] = val.join(':').trim()
        }
      })
    }

    const data: CreateIssueData = {
      project_id: projectId,
      type: issueType,
      severity,
      title: title.trim(),
      description: description.trim() || undefined,
      reproduction_steps: reproductionSteps.trim() || undefined,
      expected_result: expectedResult.trim() || undefined,
      actual_result: actualResult.trim() || undefined,
      environment: Object.keys(envObj).length > 0 ? envObj : undefined,
      source,
      assigned_to: assigneeId || undefined,
      task_id: taskId || undefined,
      labels: labels.length > 0 ? labels : undefined,
    }

    const created = await createIssue.mutateAsync(data)
    // Jump straight to the detail page so the reporter can attach screenshots / logs
    // (the attachment UI lives there because it needs the issue ID).
    if (created?.id) {
      router.push(`/issues/${created.id}?fresh=1`)
    } else {
      router.push('/issues')
    }
  }

  // よく使われるキーワード — 課題分類を揃えるためのプリセット。
  // 障害管理者として横串集計が効くよう、用語を統一する目的で候補を提示する。
  const SUGGESTED_LABELS = [
    'UI', 'API', 'DB', '認証', 'メール', '通知',
    'パフォーマンス', '表示崩れ', 'クラッシュ', 'モバイル',
    '帳票', '権限', 'インポート', 'エクスポート', 'カレンダー', '添付',
  ]

  const currentLabels = labelsInput
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean)

  const toggleLabel = (label: string) => {
    const set = new Set(currentLabels)
    if (set.has(label)) set.delete(label)
    else set.add(label)
    setLabelsInput(Array.from(set).join(', '))
  }

  return (
    <>
      <Topbar title={t('issues.reportTitle')} />

      <div className="flex-1 overflow-auto p-[20px]">
        <div className="max-w-[680px] mx-auto space-y-6">
          {/* Project selector */}
          <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
            <div className="px-6 py-4 border-b border-wf-border">
              <h2 className="text-[15px] font-bold text-text">{t('issues.basicInfo')}</h2>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Project */}
              <div>
                <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                  {t('issues.project')} <span className="text-danger">*</span>
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                >
                  <option value="">{t('issues.selectPlaceholder')}</option>
                  {(projects ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.key_prefix}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Issue type */}
              <div>
                <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                  {t('issues.issueType')}
                </label>
                <div className="flex gap-[8px]">
                  {([
                    { value: 'bug' as const, labelKey: 'issues.bug', icon: '\uD83D\uDC1B' },
                    { value: 'improvement' as const, labelKey: 'issues.improvement', icon: '\uD83D\uDCA1' },
                    { value: 'question' as const, labelKey: 'issues.question', icon: '\u2753' },
                    { value: 'incident' as const, labelKey: 'issues.incident', icon: '\uD83D\uDD25' },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setIssueType(opt.value)}
                      className={`flex items-center gap-[4px] px-[12px] py-[6px] rounded-[6px] text-[12px] font-semibold border transition-colors ${
                        issueType === opt.value
                          ? 'border-mint bg-mint-ll dark:bg-mint-dd/30 text-mint'
                          : 'border-border2 text-text2 hover:border-text3'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                  {t('issues.titleLabel')} <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('issues.titlePlaceholder')}
                  className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                />
              </div>

              {/* Severity */}
              <div>
                <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                  {t('issues.severityLabel')}
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
                  className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                >
                  <option value="critical">{t('issues.critical')}</option>
                  <option value="high">{t('issues.high')}</option>
                  <option value="medium">{t('issues.medium')}</option>
                  <option value="low">{t('issues.low')}</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                  {t('issues.descriptionLabel')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder={t('issues.descriptionPlaceholder')}
                  className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface placeholder:text-text3 resize-y focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                />
              </div>
            </div>
          </div>

          {/* Bug-specific fields */}
          {(showBugFields || showIncidentFields) && (
            <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
              <div className="px-6 py-4 border-b border-wf-border">
                <h2 className="text-[15px] font-bold text-text">
                  {showBugFields ? t('issues.bugDetails') : t('issues.incidentDetails')}
                </h2>
              </div>
              <div className="px-6 py-5 space-y-5">
                {/* Reproduction steps (bug only) */}
                {showBugFields && (
                  <div>
                    <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                      {t('issues.reproductionStepsLabel')}
                    </label>
                    <textarea
                      value={reproductionSteps}
                      onChange={(e) => setReproductionSteps(e.target.value)}
                      rows={4}
                      placeholder="1. ..."
                      className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface placeholder:text-text3 resize-y focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                    />
                  </div>
                )}

                {/* Expected result (bug only) */}
                {showBugFields && (
                  <div>
                    <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                      {t('issues.expectedResultLabel')}
                    </label>
                    <textarea
                      value={expectedResult}
                      onChange={(e) => setExpectedResult(e.target.value)}
                      rows={2}
                      placeholder={t('issues.expectedResultPlaceholder')}
                      className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface placeholder:text-text3 resize-y focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                    />
                  </div>
                )}

                {/* Actual result */}
                <div>
                  <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                    {t('issues.actualResultLabel')}
                  </label>
                  <textarea
                    value={actualResult}
                    onChange={(e) => setActualResult(e.target.value)}
                    rows={2}
                    placeholder={t('issues.actualResultPlaceholder')}
                    className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface placeholder:text-text3 resize-y focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                  />
                </div>

                {/* Environment */}
                <div>
                  <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                    {t('issues.environmentLabel')}
                  </label>
                  <textarea
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    rows={3}
                    placeholder="OS: macOS 14.0&#10;Browser: Chrome 120&#10;Node: 20.x"
                    className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface placeholder:text-text3 resize-y focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint font-mono"
                  />
                  <p className="text-[10px] text-text3 mt-1">{t('issues.environmentHint')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Additional options */}
          <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
            <div className="px-6 py-4 border-b border-wf-border">
              <h2 className="text-[15px] font-bold text-text">{t('issues.additionalOptions')}</h2>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Assignee */}
              <div>
                <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                  {t('issues.assigneeLabel')}
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                >
                  <option value="">{t('issues.unassigned')}</option>
                  {activeMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Related task */}
              {projectId && (
                <div>
                  <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                    {t('issues.relatedTask')}
                  </label>
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder={t('issues.taskSearchPlaceholder')}
                    className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint mb-1.5"
                  />
                  <select
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                  >
                    <option value="">{t('issues.none')}</option>
                    {filteredTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                  {projectTasks && projectTasks.length === 0 && (
                    <p className="text-[10px] text-text3 mt-1">{t('issues.noTasksInProject')}</p>
                  )}
                </div>
              )}

              {/* Source */}
              <div>
                <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                  {t('issues.sourceLabel')}
                </label>
                <div className="flex gap-[8px]">
                  <button
                    type="button"
                    onClick={() => setSource('internal')}
                    className={`px-[12px] py-[6px] rounded-[6px] text-[12px] font-semibold border transition-colors ${
                      source === 'internal'
                        ? 'border-mint bg-mint-ll dark:bg-mint-dd/30 text-mint'
                        : 'border-border2 text-text2 hover:border-text3'
                    }`}
                  >
                    {t('issues.sourceInternal')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSource('customer')}
                    className={`px-[12px] py-[6px] rounded-[6px] text-[12px] font-semibold border transition-colors ${
                      source === 'customer'
                        ? 'border-mint bg-mint-ll dark:bg-mint-dd/30 text-mint'
                        : 'border-border2 text-text2 hover:border-text3'
                    }`}
                  >
                    {t('issues.sourceCustomer')}
                  </button>
                </div>
              </div>

              {/* Labels with suggested chips — 集計時に表記揺れを抑えるための候補。 */}
              <div>
                <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                  {t('issues.labelsLabel')}
                </label>
                <input
                  type="text"
                  value={labelsInput}
                  onChange={(e) => setLabelsInput(e.target.value)}
                  placeholder={t('issues.labelsPlaceholder')}
                  className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUGGESTED_LABELS.map((label) => {
                    const active = currentLabels.includes(label)
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleLabel(label)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                          active
                            ? 'bg-mint text-white border-mint'
                            : 'bg-surf2 text-text2 border-wf-border hover:border-mint hover:text-mint'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}{label}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] text-text3 mt-1.5">
                  クリックで候補を追加 / 解除。手入力 (カンマ区切り) も可能。
                </p>
              </div>

              {/* Attachment hint — uploads happen on the detail page after create. */}
              <div className="rounded-lg border border-dashed border-wf-border bg-surf2/40 px-3 py-2.5 text-[11.5px] text-text2 flex items-start gap-2">
                <span className="text-[14px]">📎</span>
                <span>
                  <strong className="text-text">スクリーンショット / ログの添付</strong> は
                  起票直後に表示される課題詳細画面から行えます。再現画面のキャプチャや
                  エラーログを添付すると、担当者の調査が早くなります。
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pb-[20px]">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2 rounded-lg text-[13px] font-semibold text-text2 bg-surf2 border border-wf-border hover:bg-wf-border transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createIssue.isPending || !projectId || !title.trim()}
              className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white bg-mint hover:bg-mint-d transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createIssue.isPending ? t('issues.submitting') : t('issues.submit')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
