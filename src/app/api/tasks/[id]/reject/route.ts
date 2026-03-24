import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const useMock = () => process.env.NEXT_PUBLIC_USE_MOCK === 'true'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (useMock()) {
      const { updateMockTask } = await import('@/lib/mock/handlers')
      const task = updateMockTask(id, { status: 'rejected' })
      return NextResponse.json(task)
    }

    const { createServerSupabaseClient } = await import(
      '@/lib/supabase/server'
    )
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reject task', detail: String(error) },
      { status: 500 }
    )
  }
}
