import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { useMock } from '@/lib/utils'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (useMock()) {
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
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to complete task', detail: String(error) },
      { status: 500 }
    )
  }
}
