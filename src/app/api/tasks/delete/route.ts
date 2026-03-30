import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const logs: string[] = []
  try {
    const body = await request.json()
    const { taskIds } = body
    logs.push(`Received taskIds: ${JSON.stringify(taskIds)}`)

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'taskIds required', logs }, { status: 400 })
    }

    // Check env vars
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    logs.push(`SUPABASE_URL: ${url ? url.substring(0, 30) + '...' : 'MISSING'}`)
    logs.push(`SERVICE_ROLE_KEY: ${serviceKey ? 'SET (' + serviceKey.length + ' chars)' : 'MISSING'}`)

    if (!url || !serviceKey) {
      return NextResponse.json({
        error: 'Missing Supabase credentials',
        logs,
        missingUrl: !url,
        missingKey: !serviceKey,
      }, { status: 500 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Delete related records first
    for (const table of ['comments', 'activity_logs', 'attachments', 'task_assignees', 'task_dependencies']) {
      const result = await db.from(table).delete().in('task_id', taskIds)
      logs.push(`DELETE ${table}: error=${result.error?.message || 'none'}`)
    }

    // Delete the tasks
    const { data, error, count, status, statusText } = await db
      .from('tasks')
      .delete()
      .in('id', taskIds)
      .select('id')

    logs.push(`DELETE tasks: status=${status} statusText=${statusText} error=${error?.message || 'none'} count=${count} data=${JSON.stringify(data)}`)

    if (error) {
      return NextResponse.json({ error: error.message, logs }, { status: 500 })
    }

    const deletedCount = data?.length ?? 0
    logs.push(`Successfully deleted ${deletedCount} tasks`)

    return NextResponse.json({ success: true, deleted: deletedCount, logs })
  } catch (error) {
    logs.push(`EXCEPTION: ${String(error)}`)
    return NextResponse.json({ error: String(error), logs }, { status: 500 })
  }
}
