/**
 * Import script: SharePoint TaskList.csv → TaskManagement mock data JSON
 *
 * Usage:
 *   npx tsx scripts/import-tasklist.ts
 *
 * Reads:  docs/TaskList.csv
 * Writes: scripts/output/clients.json
 *         scripts/output/tasks.json
 */

import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Types (mirrors src/types/database.ts)
// ---------------------------------------------------------------------------

type TaskStatus = 'waiting' | 'todo' | 'in_progress' | 'done' | 'rejected'

interface Client {
  id: string
  name: string
  created_at: string
}

interface Task {
  id: string
  client_id: string
  project_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  progress: number
  requested_by: string
  assigned_to: string | null
  director_id: string | null
  desired_deadline: string | null
  confirmed_deadline: string | null
  estimated_hours: number | null
  actual_hours: number
  reference_url: string | null
  is_draft: boolean
  template_id: string | null
  template_data: Record<string, unknown> | null
  parent_task_id: string | null
  wbs_code: string
  start_date: string | null
  created_at: string
  updated_at: string
}

interface TaskAssignee {
  id: string
  task_id: string
  user_id: string
  created_at: string
}

interface OutputTask extends Task {
  _extra_assignees?: TaskAssignee[]
  _function?: string
}

// ---------------------------------------------------------------------------
// Known users – email → user id mapping
// ---------------------------------------------------------------------------

const USER_MAP: Record<string, string> = {
  'y.ito@meetsc.co.jp': 'u1',
  'o.yasuda@meetsc.co.jp': 'u2',
  'y.akimoto@meetsc.co.jp': 'u3',
  'r.watanabe@meetsc.co.jp': 'u4',
  'm.takimiya@meetsc.co.jp': 'u5',
  'h.ohta@meetsc.co.jp': 'u6',
  'h.ota@meetsc.co.jp': 'u6', // alias
  'l.trabuio@meetsc.co.jp': 'u7',
  'h.kadota@meetsc.co.jp': 'u8',
  'r.agcaoili@meetsc.co.jp': 'u9',
  'm.takeuchi@meetsc.co.jp': 'u10',
  'y.putra@meetsc.co.jp': 'u11',
  // New user
  'y.okutsu@meetsc.co.jp': 'u12',
}

// New user definition (for reference / output)
const NEW_USER = {
  id: 'u12',
  name: '奥津',
  name_short: '奥',
  role: 'creator' as const,
  avatar_color: 'av-b' as const,
  email: 'y.okutsu@meetsc.co.jp',
  weekly_capacity_hours: 16,
  is_active: true,
  must_change_password: true,
  manager_id: 'u2',
  level: 'L5',
  department: '',
  title: 'Specialist',
  created_at: '2026-03-26T00:00:00',
  updated_at: '2026-03-26T00:00:00',
}

// ---------------------------------------------------------------------------
// CSV parser – handles quoted fields with embedded newlines and commas
// ---------------------------------------------------------------------------

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let i = 0
  const len = text.length

  while (i < len) {
    const row: string[] = []
    // Parse one row (may span multiple lines due to quoted fields)
    while (i < len) {
      if (text[i] === '"') {
        // Quoted field
        i++ // skip opening quote
        let field = ''
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              // Escaped quote
              field += '"'
              i += 2
            } else {
              // End of quoted field
              i++ // skip closing quote
              break
            }
          } else {
            field += text[i]
            i++
          }
        }
        row.push(field)
      } else if (text[i] === ',' || text[i] === '\r' || text[i] === '\n') {
        // Empty field before delimiter – don't advance i;
        // the comma/newline logic below will handle advancement
        row.push('')
      } else {
        // Unquoted field
        let field = ''
        while (i < len && text[i] !== ',' && text[i] !== '\r' && text[i] !== '\n') {
          field += text[i]
          i++
        }
        row.push(field)
      }

      // After field: check delimiter
      if (i < len && text[i] === ',') {
        i++ // skip comma, continue to next field
      } else {
        // End of row
        // Skip \r\n or \n
        if (i < len && text[i] === '\r') i++
        if (i < len && text[i] === '\n') i++
        break
      }
    }
    // Only add non-empty rows
    if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
      rows.push(row)
    }
  }

  return rows
}

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

function mapStatus(raw: string): TaskStatus {
  const s = raw.trim().toLowerCase()
  if (s === 'completed' || s === 'done') return 'done'
  if (s === 'inprogress' || s === 'in progress') return 'in_progress'
  if (s === 'notstarted' || s === 'not started') return 'todo'
  if (s === 'dropped') return 'rejected'
  return 'waiting' // empty or unknown
}

// ---------------------------------------------------------------------------
// Priority mapping
// ---------------------------------------------------------------------------

function mapPriority(raw: string): 'high' | 'medium' | 'low' {
  const p = raw.trim()
  if (p === '高' || p.toLowerCase() === 'high') return 'high'
  if (p === '低' || p.toLowerCase() === 'low') return 'low'
  return 'medium' // 中, Medium, or empty default
}

// ---------------------------------------------------------------------------
// Effort level → estimated hours
// ---------------------------------------------------------------------------

function mapEffort(raw: string): number | null {
  const e = raw.trim()
  if (e === '大') return 16
  if (e === '中') return 8
  if (e === '小') return 4
  return null
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
      return 0
    case 'waiting':
      return 0
  }
}

// ---------------------------------------------------------------------------
// Resolve user ID from email
// ---------------------------------------------------------------------------

function resolveUser(email: string): string | null {
  const e = email.trim().toLowerCase()
  if (!e) return null
  if (USER_MAP[e]) return USER_MAP[e]
  // Try common variations
  const withoutDomain = e.split('@')[0]
  for (const [key, val] of Object.entries(USER_MAP)) {
    if (key.split('@')[0] === withoutDomain) return val
  }
  console.warn(`  [WARN] Unknown user email: ${email}`)
  return null
}

// ---------------------------------------------------------------------------
// Date formatting: ISO 8601 → YYYY-MM-DD (for deadline fields)
// ---------------------------------------------------------------------------

function isoToDate(raw: string): string | null {
  const d = raw.trim()
  if (!d) return null
  try {
    const date = new Date(d)
    if (isNaN(date.getTime())) return null
    return date.toISOString().split('T')[0]
  } catch {
    return null
  }
}

function isoToDatetime(raw: string): string {
  const d = raw.trim()
  if (!d) return new Date().toISOString()
  try {
    const date = new Date(d)
    if (isNaN(date.getTime())) return new Date().toISOString()
    return date.toISOString().replace('Z', '').replace(/\.\d+$/, '')
  } catch {
    return new Date().toISOString()
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const rootDir = path.resolve(__dirname, '..')
  const csvPath = path.join(rootDir, 'docs', 'TaskList.csv')
  const outputDir = path.join(rootDir, 'scripts', 'output')

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Read CSV
  console.log(`Reading ${csvPath}...`)
  let rawContent = fs.readFileSync(csvPath, 'utf-8')
  // Strip BOM
  if (rawContent.charCodeAt(0) === 0xfeff) {
    rawContent = rawContent.slice(1)
  }

  const allRows = parseCSV(rawContent)
  console.log(`Parsed ${allRows.length} rows total (including schema + header)`)

  // Row 0 = schema JSON (ListSchema=...)
  // Row 1 = column headers
  // Row 2+ = data
  if (allRows.length < 3) {
    console.error('Not enough rows in CSV')
    process.exit(1)
  }

  const headers = allRows[1]
  console.log(`Headers (${headers.length} cols): ${headers.join(' | ')}`)

  const dataRows = allRows.slice(2)
  console.log(`Data rows: ${dataRows.length}`)

  // -------------------------------------------------------------------------
  // Pass 1: Collect unique clients
  // -------------------------------------------------------------------------
  const clientSet = new Set<string>()
  const unknownEmails = new Set<string>()
  let okutsuFound = false

  for (const row of dataRows) {
    const clientName = (row[8] || '').trim()
    if (clientName) {
      clientSet.add(clientName)
    }
    // Check owners
    const owners = (row[5] || '').split(';').map((e: string) => e.trim().toLowerCase()).filter(Boolean)
    for (const email of owners) {
      if (email === 'y.okutsu@meetsc.co.jp') okutsuFound = true
      if (!USER_MAP[email]) {
        unknownEmails.add(email)
      }
    }
  }

  // Build client objects (start IDs from c100 to avoid conflict with existing mock data)
  const clientNames = Array.from(clientSet).sort()
  const clients: Client[] = clientNames.map((name, idx) => ({
    id: `c${100 + idx}`,
    name,
    created_at: '2026-01-01T00:00:00',
  }))

  const clientIdMap: Record<string, string> = {}
  for (const c of clients) {
    clientIdMap[c.name] = c.id
  }

  // Default client for tasks without a client
  const defaultClient: Client = {
    id: 'c99',
    name: '社内タスク',
    created_at: '2026-01-01T00:00:00',
  }
  clients.unshift(defaultClient)
  clientIdMap[''] = defaultClient.id

  console.log(`\nUnique clients: ${clientNames.length} (+ 1 default "社内タスク")`)
  for (const c of clients) {
    console.log(`  ${c.id}: ${c.name}`)
  }

  if (unknownEmails.size > 0) {
    console.log(`\nUnknown emails found:`)
    for (const e of unknownEmails) {
      console.log(`  - ${e}`)
    }
  }

  if (okutsuFound) {
    console.log(`\ny.okutsu@meetsc.co.jp found in data -> mapped to user u12`)
  }

  // -------------------------------------------------------------------------
  // Pass 2: Build task objects
  // -------------------------------------------------------------------------
  const tasks: OutputTask[] = []
  const extraAssignees: TaskAssignee[] = []

  // Group by function for project assignment
  const functionProjects: Record<string, string> = {}
  let projCounter = 100

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const taskId = `t${1000 + i}`

    // Col 0: タスク名 → title
    const title = (row[0] || '').trim()
    if (!title) continue // skip empty rows

    // Col 1: ファンクション → project grouping
    const func = (row[1] || '').trim()
    let projectId: string | null = null
    if (func) {
      if (!functionProjects[func]) {
        functionProjects[func] = `proj${projCounter++}`
      }
      projectId = functionProjects[func]
    }

    // Col 2: タスクの種類 (task type)
    const taskType = (row[2] || '').trim()

    // Col 3: 詳細タスク・アクション項目 → description
    const detail = (row[3] || '').trim()

    // Col 4: Status
    const status = mapStatus(row[4] || '')

    // Col 5: Owner (semicolon-separated)
    const ownerEmails = (row[5] || '').split(';').map((e: string) => e.trim().toLowerCase()).filter(Boolean)
    const primaryUserId = ownerEmails.length > 0 ? resolveUser(ownerEmails[0]) : null

    // Additional assignees
    const additionalAssignees: TaskAssignee[] = []
    for (let j = 1; j < ownerEmails.length; j++) {
      const uid = resolveUser(ownerEmails[j])
      if (uid) {
        additionalAssignees.push({
          id: `ta${1000 + i}_${j}`,
          task_id: taskId,
          user_id: uid,
          created_at: '2026-01-01T00:00:00',
        })
      }
    }

    // Col 6: DueDate
    const dueDate = isoToDate(row[6] || '')

    // Col 7: 優先度
    const priority = mapPriority(row[7] || '')

    // Col 8: 顧客名 → client
    const clientName = (row[8] || '').trim()
    const clientId = clientIdMap[clientName] || defaultClient.id

    // Col 9: 工数レベル → estimated_hours
    const estimatedHours = mapEffort(row[9] || '')

    // Col 10: Note
    const note = (row[10] || '').trim()

    // Col 11: 関連ファイル
    const relatedFiles = (row[11] || '').trim()

    // Col 12: 更新日時
    const updatedAt = isoToDatetime(row[12] || '')

    // Build description
    const descParts: string[] = []
    if (detail) descParts.push(detail)
    if (note) descParts.push(`\n---\n備考: ${note}`)
    if (relatedFiles) descParts.push(`\n関連ファイル: ${relatedFiles}`)
    const description = descParts.length > 0 ? descParts.join('\n') : null

    // Build template_data for task type and priority
    const templateData: Record<string, unknown> = {}
    if (taskType) templateData.task_type = taskType
    templateData.priority = priority
    if (func) templateData.function = func

    const task: OutputTask = {
      id: taskId,
      client_id: clientId,
      project_id: projectId,
      title,
      description,
      status,
      progress: progressFromStatus(status),
      requested_by: 'u2', // default: o.yasuda (admin/COO)
      assigned_to: primaryUserId,
      director_id: 'u2', // default director
      desired_deadline: dueDate,
      confirmed_deadline: dueDate,
      estimated_hours: estimatedHours,
      actual_hours: 0,
      reference_url: null,
      is_draft: false,
      template_id: null,
      template_data: Object.keys(templateData).length > 0 ? templateData : null,
      parent_task_id: null,
      wbs_code: String(i + 1),
      start_date: null,
      created_at: updatedAt, // use modified date as approximation
      updated_at: updatedAt,
      _function: func || undefined,
      _extra_assignees: additionalAssignees.length > 0 ? additionalAssignees : undefined,
    }

    tasks.push(task)
    extraAssignees.push(...additionalAssignees)
  }

  console.log(`\nGenerated ${tasks.length} tasks`)
  console.log(`Extra assignees (multi-assign): ${extraAssignees.length}`)

  // Status distribution
  const statusCounts: Record<string, number> = {}
  for (const t of tasks) {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
  }
  console.log(`\nStatus distribution:`)
  for (const [s, c] of Object.entries(statusCounts).sort()) {
    console.log(`  ${s}: ${c}`)
  }

  // Function/project distribution
  console.log(`\nFunction → Project mapping:`)
  for (const [func, projId] of Object.entries(functionProjects).sort()) {
    const count = tasks.filter((t) => t.project_id === projId).length
    console.log(`  ${func} → ${projId} (${count} tasks)`)
  }

  // -------------------------------------------------------------------------
  // Write output
  // -------------------------------------------------------------------------

  const clientsPath = path.join(outputDir, 'clients.json')
  fs.writeFileSync(clientsPath, JSON.stringify(clients, null, 2), 'utf-8')
  console.log(`\nWrote ${clientsPath} (${clients.length} clients)`)

  // Also output projects mapping
  const projects = Object.entries(functionProjects).map(([func, projId]) => ({
    id: projId,
    name: func,
    description: `Imported from SharePoint TaskList - ${func}`,
    status: 'active',
    created_at: '2026-01-01T00:00:00',
    updated_at: '2026-01-01T00:00:00',
  }))
  const projectsPath = path.join(outputDir, 'projects.json')
  fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2), 'utf-8')
  console.log(`Wrote ${projectsPath} (${projects.length} projects)`)

  const tasksPath = path.join(outputDir, 'tasks.json')
  fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2), 'utf-8')
  console.log(`Wrote ${tasksPath} (${tasks.length} tasks)`)

  // Output extra assignees
  if (extraAssignees.length > 0) {
    const assigneesPath = path.join(outputDir, 'task_assignees.json')
    fs.writeFileSync(assigneesPath, JSON.stringify(extraAssignees, null, 2), 'utf-8')
    console.log(`Wrote ${assigneesPath} (${extraAssignees.length} extra assignees)`)
  }

  // Output new user if found
  if (okutsuFound) {
    const newUserPath = path.join(outputDir, 'new_user.json')
    fs.writeFileSync(newUserPath, JSON.stringify(NEW_USER, null, 2), 'utf-8')
    console.log(`Wrote ${newUserPath} (new user: y.okutsu@meetsc.co.jp)`)
  }

  console.log('\nDone!')
}

main()
