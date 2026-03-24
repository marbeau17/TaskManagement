// =============================================================================
// Mock CRUD handlers operating on copies of mock data
// =============================================================================

import type {
  User,
  Client,
  Task,
  TaskWithRelations,
  Comment,
  ActivityLog,
  Attachment,
  ProjectMember,
} from '@/types/database'
import type { TaskFilters, TaskFormStep1, TaskFormStep2, TaskProgressUpdate } from '@/types/task'
import type { WorkloadSummary, WorkloadKpiData } from '@/types/workload'
import type { InviteMemberForm } from '@/types/member'

import {
  mockUsers,
  mockClients,
  mockTasks,
  mockComments,
  mockActivityLogs,
  mockAttachments,
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

  // Assigned-to filter
  if (filters.assigned_to) {
    result = result.filter((t) => t.assigned_to === filters.assigned_to)
  }

  // Requested-by filter
  if (filters.requested_by) {
    result = result.filter((t) => t.requested_by === filters.requested_by)
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

  // Period filter
  if (filters.period && filters.period !== 'all') {
    const now = new Date()
    let cutoff: Date

    if (filters.period === 'week') {
      cutoff = new Date(now)
      cutoff.setDate(cutoff.getDate() - 7)
    } else {
      // month
      cutoff = new Date(now)
      cutoff.setMonth(cutoff.getMonth() - 1)
    }

    result = result.filter((t) => {
      const deadline = t.confirmed_deadline || t.desired_deadline
      if (!deadline) return true
      return new Date(deadline) >= cutoff
    })
  }

  return result
}

export function getMockTaskById(id: string): TaskWithRelations | null {
  return tasks.find((t) => t.id === id) ?? null
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

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export function getMockAttachments(taskId: string): Attachment[] {
  return attachments.filter((a) => a.task_id === taskId)
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
