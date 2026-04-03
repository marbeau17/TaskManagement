import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { content } = await request.json()
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    const { data, error } = await db
      .from('chat_messages')
      .update({ content, is_edited: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    const { error } = await db
      .from('chat_messages')
      .update({ is_deleted: true, content: '', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
