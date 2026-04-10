#!/usr/bin/env npx tsx
/**
 * migrate-to-supabase.ts
 *
 * One-time migration script to insert 540 parsed CSV tasks into the Supabase
 * database. Uses the service-role key for admin access.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Client name aliases (same as imported-data.ts)
// ---------------------------------------------------------------------------

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
// Status mapping (handles already-mapped values from parse-tasklist.ts)
// ---------------------------------------------------------------------------

function mapStatus(s: string): string {
  switch (s.trim()) {
    case 'done': case 'Completed': case 'Done': return 'done'
    case 'in_progress': case 'Inprogress': case 'In progress': return 'in_progress'
    case 'todo': case 'NotStarted': case 'Not started': return 'todo'
    case 'rejected': case 'Dropped': return 'rejected'
    case 'waiting': case '': default: return 'waiting'
  }
}

function progressFromStatus(status: string): number {
  switch (status) {
    case 'done': return 100
    case 'in_progress': return 50
    default: return 0
  }
}

function mapPriorityToHours(priority: string): number | null {
  switch (priority?.trim()) {
    case '大': case '高': case 'high': case 'High': return 16
    case '中': case 'medium': case 'Medium': return 8
    case '小': case '低': case 'low': case 'Low': return 4
    default: return null
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // 1. Load parsed tasks
  const jsonPath = path.resolve(__dirname, '..', 'public', 'data', 'parsed-tasks.json')
  const parsedTasks = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Array<{
    taskName: string
    function: string
    taskType: string
    description: string
    status: string
    owners: string[]
    dueDate: string
    priority: string
    clientName: string
    estimatedHours: number
    note: string
    relatedFiles: string
    updatedAt: string
  }>

  console.log(`Loaded ${parsedTasks.length} tasks from parsed-tasks.json`)

  // 2. Get existing users (email → id)
  const { data: users, error: userErr } = await supabase.from('users').select('id, email')
  if (userErr) { console.error('Failed to fetch users:', userErr); process.exit(1) }
  const userMap = new Map<string, string>()
  for (const u of users ?? []) {
    if (u.email) userMap.set(u.email.toLowerCase(), u.id)
  }
  console.log(`Found ${userMap.size} users in database`)

  // 3. Get or create clients
  const { data: existingClients } = await supabase.from('clients').select('id, name')
  const clientMap = new Map<string, string>()
  for (const c of existingClients ?? []) {
    clientMap.set(c.name, c.id)
  }
  console.log(`Found ${clientMap.size} existing clients`)

  // Collect unique canonical client names from tasks
  const neededClients = new Set<string>()
  for (const t of parsedTasks) {
    if (t.clientName) {
      neededClients.add(canonicalClientName(t.clientName))
    }
  }

  // Create missing clients
  let createdClients = 0
  for (const name of neededClients) {
    if (!clientMap.has(name)) {
      const { data, error } = await supabase
        .from('clients')
        .insert({ name })
        .select('id')
        .single()
      if (error) {
        console.error(`  Failed to create client "${name}":`, error.message)
      } else {
        clientMap.set(name, data.id)
        createdClients++
      }
    }
  }
  console.log(`Created ${createdClients} new clients`)

  // 4. Find a default requester (安田 or first admin)
  const defaultRequester = userMap.get('o.yasuda@meetsc.co.jp')
  if (!defaultRequester) {
    console.error('Default requester (o.yasuda@meetsc.co.jp) not found in database')
    console.log('Available users:', [...userMap.entries()].map(([e, id]) => `${e} => ${id}`).join('\n'))
    process.exit(1)
  }
  console.log(`Default requester: ${defaultRequester}`)

  // 5. Check for already-migrated tasks (avoid duplicates)
  const { count: existingTaskCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
  console.log(`Existing tasks in database: ${existingTaskCount}`)

  // Check if first CSV task already exists
  const { data: existingCheck } = await supabase
    .from('tasks')
    .select('id')
    .eq('title', parsedTasks[0].taskName)
    .limit(1)
  if (existingCheck && existingCheck.length > 0) {
    console.log('First CSV task already exists in database — migration may have already run.')
    console.log('To re-run, delete existing CSV tasks first.')
    const answer = await new Promise<string>((resolve) => {
      process.stdout.write('Continue anyway? (y/N): ')
      process.stdin.once('data', (data) => resolve(data.toString().trim()))
    })
    if (answer.toLowerCase() !== 'y') {
      console.log('Aborted.')
      process.exit(0)
    }
  }

  // 6. Insert tasks in batches
  const BATCH_SIZE = 50
  let successCount = 0
  let errorCount = 0
  const errors: { index: number; title: string; message: string }[] = []

  for (let batch = 0; batch < parsedTasks.length; batch += BATCH_SIZE) {
    const batchTasks = parsedTasks.slice(batch, batch + BATCH_SIZE)
    const insertRows = []

    for (let i = 0; i < batchTasks.length; i++) {
      const t = batchTasks[i]
      const globalIndex = batch + i
      const status = mapStatus(t.status)
      const canonical = t.clientName ? canonicalClientName(t.clientName) : null
      const clientId = canonical ? clientMap.get(canonical) : null

      // Use first available client as fallback for tasks without a client
      const fallbackClientId = clientMap.values().next().value
      const resolvedClientId = clientId ?? fallbackClientId
      if (!resolvedClientId) {
        errorCount++
        errors.push({ index: globalIndex, title: t.taskName, message: `No client available` })
        continue
      }

      // Owner handling
      const ownerEmails = t.owners || []
      const assignedTo = ownerEmails.length > 0
        ? userMap.get(ownerEmails[0].toLowerCase()) ?? null
        : null

      // Description: combine details + note
      const descParts: string[] = []
      if (t.description) descParts.push(t.description)
      if (t.note) descParts.push(`[Note] ${t.note}`)
      const description = descParts.length > 0 ? descParts.join('\n\n') : null

      // Due date
      let confirmedDeadline: string | null = null
      if (t.dueDate) {
        try {
          const d = new Date(t.dueDate)
          if (!isNaN(d.getTime())) confirmedDeadline = d.toISOString().slice(0, 10)
        } catch { /* skip */ }
      }

      // Updated at
      let updatedAt = '2025-01-01T00:00:00'
      if (t.updatedAt) {
        try {
          const d = new Date(t.updatedAt)
          if (!isNaN(d.getTime())) updatedAt = d.toISOString()
        } catch { /* skip */ }
      }

      insertRows.push({
        client_id: resolvedClientId,
        title: t.taskName || `(無題タスク ${globalIndex + 1})`,
        description,
        status,
        progress: progressFromStatus(status),
        requested_by: defaultRequester,
        assigned_to: assignedTo,
        director_id: assignedTo ? defaultRequester : null,
        desired_deadline: null,
        confirmed_deadline: confirmedDeadline,
        estimated_hours: mapPriorityToHours(t.priority),
        actual_hours: 0,
        reference_url: null,
        is_draft: false,
        parent_task_id: null,
        wbs_code: `CSV-${globalIndex + 1}`,
        start_date: null,
        created_at: updatedAt,
        updated_at: updatedAt,
      })
    }

    if (insertRows.length === 0) continue

    const { data: inserted, error: insertErr } = await supabase
      .from('tasks')
      .insert(insertRows)
      .select('id')

    if (insertErr) {
      console.error(`  Batch ${batch}-${batch + batchTasks.length} error:`, insertErr.message)
      errorCount += insertRows.length
      for (let i = 0; i < insertRows.length; i++) {
        errors.push({ index: batch + i, title: insertRows[i].title, message: insertErr.message })
      }
    } else {
      successCount += (inserted?.length ?? 0)
      process.stdout.write(`  Inserted ${successCount}/${parsedTasks.length}\r`)
    }
  }

  console.log(`\n\n=== Migration Complete ===`)
  console.log(`Success: ${successCount}`)
  console.log(`Errors:  ${errorCount}`)
  if (errors.length > 0) {
    console.log(`\nFirst 10 errors:`)
    for (const e of errors.slice(0, 10)) {
      console.log(`  [${e.index}] ${e.title}: ${e.message}`)
    }
  }

  // 7. Handle additional assignees
  console.log('\nInserting additional assignees...')
  let assigneeCount = 0
  const { data: allNewTasks } = await supabase
    .from('tasks')
    .select('id, title, wbs_code')
    .like('wbs_code', 'CSV-%')
    .order('wbs_code')

  if (allNewTasks) {
    for (let i = 0; i < parsedTasks.length && i < allNewTasks.length; i++) {
      const t = parsedTasks[i]
      const dbTask = allNewTasks[i]
      if (t.owners && t.owners.length > 1) {
        const additionalEmails = t.owners.slice(1)
        const assigneeRows = additionalEmails
          .map((email: string) => {
            const userId = userMap.get(email.toLowerCase())
            return userId ? { task_id: dbTask.id, user_id: userId } : null
          })
          .filter(Boolean) as { task_id: string; user_id: string }[]

        if (assigneeRows.length > 0) {
          const { error } = await supabase.from('task_assignees').insert(assigneeRows)
          if (!error) assigneeCount += assigneeRows.length
        }
      }
    }
  }
  console.log(`Added ${assigneeCount} additional assignees`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
