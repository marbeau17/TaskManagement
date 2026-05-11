import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * パスワード変更成功時に users.password_changed_at を NOW() で更新する。
 * 自身のレコードのみ更新可能 (セッション uid と body.userId が一致する必要あり)。
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
    if (authUser.id !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    // password_changed_at は generated types 未反映 (migration 066) のため as any でバイパス
    const { error } = await (admin as any)
      .from('users')
      .update({ password_changed_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
