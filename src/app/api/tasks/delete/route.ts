import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { taskIds, force } = await request.json()

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'taskIds required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    if (force) {
      // Hard delete with cascade
      const relatedTables = ['comments', 'activity_logs', 'attachments', 'task_assignees']
      for (const table of relatedTables) {
        const { error: relError } = await db.from(table).delete().in('task_id', taskIds)
        if (relError) console.error(`Failed to delete from ${table}:`, relError.message)
      }
      const { data, error } = await db.from('tasks').delete().in('id', taskIds).select('id')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, deleted: data?.length ?? 0 })
    } else {
      // Soft delete: set status to rejected
      const { data, error } = await db
        .from('tasks')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .in('id', taskIds)
        .select('id')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, deleted: data?.length ?? 0, soft: true })
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
