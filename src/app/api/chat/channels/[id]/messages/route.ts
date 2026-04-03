import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const before = searchParams.get('before') // cursor for pagination

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    let query = db
      .from('chat_messages')
      .select('*, user:users(id, name, name_short, avatar_color, avatar_url), reactions:chat_reactions(id, emoji, user_id)')
      .eq('channel_id', id)
      .is('thread_id', null) // Only top-level messages
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) query = query.lt('created_at', before)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Reverse to show oldest first in UI
    return NextResponse.json((data ?? []).reverse())
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    const messageData = {
      channel_id: id,
      user_id: body.user_id,
      content: body.content,
      message_type: body.message_type ?? 'text',
      thread_id: body.thread_id ?? null,
      file_url: body.file_url ?? '',
      file_name: body.file_name ?? '',
      mentions: body.mentions ?? [],
    }

    const { data, error } = await db
      .from('chat_messages')
      .insert(messageData)
      .select('*, user:users(id, name, name_short, avatar_color, avatar_url)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update channel updated_at
    await db.from('chat_channels').update({ updated_at: new Date().toISOString() }).eq('id', id).catch(() => {})

    // If thread reply, increment parent reply_count
    if (body.thread_id) {
      await db.rpc('increment', { row_id: body.thread_id, table_name: 'chat_messages', column_name: 'reply_count' }).catch(() => {
        // Fallback: manual increment
        db.from('chat_messages').select('reply_count').eq('id', body.thread_id).single().then(({ data: parent }: any) => {
          if (parent) db.from('chat_messages').update({ reply_count: (parent.reply_count ?? 0) + 1 }).eq('id', body.thread_id)
        }).catch(() => {})
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
