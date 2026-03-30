import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { error: membersError } = await db.from('project_members').delete().eq('project_id', projectId)
    if (membersError) {
      console.error('Failed to delete project_members:', membersError.message)
    }
    const { error } = await db.from('projects').delete().eq('id', projectId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
