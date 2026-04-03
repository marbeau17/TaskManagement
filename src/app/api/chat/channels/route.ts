import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    const { data, error } = await db
      .from('chat_channels')
      .select('*, members:chat_channel_members(user_id, last_read_at)')
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    // Create channel
    const { data: channel, error } = await db
      .from('chat_channels')
      .insert({ name: body.name, description: body.description ?? '', channel_type: body.channel_type ?? 'public', avatar_emoji: body.avatar_emoji ?? '💬', created_by: body.created_by })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Add creator as admin member
    if (body.created_by) {
      await db.from('chat_channel_members').insert({ channel_id: channel.id, user_id: body.created_by, role: 'admin' }).catch(() => {})
    }

    // For public channels, add all active users
    if (body.channel_type === 'public' || !body.channel_type) {
      const { data: users } = await db.from('users').select('id').eq('is_active', true)
      if (users) {
        const members = users.filter((u: any) => u.id !== body.created_by).map((u: any) => ({ channel_id: channel.id, user_id: u.id, role: 'member' }))
        if (members.length > 0) await db.from('chat_channel_members').insert(members).catch(() => {})
      }
    }

    return NextResponse.json(channel)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
