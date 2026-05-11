import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isMockMode } from '@/lib/utils'
import { sendTaskCompletionEmail } from '@/lib/email/task-completion'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (isMockMode()) {
      const { updateMockTask } = await import('@/lib/mock/handlers')
      const task = updateMockTask(id, { status: 'done', progress: 100 })
      return NextResponse.json(task)
    }

    const { createServerSupabaseClient } = await import(
      '@/lib/supabase/server'
    )
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'done', progress: 100 })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // WEB-45: notify the requester when a task is completed via this endpoint.
    // Mirrors the in-app updateTask flow so that any path resulting in status='done'
    // emails the requester instead of only the main client-side mutation path.
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const { data: task } = await supabase
        .from('tasks')
        .select('title, estimated_hours, actual_hours, requested_by, client:clients(name)')
        .eq('id', id)
        .single() as { data: any; error: any }
      if (authUser && task?.requested_by) {
        const { data: requester } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', task.requested_by)
          .single()
        const { data: completer } = await supabase
          .from('users')
          .select('name')
          .eq('id', authUser.id)
          .single()
        if (requester?.email) {
          await sendTaskCompletionEmail({
            taskId: id,
            taskTitle: task.title ?? '',
            clientName: task.client?.name ?? '',
            completedByName: completer?.name ?? '',
            estimatedHours: task.estimated_hours ?? null,
            actualHours: task.actual_hours ?? 0,
            requesterEmail: requester.email,
            requesterName: requester.name,
            completerId: authUser.id,
            requesterId: requester.id,
          })
        }
      }
    } catch (notifyErr) {
      console.error('[WEB-45] complete endpoint notification failed:', notifyErr)
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to complete task', detail: String(error) },
      { status: 500 }
    )
  }
}
