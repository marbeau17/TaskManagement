// =============================================================================
// Imported data from SharePoint TaskList.csv
// =============================================================================
//
// This module provides functions to load migrated CSV data into the app's
// mock data format.  It is designed to be consumed alongside or in place of
// the hand-crafted data in `data.ts`.
// =============================================================================

import type {
  User,
  Client,
  Task,
  TaskWithRelations,
  TaskStatus,
} from '@/types/database'
import type { MockUserWithPassword } from './data'
import { DEFAULT_PASSWORD, BASE_CLIENTS } from './constants'

// Lazy accessor to break circular dependency with data.ts
function getMockUsers(): MockUserWithPassword[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const data = require('./data')
  return data.mockUsers as MockUserWithPassword[]
}

// ---------------------------------------------------------------------------
// CSV row shape (matches SharePoint export headers)
// ---------------------------------------------------------------------------

interface CsvRow {
  タスク名: string
  ファンクション: string
  タスクの種類: string
  '詳細タスク・アクション項目': string
  Status: string
  Owner: string
  DueDate: string
  優先度: string
  顧客名: string
  工数レベル: string
  Note: string
  関連ファイル: string
  更新日時: string
}

// ---------------------------------------------------------------------------
// Status mapping: SharePoint → app
// ---------------------------------------------------------------------------

function mapStatus(spStatus: string): TaskStatus {
  switch (spStatus.trim()) {
    case 'Completed':
    case 'Done':
    case 'done':
      return 'done'
    case 'Inprogress':
    case 'In progress':
    case 'in_progress':
      return 'in_progress'
    case 'NotStarted':
    case 'Not started':
    case 'todo':
      return 'todo'
    case 'Dropped':
    case 'rejected':
      return 'rejected'
    case 'waiting':
      return 'waiting'
    case '':
    default:
      return 'waiting'
  }
}

// ---------------------------------------------------------------------------
// Priority → estimated_hours
// ---------------------------------------------------------------------------

function mapPriorityToHours(priority: string): number | null {
  switch (priority.trim()) {
    case '大':
    case '高':
    case 'high':
    case 'High':
      return 16
    case '中':
    case 'medium':
    case 'Medium':
      return 8
    case '小':
    case '低':
    case 'low':
    case 'Low':
      return 4
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Progress from status
// ---------------------------------------------------------------------------

function progressFromStatus(status: TaskStatus): number {
  switch (status) {
    case 'done':
      return 100
    case 'rejected':
      return 0
    case 'in_progress':
      return 50
    case 'todo':
    case 'waiting':
    default:
      return 0
  }
}

// ---------------------------------------------------------------------------
// New user: 奥津 (y.okutsu@meetsc.co.jp)
// ---------------------------------------------------------------------------

export const okutsuUser: MockUserWithPassword = {
  id: 'u12',
  name: '奥津',
  name_short: '奥',
  role: 'requester',
  avatar_color: 'av-b',
  email: 'y.okutsu@meetsc.co.jp',
  weekly_capacity_hours: 40,
  is_active: true,
  must_change_password: false,
  manager_id: 'u1',
  level: 'L5',
  department: '',
  title: '',
  created_at: '2025-01-01T00:00:00',
  updated_at: '2025-01-01T00:00:00',
  password: DEFAULT_PASSWORD,
}

// ---------------------------------------------------------------------------
// Email → user-id lookup  (includes existing mock users + new user)
// ---------------------------------------------------------------------------

function getAllUsers(): MockUserWithPassword[] {
  return [...getMockUsers(), okutsuUser]
}

function userIdByEmail(email: string): string | null {
  const normalised = email.trim().toLowerCase()
  const user = getAllUsers().find((u) => u.email.toLowerCase() === normalised)
  return user?.id ?? null
}

function findUserById(id: string): User {
  const user = getAllUsers().find((u) => u.id === id)
  if (!user) throw new Error(`User not found: ${id}`)
  return user
}

// ---------------------------------------------------------------------------
// Client normalisation  (deduplicate and merge variant names)
// ---------------------------------------------------------------------------

/** Map variant client names to a canonical name */
const clientNameAliases: Record<string, string> = {
  'Majorcraft': 'メジャークラフト株式会社',
  'メジャークラフト': 'メジャークラフト株式会社',
  'Gordonmiller': 'ゴードンミラー株式会社',
  'GordonMiller': 'ゴードンミラー株式会社',
  'SPINDLE': '株式会社SPINDLE',
  'Spindle': '株式会社SPINDLE',
  '武居商店': '株式会社武居商店',
  '株式会社武井商店': '株式会社武居商店',
  '北海道乳業': '北海道乳業株式会社',
  'エーアンドーエーマテリアル': 'エーアンドエーマテリアル株式会社',
  'エーアンドーマテリアル': 'エーアンドエーマテリアル株式会社',
  '出光興産': '出光興産株式会社',
  '出光リテール販売株式会社 東海北陸支店': '出光リテール販売株式会社 東海北陸カンパニー',
  'インターグ': 'インターグ株式会社',
  'プレブ': '株式会社プレブ',
  '武居商店・プレブ': '株式会社武居商店',
  '仙楽園': '仙楽園',
}

function canonicalClientName(raw: string): string {
  const trimmed = raw.trim()
  return clientNameAliases[trimmed] ?? trimmed
}

// ---------------------------------------------------------------------------
// Build the deduplicated client list from CSV
// ---------------------------------------------------------------------------

let nextClientId = 0

function makeClientId(): string {
  return `c${nextClientId++}`
}

// Internal registry — lazily seeded on first use
const clientRegistry = new Map<string, Client>()
let _clientRegistrySeeded = false

function ensureClientRegistry(): void {
  if (_clientRegistrySeeded) return
  _clientRegistrySeeded = true
  nextClientId = BASE_CLIENTS.length + 1
  for (const c of BASE_CLIENTS) {
    clientRegistry.set(c.name, c)
  }
}

function getOrCreateClient(rawName: string): Client | null {
  if (!rawName.trim()) return null
  ensureClientRegistry()

  const canonical = canonicalClientName(rawName)

  const existing = clientRegistry.get(canonical)
  if (existing) return existing

  const newClient: Client = {
    id: makeClientId(),
    name: canonical,
    created_at: '2025-01-01T00:00:00',
  }
  clientRegistry.set(canonical, newClient)
  return newClient
}

// ---------------------------------------------------------------------------
// Hard-coded CSV rows (from TaskList.csv export)
//
// Rather than bundling a CSV parser into the front-end, we embed the data
// directly.  The raw CSV has 541 rows; they are transformed below.
// ---------------------------------------------------------------------------

// We import at build-time via the function below.  The actual row data is
// produced by the build-time script or can be loaded at runtime from the CSV.
// For the mock layer we provide a typed array that mirrors the CSV content.

/**
 * Parse a single CSV row into a Task + metadata.
 */
function csvRowToTask(row: CsvRow, index: number): {
  task: Task
  client: Client | null
  allOwnerEmails: string[]
} {
  const taskId = `csv-t${index + 1}`
  const status = mapStatus(row.Status)
  const estimatedHours = mapPriorityToHours(row.優先度)

  // Owner handling: semicolon-separated, first is assigned_to
  const ownerEmails = row.Owner
    ? row.Owner.split(';').map((e) => e.trim()).filter(Boolean)
    : []
  const assignedTo = ownerEmails.length > 0 ? userIdByEmail(ownerEmails[0]) : null

  // Client
  const client = getOrCreateClient(row.顧客名)

  // Due date → confirmed_deadline (ISO date only, strip time)
  let confirmedDeadline: string | null = null
  if (row.DueDate) {
    try {
      const d = new Date(row.DueDate)
      if (!isNaN(d.getTime())) {
        confirmedDeadline = d.toISOString().slice(0, 10)
      }
    } catch {
      // ignore invalid dates
    }
  }

  // Updated timestamp
  let updatedAt = '2025-01-01T00:00:00'
  if (row.更新日時) {
    try {
      const d = new Date(row.更新日時)
      if (!isNaN(d.getTime())) {
        updatedAt = d.toISOString().replace('Z', '')
      }
    } catch {
      // ignore
    }
  }

  // Build description from 詳細タスク・アクション項目 + Note
  const descParts: string[] = []
  if (row['詳細タスク・アクション項目']) {
    descParts.push(row['詳細タスク・アクション項目'])
  }
  if (row.Note) {
    descParts.push(`[Note] ${row.Note}`)
  }
  const description = descParts.length > 0 ? descParts.join('\n\n') : null

  const task: Task = {
    id: taskId,
    client_id: client?.id ?? 'c-unset', // fallback to unset client if none specified
    project_id: null,
    title: row.タスク名 || `(無題タスク ${index + 1})`,
    description,
    status,
    progress: progressFromStatus(status),
    requested_by: 'u2', // default requester: 安田
    assigned_to: assignedTo,
    director_id: 'u2', // default director: 安田
    desired_deadline: null,
    confirmed_deadline: confirmedDeadline,
    estimated_hours: estimatedHours,
    actual_hours: 0,
    priority: 3,
    planned_hours_per_week: 0,
    weekly_plan: null,
    reference_url: null,
    is_draft: false,
    template_id: null,
    template_data: null,
    parent_task_id: null,
    wbs_code: `${index + 1}`,
    start_date: null,
    created_at: updatedAt, // use update timestamp as created_at approximation
    updated_at: updatedAt,
  }

  return { task, client, allOwnerEmails: ownerEmails }
}

// ---------------------------------------------------------------------------
// Lazy-initialised cache
// ---------------------------------------------------------------------------

let _importedTasks: TaskWithRelations[] | null = null
let _importedClients: Client[] | null = null
let _autoLoaded = false

function autoLoadFromEmbeddedData(): void {
  if (_autoLoaded) return
  _autoLoaded = true
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parsedTasks } = require('./parsed-task-data')
    const rows: CsvRow[] = parsedTasks.map((t: Record<string, unknown>) => ({
      'タスク名': t.taskName as string,
      'ファンクション': t.function as string,
      'タスクの種類': t.taskType as string,
      '詳細タスク・アクション項目': t.description as string,
      Status: t.status as string,
      Owner: (t.owners as string[]).join(';'),
      DueDate: t.dueDate as string || '',
      '優先度': String(t.priority === 'high' ? '高' : t.priority === 'medium' ? '中' : t.priority === 'low' ? '低' : t.priority || ''),
      '顧客名': t.clientName as string,
      '工数レベル': String(t.estimatedHours === 16 ? '大' : t.estimatedHours === 8 ? '中' : t.estimatedHours === 4 ? '小' : t.estimatedHours || ''),
      Note: t.note as string,
      '関連ファイル': t.relatedFiles as string,
      '更新日時': t.updatedAt as string,
    }))
    buildFromRows(rows)
  } catch {
    // Data file not available, return empty
    _importedTasks = []
    _importedClients = []
  }
}

/**
 * Set the raw CSV rows (parsed externally). Optional — if not called,
 * tasks are auto-loaded from the embedded parsed-task-data.ts module.
 */
export function setCsvRows(rows: CsvRow[]): void {
  _importedTasks = null
  _importedClients = null
  buildFromRows(rows)
  _autoLoaded = true
}

function buildAll(): void {
  autoLoadFromEmbeddedData()
}

function buildFromRows(rows: CsvRow[]): void {
  // Reset client registry to existing clients only
  clientRegistry.clear()
  _clientRegistrySeeded = false
  ensureClientRegistry()

  const tasks: TaskWithRelations[] = []

  for (let i = 0; i < rows.length; i++) {
    const { task } = csvRowToTask(rows[i], i)

    // Build TaskWithRelations
    const UNSET_CLIENT: Client = { id: 'c-unset', name: '', created_at: '2020-01-01T00:00:00' }
    const clientObj = clientRegistry.get(
      [...clientRegistry.entries()].find(([, c]) => c.id === task.client_id)?.[0] ?? ''
    ) ?? UNSET_CLIENT

    const assignedUser = task.assigned_to ? findUserById(task.assigned_to) : null
    const requester = findUserById(task.requested_by)
    const director = task.director_id ? findUserById(task.director_id) : null

    tasks.push({
      ...task,
      client: clientObj,
      assigned_user: assignedUser,
      requester,
      director,
    })
  }

  _importedTasks = tasks
  _importedClients = [...clientRegistry.values()]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns all tasks imported from the CSV, merged with existing mock tasks.
 * Requires `setCsvRows()` to have been called first.
 */
export function getImportedTasks(): TaskWithRelations[] {
  if (!_importedTasks) buildAll()
  return _importedTasks!
}

/**
 * Returns all clients (existing mock clients + new ones from CSV).
 * Requires `setCsvRows()` to have been called first.
 */
export function getImportedClients(): Client[] {
  if (!_importedClients) buildAll()
  return _importedClients!
}

/**
 * Convenience: build tasks directly from an array of rows without caching.
 * Useful for one-shot imports or testing.
 */
export function getImportedTasksFromRows(rows: CsvRow[]): {
  tasks: TaskWithRelations[]
  clients: Client[]
  newUser: MockUserWithPassword
} {
  buildFromRows(rows)
  return {
    tasks: _importedTasks!,
    clients: _importedClients!,
    newUser: okutsuUser,
  }
}

/**
 * Returns the new user that needs to be added to the user store.
 */
export function getNewUser(): MockUserWithPassword {
  return okutsuUser
}

/**
 * Returns all users including the new okutsu user.
 */
export function getAllUsersWithImported(): MockUserWithPassword[] {
  return getAllUsers()
}
