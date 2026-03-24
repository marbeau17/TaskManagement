import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const useMock = () => process.env.NEXT_PUBLIC_USE_MOCK === 'true'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { assigned_to, confirmed_deadline, estimated_hours } = body

    if (!assigned_to || !confirmed_deadline || estimated_hours == null) {
      return NextResponse.json(
        { error: 'assigned_to, confirmed_deadline, and estimated_hours are required' },
        { status: 400 }
      )
    }

    if (useMock()) {
      const { assignMockTask } = await import('@/lib/mock/handlers')
      const task = assignMockTask(id, {
        assigned_to,
        confirmed_deadline,
        estimated_hours,
      })
      return NextResponse.json(task)
    }

    const { createServerSupabaseClient } = await import(
      '@/lib/supabase/server'
    )
    const supabase = await createServerSupabaseClient()

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('tasks')
      .update({
        assigned_to,
        confirmed_deadline,
        estimated_hours,
        director_id: authUser?.id ?? null,
        status: 'todo',
        is_draft: false,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to assign task', detail: String(error) },
      { status: 500 }
    )
  }
}
