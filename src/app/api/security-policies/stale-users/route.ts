import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * パスワード期限が近い / 超過しているユーザー一覧を返す。
 * admin のみアクセス可。期限まで warn_before_days 以下のユーザーを抽出。
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

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

    const { data: policy } = await (admin as any)
      .from('security_policies')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    const maxAgeDays = policy?.password_max_age_days ?? 30
    const warnBeforeDays = policy?.warn_before_days ?? 7

    const { data: users } = await (admin as any)
      .from('users')
      .select('id, name, email, password_changed_at, is_active')
      .eq('is_active', true)

    const now = Date.now()
    const stale: Array<{
      id: string
      name: string
      email: string
      password_changed_at: string | null
      daysOverdue: number // 正: 超過日数 / 負: 残日数
    }> = []
    for (const u of (users ?? []) as Array<{
      id: string
      name: string
      email: string
      password_changed_at: string | null
    }>) {
      if (!u.password_changed_at) {
        stale.push({ ...u, daysOverdue: 9999 })
        continue
      }
      const changedMs = new Date(u.password_changed_at).getTime()
      const ageDays = Math.floor((now - changedMs) / (1000 * 60 * 60 * 24))
      const remaining = maxAgeDays - ageDays
      if (remaining <= warnBeforeDays) {
        stale.push({ ...u, daysOverdue: -remaining })
      }
    }
    stale.sort((a, b) => b.daysOverdue - a.daysOverdue)

    return NextResponse.json({ users: stale, policy })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
