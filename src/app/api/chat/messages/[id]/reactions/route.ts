import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: messageId } = await params
    const { user_id, emoji } = await request.json()

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    // Check if reaction already exists
    const { data: existing } = await db
      .from('chat_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user_id)
      .eq('emoji', emoji)
      .single()

    if (existing) {
      // Remove reaction
      await db.from('chat_reactions').delete().eq('id', existing.id)
      return NextResponse.json({ action: 'removed' })
    } else {
      // Add reaction
      const { data, error } = await db
        .from('chat_reactions')
        .insert({ message_id: messageId, user_id, emoji })
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ action: 'added', reaction: data })
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
