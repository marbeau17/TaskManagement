import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendPasswordExpiryEmail } from '@/lib/email/password-expiry'

/**
 * 指定ユーザーに個別パスワード更新リマインドを送信。admin only。
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = (await request.json()) as { userId?: string }
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    const { data: adminRow } = await admin
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .maybeSingle()
    if ((adminRow as { role?: string } | null)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
    }

    const { data: target } = await (admin as any)
      .from('users')
      .select('id, name, email, password_changed_at')
      .eq('id', userId)
      .maybeSingle()
    if (!target) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const { data: policy } = await (admin as any)
      .from('security_policies')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    const maxAge = policy?.password_max_age_days ?? 30

    const t = target as { id: string; name: string; email: string; password_changed_at: string | null }
    const ageDays = t.password_changed_at
      ? Math.floor((Date.now() - new Date(t.password_changed_at).getTime()) / (1000 * 60 * 60 * 24))
      : 9999
    const daysRemaining = maxAge - ageDays

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.meetsc.co.jp'
    await sendPasswordExpiryEmail({
      to: t.email,
      userName: t.name,
      daysRemaining,
      maxAgeDays: maxAge,
      loginUrl: `${baseUrl}/profile`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
