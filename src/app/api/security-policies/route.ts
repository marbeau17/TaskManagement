import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await (supabase as any)
      .from('security_policies')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json(data ?? null)
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>

    const supabase = await createServerSupabaseClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // admin ロールチェック
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    const { data: userRow } = await admin
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .maybeSingle()
    if ((userRow as { role?: string } | null)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
    }

    // 受け取るフィールドをホワイトリスト
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: authUser.id,
    }
    const allowed = [
      'password_max_age_days',
      'warn_before_days',
      'enforcement_mode',
      'reminder_email_enabled',
      'enabled',
    ] as const
    for (const key of allowed) {
      if (key in body && body[key] !== undefined) patch[key] = body[key]
    }

    const { data, error } = await (admin as any)
      .from('security_policies')
      .update(patch)
      .eq('id', 1)
      .select('*')
      .maybeSingle()
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
