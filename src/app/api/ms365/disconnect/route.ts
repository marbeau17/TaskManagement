import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    // Delete tokens
    await db.from('ms365_tokens').delete().eq('user_id', user.id)
    // Delete synced events
    await db.from('calendar_events').delete().eq('user_id', user.id)
    // Update user flag
    await db.from('users').update({ ms365_connected: false }).eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
