// =============================================================================
// Data abstraction layer – Project Templates
// =============================================================================

import type {
  ProjectTemplate,
  ProjectTemplateCreateInput,
} from '@/types/project'
import { useMock } from '@/lib/utils'

// ---------------------------------------------------------------------------
// getProjectTemplates
// ---------------------------------------------------------------------------

export async function getProjectTemplates(): Promise<ProjectTemplate[]> {
  if (useMock()) {
    return getMockProjectTemplates()
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return (data ?? []).map(parseTemplate)
}

// ---------------------------------------------------------------------------
// getProjectTemplateById
// ---------------------------------------------------------------------------

export async function getProjectTemplateById(
  id: string
): Promise<ProjectTemplate | null> {
  if (useMock()) {
    const templates = await getMockProjectTemplates()
    return templates.find((t) => t.id === id) ?? null
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return parseTemplate(data)
}

// ---------------------------------------------------------------------------
// createProjectTemplate – save a new template (or save current project as template)
// ---------------------------------------------------------------------------

export async function createProjectTemplate(
  input: ProjectTemplateCreateInput
): Promise<ProjectTemplate> {
  if (useMock()) {
    return {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      default_statuses: input.default_statuses ?? [
        'planning',
        'active',
        'on_hold',
        'completed',
        'archived',
      ],
      default_milestones: input.default_milestones ?? [],
      default_tasks: input.default_tasks ?? [],
      created_by: null,
      created_at: new Date().toISOString(),
    }
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_templates')
    .insert({
      name: input.name,
      description: input.description,
      default_statuses: input.default_statuses ?? [
        'planning',
        'active',
        'on_hold',
        'completed',
        'archived',
      ],
      default_milestones: input.default_milestones ?? [],
      default_tasks: input.default_tasks ?? [],
      created_by: authUser?.id ?? null,
    })
    .select()
    .single()

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return parseTemplate(data)
}

// ---------------------------------------------------------------------------
// saveProjectAsTemplate – capture an existing project's tasks as a template
// ---------------------------------------------------------------------------

export async function saveProjectAsTemplate(
  projectId: string,
  templateName: string,
  templateDescription: string
): Promise<ProjectTemplate> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // Fetch the project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projectError } = await (supabase as any)
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError) throw projectError

  // Fetch tasks belonging to this project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tasks } = await (supabase as any)
    .from('tasks')
    .select('title, status')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  const defaultTasks = (tasks ?? []).map((t: { title: string; status: string }) => ({
    title: t.title,
    status: 'waiting',
  }))

  return createProjectTemplate({
    name: templateName,
    description: templateDescription || project.description || '',
    default_tasks: defaultTasks,
  })
}

// ---------------------------------------------------------------------------
// createProjectFromTemplate – instantiate a new project from a template
// ---------------------------------------------------------------------------

export async function createProjectFromTemplate(
  templateId: string,
  projectName: string,
  keyPrefix: string,
  pmId?: string | null
): Promise<{ projectId: string }> {
  const template = await getProjectTemplateById(templateId)
  if (!template) throw new Error('Template not found')

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // 1. Create the project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newProject, error: projectError } = await (supabase as any)
    .from('projects')
    .insert({
      name: projectName,
      description: template.description,
      status: 'planning',
      key_prefix: keyPrefix,
      pm_id: pmId ?? null,
    })
    .select()
    .single()

  if (projectError) throw projectError

  // 2. Create tasks from template
  if (template.default_tasks.length > 0) {
    const taskInserts = template.default_tasks.map((t) => ({
      title: t.title,
      status: t.status || 'waiting',
      project_id: newProject.id,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: tasksError } = await (supabase as any)
      .from('tasks')
      .insert(taskInserts)

    if (tasksError) {
      console.error('Failed to create template tasks:', tasksError)
    }
  }

  return { projectId: newProject.id }
}

// ---------------------------------------------------------------------------
// deleteProjectTemplate
// ---------------------------------------------------------------------------

export async function deleteProjectTemplate(id: string): Promise<boolean> {
  if (useMock()) {
    return true
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('project_templates')
    .delete()
    .eq('id', id)

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return true
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTemplate(row: any): ProjectTemplate {
  return {
    ...row,
    default_statuses:
      typeof row.default_statuses === 'string'
        ? JSON.parse(row.default_statuses)
        : row.default_statuses ?? [],
    default_milestones:
      typeof row.default_milestones === 'string'
        ? JSON.parse(row.default_milestones)
        : row.default_milestones ?? [],
    default_tasks:
      typeof row.default_tasks === 'string'
        ? JSON.parse(row.default_tasks)
        : row.default_tasks ?? [],
  }
}

// ---------------------------------------------------------------------------
// Mock data (for development without Supabase)
// ---------------------------------------------------------------------------

async function getMockProjectTemplates(): Promise<ProjectTemplate[]> {
  return [
    {
      id: 'pt-1',
      name: 'Webサイト制作',
      description: 'Webサイトの新規制作・リニューアル用テンプレート',
      default_statuses: ['planning', 'active', 'on_hold', 'completed', 'archived'],
      default_milestones: [
        { name: '要件定義', offset_days: 0 },
        { name: 'デザイン', offset_days: 14 },
        { name: '実装', offset_days: 28 },
        { name: 'テスト', offset_days: 42 },
        { name: 'リリース', offset_days: 56 },
      ],
      default_tasks: [
        { title: '要件ヒアリング', status: 'waiting' },
        { title: 'ワイヤーフレーム作成', status: 'waiting' },
        { title: 'デザインカンプ作成', status: 'waiting' },
        { title: 'コーディング', status: 'waiting' },
        { title: 'テスト・検証', status: 'waiting' },
        { title: '本番公開', status: 'waiting' },
      ],
      created_by: null,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'pt-2',
      name: 'マーケティングキャンペーン',
      description: 'マーケティング施策の計画・実行用テンプレート',
      default_statuses: ['planning', 'active', 'on_hold', 'completed', 'archived'],
      default_milestones: [
        { name: '企画', offset_days: 0 },
        { name: '制作', offset_days: 7 },
        { name: '配信', offset_days: 21 },
        { name: '効果測定', offset_days: 35 },
      ],
      default_tasks: [
        { title: 'ターゲット設定', status: 'waiting' },
        { title: 'コンテンツ企画', status: 'waiting' },
        { title: 'クリエイティブ制作', status: 'waiting' },
        { title: '配信設定', status: 'waiting' },
        { title: '効果測定・レポート', status: 'waiting' },
      ],
      created_by: null,
      created_at: '2024-01-01T00:00:00Z',
    },
  ]
}
