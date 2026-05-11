import { NextRequest, NextResponse } from 'next/server'
import { sendPasswordExpiryEmail } from '@/lib/email/password-expiry'

/**
 * 日次 cron: パスワード更新期限が近い / 超過しているユーザーにメール送信。
 *
 * 送信タイミング:
 *   残日数 == warn_before_days (例: 7日前): 注意喚起
 *   残日数 == 0 (当日): 期限当日通知
 *   残日数 < 0 (毎日): 期限超過リマインド (毎日送信は迷惑なので 7 日毎)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: policy } = await (admin as any)
      .from('security_policies')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (!policy || !policy.enabled || !policy.reminder_email_enabled) {
      return NextResponse.json({ success: true, sent: 0, message: 'Policy disabled' })
    }

    const maxAge = policy.password_max_age_days as number
    const warnBefore = policy.warn_before_days as number

    // password_changed_at は generated types 未反映のため as any でバイパス
    const { data: users, error } = await (admin as any)
      .from('users')
      .select('id, name, email, password_changed_at')
      .eq('is_active', true)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.meetsc.co.jp'
    const now = Date.now()
    let sent = 0
    const errors: string[] = []

    for (const u of (users ?? []) as Array<{
      id: string
      name: string
      email: string
      password_changed_at: string | null
    }>) {
      if (!u.email) continue
      const changedMs = u.password_changed_at
        ? new Date(u.password_changed_at).getTime()
        : 0
      const ageDays = changedMs > 0
        ? Math.floor((now - changedMs) / (1000 * 60 * 60 * 24))
        : 9999
      const remaining = maxAge - ageDays

      // 送信条件: 7日前 (==warnBefore) / 当日 (==0) / 超過後は7日毎
      let shouldSend = false
      if (remaining === warnBefore) shouldSend = true
      else if (remaining === 0) shouldSend = true
      else if (remaining < 0 && Math.abs(remaining) % 7 === 0) shouldSend = true

      if (!shouldSend) continue

      try {
        await sendPasswordExpiryEmail({
          to: u.email,
          userName: u.name,
          daysRemaining: remaining,
          maxAgeDays: maxAge,
          loginUrl: `${baseUrl}/profile`,
        })
        sent++
      } catch (e) {
        errors.push(`${u.email}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    return NextResponse.json({ success: true, sent, errors })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
