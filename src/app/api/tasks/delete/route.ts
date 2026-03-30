import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { taskIds } = await request.json()

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'taskIds required' }, { status: 400 })
    }

    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()

    // Delete related records first (FK constraints)
    for (const table of ['comments', 'activity_logs', 'attachments', 'task_assignees', 'task_dependencies']) {
      await supabase.from(table).delete().in('task_id', taskIds)
    }

    // Delete the tasks
    const { error, count } = await supabase
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
