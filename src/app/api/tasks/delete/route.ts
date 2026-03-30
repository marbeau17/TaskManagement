import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { taskIds } = await request.json()

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'taskIds required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Delete related records first (FK constraints)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    await db.from('comments').delete().in('task_id', taskIds)
    await db.from('activity_logs').delete().in('task_id', taskIds)
    await db.from('attachments').delete().in('task_id', taskIds)
    await db.from('task_assignees').delete().in('task_id', taskIds)
    await db.from('task_dependencies').delete().in('task_id', taskIds)

    // Delete the tasks
    const { error, count } = await db
      .from('tasks')
      .delete()
      .in('id', taskIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: count ?? taskIds.length })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
