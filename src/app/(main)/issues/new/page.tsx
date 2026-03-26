'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/layout'
import { useProjects } from '@/hooks/useProjects'
import { useMembers } from '@/hooks/useMembers'
import { useTasks } from '@/hooks/useTasks'
import { useCreateIssue } from '@/hooks/useIssues'
import type { IssueType, IssueSeverity, CreateIssueData } from '@/types/issue'

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function NewIssuePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

    await createIssue.mutateAsync(data)
    router.push('/issues')
  }

  return (
    <>
      <Topbar title="課題報告" />

      <div className="flex-1 overflow-auto p-[20px]">
        <div className="max-w-[680px] mx-auto space-y-6">
          {/* Project selector */}
          <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
            <div className="px-6 py-4 border-b border-wf-border">
              <h2 className="text-[15px] font-bold text-text">基本情報</h2>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Project */}
              <div>
                <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                  プロジェクト <span className="text-danger">*</span>
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                >
                  <option value="">選択してください</option>
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
                  課題タイプ
                </label>
                <div className="flex gap-[8px]">
                  {([
                    { value: 'bug' as const, label: 'バグ', icon: '\uD83D\uDC1B' },
                    { value: 'improvement' as const, label: '改善', icon: '\uD83D\uDCA1' },
                    { value: 'question' as const, label: '質問', icon: '\u2753' },
                    { value: 'incident' as const, label: 'インシデント', icon: '\uD83D\uDD25' },
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
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                  タイトル <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="課題のタイトルを入力"
                  className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                />
              </div>

              {/* Severity */}
              <div>
                <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                  重要度
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
                  className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                  説明
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="課題の詳細を入力"
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
                  {showBugFields ? 'バグ詳細' : 'インシデント詳細'}
                </h2>
              </div>
              <div className="px-6 py-5 space-y-5">
                {/* Reproduction steps (bug only) */}
                {showBugFields && (
                  <div>
                    <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                      再現手順
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
                      期待される結果
                    </label>
                    <textarea
                      value={expectedResult}
                      onChange={(e) => setExpectedResult(e.target.value)}
                      rows={2}
                      placeholder="正常に動作した場合の結果"
                      className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface placeholder:text-text3 resize-y focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                    />
                  </div>
                )}

                {/* Actual result */}
                <div>
                  <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                    実際の結果
                  </label>
                  <textarea
                    value={actualResult}
                    onChange={(e) => setActualResult(e.target.value)}
                    rows={2}
                    placeholder="実際に発生した問題"
                    className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface placeholder:text-text3 resize-y focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                  />
                </div>

                {/* Environment */}
                <div>
                  <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                    環境情報
                  </label>
                  <textarea
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    rows={3}
                    placeholder="OS: macOS 14.0&#10;Browser: Chrome 120&#10;Node: 20.x"
                    className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface placeholder:text-text3 resize-y focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint font-mono"
                  />
                  <p className="text-[10px] text-text3 mt-1">「キー: 値」の形式で1行ずつ入力してください</p>
                </div>
              </div>
            </div>
          )}

          {/* Additional options */}
          <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
            <div className="px-6 py-4 border-b border-wf-border">
              <h2 className="text-[15px] font-bold text-text">追加オプション</h2>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Assignee */}
              <div>
                <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                  担当者
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                >
                  <option value="">未アサイン</option>
                  {activeMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Related task */}
              {projectId && (
                <div>
                  <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                    関連タスク
                  </label>
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="タスク名で検索..."
                    className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint mb-1.5"
                  />
                  <select
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                  >
                    <option value="">なし</option>
                    {filteredTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                  {projectTasks && projectTasks.length === 0 && (
                    <p className="text-[10px] text-text3 mt-1">このプロジェクトにはタスクがありません</p>
                  )}
                </div>
              )}

              {/* Source */}
              <div>
                <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                  ソース
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
                    社内
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
                    顧客
                  </button>
                </div>
              </div>

              {/* Labels */}
              <div>
                <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
                  ラベル
                </label>
                <input
                  type="text"
                  value={labelsInput}
                  onChange={(e) => setLabelsInput(e.target.value)}
                  placeholder="カンマ区切り (例: UI, API, 緊急)"
                  className="w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text bg-surface placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
                />
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
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createIssue.isPending || !projectId || !title.trim()}
              className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white bg-mint hover:bg-mint-d transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createIssue.isPending ? '登録中...' : '課題を登録'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
