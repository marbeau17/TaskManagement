// =============================================================================
// Mock CRUD handlers operating on copies of mock data
// =============================================================================

import type {
  User,
  Client,
  Task,
  TaskStatus,
  TaskWithRelations,
  Comment,
  ActivityLog,
  Attachment,
  ProjectMember,
} from '@/types/database'
import type { TaskFilters, TaskFormStep1, TaskFormStep2, TaskProgressUpdate } from '@/types/task'
import type { WorkloadSummary, WorkloadKpiData } from '@/types/workload'
import type { InviteMemberForm } from '@/types/member'
import type { TaskTemplate, TemplateField } from '@/types/template'
import type { Project, ProjectFilters } from '@/types/project'
import type { Issue, IssueStatus, IssueComment, IssueFilters, CreateIssueData } from '@/types/issue'

import {
  mockUsers,
  mockClients,
  mockTasks,
  mockComments,
  mockActivityLogs,
  mockAttachments,
  mockTemplates,
  mockProjects,
  mockIssues,
  mockIssueComments,
  DEFAULT_PASSWORD,
} from './data'
import type { MockUserWithPassword } from './data'

// ---------------------------------------------------------------------------
// Mutable copies so CRUD operations persist during session
// ---------------------------------------------------------------------------

let tasks: TaskWithRelations[] = [...mockTasks]
let comments: Comment[] = [...mockComments]
let activityLogs: ActivityLog[] = [...mockActivityLogs]
let attachments: Attachment[] = [...mockAttachments]
const users: MockUserWithPassword[] = [...mockUsers]
const clients: Client[] = [...mockClients]
let projects: Project[] = [...mockProjects]
let issues: Issue[] = [...mockIssues]
let issueComments: IssueComment[] = [...mockIssueComments]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findUser(id: string): User | undefined {
  return users.find((u) => u.id === id)
}

function findClient(id: string): Client | undefined {
  return clients.find((c) => c.id === id)
}

function findClientByName(name: string): Client | undefined {
  return clients.find((c) => c.name === name)
}

let nextId = 100

function genId(prefix: string): string {
  nextId += 1
  return `${prefix}${nextId}`
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export function getMockTasks(filters?: TaskFilters): TaskWithRelations[] {
  let result = [...tasks]

  if (!filters) return result

  // Status filter
  if (filters.status && filters.status !== 'all') {
    result = result.filter((t) => t.status === filters.status)
  }

  // Client filter
  if (filters.client_id) {
    result = result.filter((t) => t.client_id === filters.client_id)
  }

  // Project filter
  if (filters.project_id) {
    result = result.filter((t) => t.project_id === filters.project_id)
  }

  // Assigned-to filter
  if (filters.assigned_to) {
    result = result.filter((t) => t.assigned_to === filters.assigned_to)
  }

  // Requested-by filter
  if (filters.requested_by) {
    result = result.filter((t) => t.requested_by === filters.requested_by)
  }

  // Parent task filter
  if (filters.parent_task_id !== undefined) {
    if (filters.parent_task_id === null) {
      result = result.filter((t) => t.parent_task_id === null)
    } else {
      result = result.filter((t) => t.parent_task_id === filters.parent_task_id)
    }
  }

  // Search filter (matches title or client name, case-insensitive)
  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.client.name.toLowerCase().includes(q)
    )
  }

  // Period filter — based on confirmed_deadline range
  if (filters.period && filters.period !== 'all') {
    const now = new Date()

    if (filters.period === 'week') {
      // Monday to Sunday of the current week
      const day = now.getDay()
      const diffToMonday = day === 0 ? 6 : day - 1
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - diffToMonday)
      startOfWeek.setHours(0, 0, 0, 0)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 7)

      result = result.filter((t) => {
        const dl = t.confirmed_deadline ?? t.desired_deadline
        if (!dl) return false
        const d = new Date(dl)
        return d >= startOfWeek && d < endOfWeek
      })
    } else {
      // month — current calendar month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

      result = result.filter((t) => {
        const dl = t.confirmed_deadline ?? t.desired_deadline
        if (!dl) return false
        const d = new Date(dl)
        return d >= startOfMonth && d < endOfMonth
      })
    }
  }

  return result
}

export function getMockTaskById(id: string): TaskWithRelations | null {
  return tasks.find((t) => t.id === id) ?? null
}

export function getMockSubtasks(parentId: string): TaskWithRelations[] {
  return tasks
    .filter((t) => t.parent_task_id === parentId)
    .sort((a, b) => (a.wbs_code ?? '').localeCompare(b.wbs_code ?? ''))
}

export function createMockTask(
  step1: TaskFormStep1,
  step2?: TaskFormStep2
): TaskWithRelations {
  const id = genId('t')
  const now = new Date().toISOString()

  // Resolve client by name
  let client = findClientByName(step1.client_name)
  if (!client) {
    client = { id: genId('c'), name: step1.client_name, created_at: now }
    clients.push(client)
  }

  const newTask: Task = {
    id,
    client_id: client.id,
    project_id: null,
    title: step1.title,
    description: step1.description ?? null,
    status: step2 ? 'todo' : 'waiting',
    progress: 0,
    requested_by: 'u1', // default mock current user
    assigned_to: step2?.assigned_to ?? null,
    director_id: step2 ? 'u1' : null,
    desired_deadline: step1.desired_deadline ?? null,
    confirmed_deadline: step2?.confirmed_deadline ?? null,
    estimated_hours: step2?.estimated_hours ?? null,
    actual_hours: 0,
    reference_url: step1.reference_url ?? null,
    is_draft: !step2,
    template_id: null,
    template_data: null,
    parent_task_id: step1.parent_task_id ?? null,
    wbs_code: step1.wbs_code ?? '',
    start_date: null,
    created_at: now,
    updated_at: now,
  }

  const taskWithRelations: TaskWithRelations = {
    ...newTask,
    client,
    assigned_user: newTask.assigned_to
      ? findUser(newTask.assigned_to) ?? null
      : null,
    requester: findUser(newTask.requested_by) ?? users[0],
    director: newTask.director_id
      ? findUser(newTask.director_id) ?? null
      : null,
  }

  tasks = [taskWithRelations, ...tasks]
  return taskWithRelations
}

export function updateMockTask(
  id: string,
  data: Partial<Task>
): TaskWithRelations {
  const index = tasks.findIndex((t) => t.id === id)
  if (index === -1) throw new Error(`Task not found: ${id}`)

  const existing = tasks[index]
  const now = new Date().toISOString()

  const updated: TaskWithRelations = {
    ...existing,
    ...data,
    id, // ensure id is never overwritten
    updated_at: now,
    client: data.client_id
      ? findClient(data.client_id) ?? existing.client
      : existing.client,
    assigned_user:
      data.assigned_to !== undefined
        ? data.assigned_to
          ? findUser(data.assigned_to) ?? null
          : null
        : existing.assigned_user,
    requester: data.requested_by
      ? findUser(data.requested_by) ?? existing.requester
      : existing.requester,
    director:
      data.director_id !== undefined
        ? data.director_id
          ? findUser(data.director_id) ?? null
          : null
        : existing.director,
  }

  tasks = [...tasks]
  tasks[index] = updated
  return updated
}

// ---------------------------------------------------------------------------
// updateMockTaskProgress
// ---------------------------------------------------------------------------

export function updateMockTaskProgress(
  id: string,
  update: TaskProgressUpdate
): TaskWithRelations {
  return updateMockTask(id, {
    progress: update.progress,
    status: update.status,
    actual_hours: update.actual_hours,
  })
}

// ---------------------------------------------------------------------------
// assignMockTask
// ---------------------------------------------------------------------------

export function assignMockTask(
  id: string,
  data: TaskFormStep2
): TaskWithRelations {
  return updateMockTask(id, {
    assigned_to: data.assigned_to,
    confirmed_deadline: data.confirmed_deadline,
    estimated_hours: data.estimated_hours,
    director_id: 'u2', // 安田 修 — current director in mock data
    status: 'todo',
    is_draft: false,
  })
}

// ---------------------------------------------------------------------------
// Bulk status update
// ---------------------------------------------------------------------------

export function bulkUpdateMockTaskStatus(
  taskIds: string[],
  status: TaskStatus
): void {
  for (const id of taskIds) {
    const task = tasks.find((t) => t.id === id)
    if (task) {
      task.status = status
      task.updated_at = new Date().toISOString()
    }
  }
}

// ---------------------------------------------------------------------------
// Bulk assign
// ---------------------------------------------------------------------------

export function bulkAssignMockTasks(taskIds: string[], userId: string): void {
  for (const id of taskIds) {
    const task = tasks.find((t) => t.id === id)
    if (task) {
      task.assigned_to = userId
      task.updated_at = new Date().toISOString()
    }
  }
}

// ---------------------------------------------------------------------------
// Bulk delete
// ---------------------------------------------------------------------------

export function bulkDeleteMockTasks(taskIds: string[]): void {
  tasks = tasks.filter((t) => !taskIds.includes(t.id))
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export function getMockMembers(includeInactive?: boolean): User[] {
  if (includeInactive) {
    return [...users]
  }
  return users.filter((u) => u.is_active)
}

export function getMockMemberById(id: string): User | null {
  return users.find((u) => u.id === id) ?? null
}

export function updateMockMember(
  id: string,
  updates: Partial<User>
): User {
  const index = users.findIndex((u) => u.id === id)
  if (index === -1) throw new Error(`User not found: ${id}`)

  const updated: MockUserWithPassword = {
    ...users[index],
    ...updates,
    id, // ensure id is never overwritten
    updated_at: new Date().toISOString(),
  }

  users[index] = updated
  return updated
}

// ---------------------------------------------------------------------------
// Add / Delete / Password management
// ---------------------------------------------------------------------------

const avatarColors: Array<'av-a' | 'av-b' | 'av-c' | 'av-d' | 'av-e'> = [
  'av-a', 'av-b', 'av-c', 'av-d', 'av-e',
]

export function addMockMember(data: InviteMemberForm & { password?: string }): User {
  const id = genId('u')
  const now = new Date().toISOString()
  const newUser: MockUserWithPassword = {
    id,
    email: data.email,
    name: data.name,
    name_short: data.name_short,
    role: data.role,
    avatar_color: avatarColors[users.length % avatarColors.length],
    weekly_capacity_hours: data.weekly_capacity_hours,
    is_active: true,
    manager_id: null,
    level: '',
    department: '',
    title: '',
    created_at: now,
    updated_at: now,
    password: data.password ?? DEFAULT_PASSWORD,
    must_change_password: true,
  }
  users.push(newUser)
  return newUser
}

export function deleteMockMember(id: string): boolean {
  const user = users.find((u) => u.id === id)
  if (!user) return false
  user.is_active = false
  user.updated_at = new Date().toISOString()
  return true
}

export function hardDeleteMockMember(id: string): boolean {
  const index = users.findIndex((u) => u.id === id)
  if (index === -1) return false
  users.splice(index, 1)
  return true
}

export function changeMockPassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): { success: boolean; error?: string } {
  const user = users.find((u) => u.id === userId)
  if (!user) {
    return { success: false, error: 'User not found' }
  }
  if (user.password !== oldPassword) {
    return { success: false, error: 'Current password is incorrect' }
  }
  user.password = newPassword
  user.updated_at = new Date().toISOString()
  return { success: true }
}

export function forceChangeMockPassword(
  userId: string,
  newPassword: string
): { success: boolean; error?: string } {
  const user = users.find((u) => u.id === userId)
  if (!user) {
    return { success: false, error: 'User not found' }
  }
  user.password = newPassword
  user.must_change_password = false
  user.updated_at = new Date().toISOString()
  return { success: true }
}

export function verifyMockPassword(email: string, password: string): User | null {
  const user = users.find((u) => u.email === email && u.is_active)
  if (!user) return null
  if (user.password !== password) return null
  // Return user without password field
  const { password: _pw, ...userWithoutPassword } = user
  return userWithoutPassword as User
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export function getMockClients(): Client[] {
  return [...clients]
}

export function searchMockClients(query: string): Client[] {
  if (!query) return [...clients]
  const q = query.toLowerCase()
  return clients.filter((c) => c.name.toLowerCase().includes(q))
}

export function createMockClient(name: string): Client {
  const now = new Date().toISOString()
  const newClient: Client = {
    id: genId('c'),
    name,
    created_at: now,
  }
  clients.push(newClient)
  return newClient
}

export function updateMockClient(id: string, name: string): Client {
  const client = clients.find((c) => c.id === id)
  if (!client) throw new Error(`Client not found: ${id}`)
  client.name = name
  return { ...client }
}

export function deleteMockClient(id: string): boolean {
  const index = clients.findIndex((c) => c.id === id)
  if (index === -1) return false
  clients.splice(index, 1)
  return true
}

// ---------------------------------------------------------------------------
// Subordinates (org hierarchy)
// ---------------------------------------------------------------------------

export function getSubordinates(managerId: string): User[] {
  return users.filter((u) => u.manager_id === managerId && u.is_active)
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export function getMockComments(taskId: string): Comment[] {
  return comments.filter((c) => c.task_id === taskId)
}

export function addMockComment(
  taskId: string,
  body: string
): Comment {
  // In mock mode, default to u1 (田中 太郎) as the current user
  const userId = 'u1'
  const user = findUser(userId)
  const newComment: Comment = {
    id: genId('cm'),
    task_id: taskId,
    user_id: userId,
    body,
    created_at: new Date().toISOString(),
    user,
  }

  comments = [...comments, newComment]
  return newComment
}

// ---------------------------------------------------------------------------
// Activity logs
// ---------------------------------------------------------------------------

export function getMockActivityLogs(taskId: string): ActivityLog[] {
  return activityLogs.filter((l) => l.task_id === taskId)
}

export function getMockRecentActivityLogs(limit = 5) {
  // Sort by created_at descending and return the latest N with task info
  const sorted = [...activityLogs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  return sorted.slice(0, limit).map((log) => {
    const task = tasks.find((t) => t.id === log.task_id)
    return {
      ...log,
      task: task ? { id: task.id, title: task.title } : undefined,
    }
  })
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export function getMockAttachments(taskId: string): Attachment[] {
  return attachments.filter((a) => a.task_id === taskId)
}

export function addMockAttachment(
  taskId: string,
  file: { file_name: string; file_size: number; mime_type: string; storage_path: string }
): Attachment {
  const userId = 'u1' // default mock current user
  const user = findUser(userId)
  const newAttachment: Attachment = {
    id: genId('at'),
    task_id: taskId,
    uploaded_by: userId,
    file_name: file.file_name,
    file_size: file.file_size,
    mime_type: file.mime_type,
    storage_path: file.storage_path,
    created_at: new Date().toISOString(),
    uploader: user,
  }

  attachments = [newAttachment, ...attachments]
  return newAttachment
}

export function deleteMockAttachment(id: string): void {
  attachments = attachments.filter((a) => a.id !== id)
}

// ---------------------------------------------------------------------------
// Recent notifications (global activity logs, limit 10)
// ---------------------------------------------------------------------------

export function getMockRecentNotifications(): ActivityLog[] {
  return [...activityLogs]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 10)
}

// ---------------------------------------------------------------------------
// Workload summaries — computed from tasks
// ---------------------------------------------------------------------------

export function getMockWorkloadSummaries(): WorkloadSummary[] {
  const activeUsers = users.filter((u) => u.is_active)

  return activeUsers.map((user) => {
    const userTasks = tasks.filter((t) => t.assigned_to === user.id)
    const activeTasks = userTasks.filter(
      (t) => t.status === 'in_progress' || t.status === 'todo'
    )
    const completedTasks = userTasks.filter((t) => t.status === 'done')

    const estimatedHours = activeTasks.reduce(
      (sum, t) => sum + (t.estimated_hours ?? 0),
      0
    )
    const actualHours = userTasks.reduce((sum, t) => sum + t.actual_hours, 0)

    const capacityHours = user.weekly_capacity_hours
    const utilizationRate =
      capacityHours > 0
        ? Math.round((estimatedHours / capacityHours) * 100)
        : 0

    let status: WorkloadSummary['status']
    if (utilizationRate >= 100) {
      status = 'overloaded'
    } else if (utilizationRate >= 80) {
      status = 'warning'
    } else if (utilizationRate < 30) {
      status = 'available'
    } else {
      status = 'normal'
    }

    return {
      user,
      task_count: userTasks.length,
      completed_count: completedTasks.length,
      estimated_hours: estimatedHours,
      actual_hours: actualHours,
      capacity_hours: capacityHours,
      utilization_rate: utilizationRate,
      status,
    }
  })
}

// ---------------------------------------------------------------------------
// Workload KPI — computed from summaries
// ---------------------------------------------------------------------------

export function getMockWorkloadKpi(): WorkloadKpiData {
  const summaries = getMockWorkloadSummaries()

  const totalEstimated = summaries.reduce(
    (sum, s) => sum + s.estimated_hours,
    0
  )
  const totalActual = summaries.reduce((sum, s) => sum + s.actual_hours, 0)
  const totalCount = summaries.reduce((sum, s) => sum + s.task_count, 0)
  const completedCount = summaries.reduce(
    (sum, s) => sum + s.completed_count,
    0
  )
  const teamAvgUtilization =
    summaries.length > 0
      ? Math.round(
          summaries.reduce((sum, s) => sum + s.utilization_rate, 0) /
            summaries.length
        )
      : 0

  const overloadedMembers = summaries
    .filter((s) => s.status === 'overloaded')
    .map((s) => s.user.name)

  return {
    team_avg_utilization: teamAvgUtilization,
    total_actual_hours: totalActual,
    total_estimated_hours: totalEstimated,
    completion_rate:
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    completed_count: completedCount,
    total_count: totalCount,
    overloaded_count: overloadedMembers.length,
    overloaded_members: overloadedMembers,
  }
}

// ---------------------------------------------------------------------------
// Project Members
// ---------------------------------------------------------------------------

const projectMembers: ProjectMember[] = []

export function getMockProjectMembers(projectName?: string): ProjectMember[] {
  if (projectName) {
    return projectMembers.filter((pm) => pm.project_name === projectName)
  }
  return [...projectMembers]
}

export function addMockProjectMember(
  projectName: string,
  pmId: string,
  memberId: string,
  allocatedHours: number
): ProjectMember {
  const now = new Date().toISOString()
  const newMember: ProjectMember = {
    id: genId('pm'),
    project_name: projectName,
    pm_id: pmId,
    member_id: memberId,
    allocated_hours: allocatedHours,
    created_at: now,
    pm: findUser(pmId),
    member: findUser(memberId),
  }
  projectMembers.push(newMember)
  return newMember
}

export function removeMockProjectMember(id: string): boolean {
  const index = projectMembers.findIndex((pm) => pm.id === id)
  if (index === -1) return false
  projectMembers.splice(index, 1)
  return true
}

export function updateMockProjectMemberHours(id: string, hours: number): ProjectMember {
  const member = projectMembers.find((pm) => pm.id === id)
  if (!member) throw new Error(`ProjectMember not found: ${id}`)
  member.allocated_hours = hours
  return { ...member }
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function getMockProjects(filters?: ProjectFilters): Project[] {
  let result = [...projects]

  if (filters?.status && filters.status !== 'all') {
    result = result.filter((p) => p.status === filters.status)
  }

  if (filters?.pm_id) {
    result = result.filter((p) => p.pm_id === filters.pm_id)
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    )
  }

  return result
}

export function getMockProjectById(id: string): Project | null {
  return projects.find((p) => p.id === id) ?? null
}

export function createMockProject(
  data: Omit<Project, 'id' | 'next_issue_seq' | 'created_at' | 'updated_at' | 'pm'>
): Project {
  const now = new Date().toISOString()
  const newProject: Project = {
    ...data,
    id: genId('proj'),
    next_issue_seq: 1,
    created_at: now,
    updated_at: now,
    pm: data.pm_id ? findUser(data.pm_id) : undefined,
  }
  projects = [newProject, ...projects]
  return newProject
}

export function updateMockProject(
  id: string,
  data: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'pm'>>
): Project {
  const index = projects.findIndex((p) => p.id === id)
  if (index === -1) throw new Error(`Project not found: ${id}`)

  const now = new Date().toISOString()
  const updated: Project = {
    ...projects[index],
    ...data,
    id,
    updated_at: now,
    pm: data.pm_id !== undefined
      ? data.pm_id ? findUser(data.pm_id) : undefined
      : projects[index].pm,
  }

  projects = [...projects]
  projects[index] = updated
  return updated
}

export function deleteMockProject(id: string): boolean {
  const index = projects.findIndex((p) => p.id === id)
  if (index === -1) return false
  projects = projects.filter((p) => p.id !== id)
  return true
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['resolved', 'open', 'closed'],
  resolved: ['verified', 'open'],
  verified: ['closed', 'open'],
  closed: ['open'],
}

export function getMockIssues(filters?: IssueFilters): Issue[] {
  let result = [...issues]

  if (filters?.project_id) {
    result = result.filter((i) => i.project_id === filters.project_id)
  }
  if (filters?.type && filters.type !== 'all') {
    result = result.filter((i) => i.type === filters.type)
  }
  if (filters?.severity && filters.severity !== 'all') {
    result = result.filter((i) => i.severity === filters.severity)
  }
  if (filters?.status && filters.status !== 'all') {
    result = result.filter((i) => i.status === filters.status)
  }
  if (filters?.assigned_to) {
    result = result.filter((i) => i.assigned_to === filters.assigned_to)
  }
  if (filters?.source) {
    result = result.filter((i) => i.source === filters.source)
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.issue_key.toLowerCase().includes(q)
    )
  }

  return result
}

export function getMockIssueById(id: string): Issue | null {
  const issue = issues.find((i) => i.id === id)
  if (!issue) return null
  // Attach project relation
  const project = projects.find((p) => p.id === issue.project_id)
  return { ...issue, project }
}

export function createMockIssue(data: CreateIssueData): Issue {
  const now = new Date().toISOString()

  // Find project and generate issue key
  const project = projects.find((p) => p.id === data.project_id)
  if (!project) throw new Error(`Project not found: ${data.project_id}`)

  const issueKey = `${project.key_prefix}-${project.next_issue_seq}`
  project.next_issue_seq += 1

  const reporter = findUser('u1') // default mock current user

  const newIssue: Issue = {
    id: genId('iss'),
    project_id: data.project_id,
    issue_key: issueKey,
    type: data.type,
    severity: data.severity,
    priority: 0,
    status: 'open',
    title: data.title,
    description: data.description ?? '',
    reproduction_steps: data.reproduction_steps ?? '',
    expected_result: data.expected_result ?? '',
    actual_result: data.actual_result ?? '',
    environment: data.environment ?? {},
    source: data.source ?? 'internal',
    reported_by: 'u1',
    assigned_to: data.assigned_to ?? null,
    task_id: data.task_id ?? null,
    resolution_notes: '',
    git_branch: '',
    git_pr_url: '',
    labels: data.labels ?? [],
    reopen_count: 0,
    created_at: now,
    updated_at: now,
    reporter,
    assignee: data.assigned_to ? findUser(data.assigned_to) : undefined,
    project,
  }

  issues = [newIssue, ...issues]
  return newIssue
}

export function updateMockIssue(
  id: string,
  data: Partial<Issue>
): Issue {
  const index = issues.findIndex((i) => i.id === id)
  if (index === -1) throw new Error(`Issue not found: ${id}`)

  const existing = issues[index]
  const now = new Date().toISOString()

  const updated: Issue = {
    ...existing,
    ...data,
    id,
    updated_at: now,
    reporter: data.reported_by
      ? findUser(data.reported_by)
      : existing.reporter,
    assignee:
      data.assigned_to !== undefined
        ? data.assigned_to
          ? findUser(data.assigned_to)
          : undefined
        : existing.assignee,
  }

  issues = [...issues]
  issues[index] = updated
  return updated
}

export function transitionMockIssueStatus(
  id: string,
  newStatus: IssueStatus
): Issue {
  const issue = issues.find((i) => i.id === id)
  if (!issue) throw new Error(`Issue not found: ${id}`)

  const currentStatus = issue.status
  if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
    throw new Error(`Invalid status transition: ${currentStatus} -> ${newStatus}`)
  }

  const updateData: Partial<Issue> = { status: newStatus }

  // Track reopens
  if (newStatus === 'open' && currentStatus !== 'open') {
    updateData.reopen_count = (issue.reopen_count ?? 0) + 1
  }

  return updateMockIssue(id, updateData)
}

// ---------------------------------------------------------------------------
// Issue Comments
// ---------------------------------------------------------------------------

export function getMockIssueComments(issueId: string): IssueComment[] {
  return issueComments.filter((c) => c.issue_id === issueId)
}

export function addMockIssueComment(issueId: string, body: string): IssueComment {
  const userId = 'u1' // default mock current user
  const user = findUser(userId)
  const newComment: IssueComment = {
    id: genId('ic'),
    issue_id: issueId,
    user_id: userId,
    body,
    created_at: new Date().toISOString(),
    user,
  }
  issueComments = [...issueComments, newComment]
  return newComment
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

let templates: TaskTemplate[] = [...mockTemplates]

export function getMockTemplates(): TaskTemplate[] {
  return [...templates].sort((a, b) => a.name.localeCompare(b.name))
}

export function getMockTemplateById(id: string): TaskTemplate | null {
  return templates.find((t) => t.id === id) ?? null
}

export function createMockTemplate(data: {
  name: string
  category: string
  fields: TemplateField[]
}): TaskTemplate {
  const now = new Date().toISOString()
  const newTemplate: TaskTemplate = {
    id: genId('tmpl-'),
    name: data.name,
    category: data.category,
    fields: data.fields,
    is_default: false,
    created_by: 'u1', // default mock current user
    created_at: now,
    updated_at: now,
  }
  templates = [newTemplate, ...templates]
  return newTemplate
}

export function updateMockTemplate(
  id: string,
  data: Partial<TaskTemplate>
): TaskTemplate {
  const index = templates.findIndex((t) => t.id === id)
  if (index === -1) throw new Error(`Template not found: ${id}`)

  const now = new Date().toISOString()
  const updated: TaskTemplate = {
    ...templates[index],
    ...data,
    id, // ensure id is never overwritten
    updated_at: now,
  }

  templates = [...templates]
  templates[index] = updated
  return updated
}

export function deleteMockTemplate(id: string): boolean {
  const index = templates.findIndex((t) => t.id === id)
  if (index === -1) return false
  templates = templates.filter((t) => t.id !== id)
  return true
}
