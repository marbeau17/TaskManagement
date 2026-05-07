import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * 初回ログイン時のパスワード変更後に、users.must_change_password フラグを
 * 解除するための admin 専用エンドポイント。
 *
 * auth.updateUser はクライアント側のセッションで実行済みである前提。
 * ここでは admin 権限が必要な DB 更新のみを担当する。
 */
export async function POST(request: Request) {
  const tag = '[force-change-password]'
  try {
    const cookieHeader = request.headers.get('cookie') || ''
    const cookieKeys = cookieHeader
      .split(';')
      .map((c) => c.trim().split('=')[0])
      .filter(Boolean)
    console.log(`${tag} POST received | cookies=${cookieKeys.length} keys=`, cookieKeys)

    const body = (await request.json()) as { userId?: string }
    const { userId } = body
    console.log(`${tag} body=`, body)

    if (!userId) {
      console.warn(`${tag} 400: missing userId`)
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 }
      )
    }

    // 自分自身のフラグだけ解除できるよう、リクエスト元セッションと userId が一致するか確認。
    const supabase = await createServerSupabaseClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()
    console.log(
      `${tag} session check | authUserId=${authUser?.id ?? 'null'} authEmail=${authUser?.email ?? 'null'} authError=${authError?.message ?? 'none'}`
    )

    if (authError || !authUser) {
      console.warn(`${tag} 401: no session`)
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    if (authUser.id !== userId) {
      console.warn(`${tag} 403: id mismatch (session=${authUser.id} vs body=${userId})`)
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    // 事前 SELECT でレコードの存在を確認
    const { data: pre, error: preErr } = await admin
      .from('users')
      .select('id,email,must_change_password,is_active')
      .eq('id', userId)
      .maybeSingle()
    console.log(`${tag} pre-update lookup:`, pre, 'err=', preErr?.message ?? 'none')
    if (preErr || !pre) {
      return NextResponse.json(
        { success: false, error: preErr?.message || 'User row not found' },
        { status: 500 }
      )
    }

    const MAX_RETRIES = 3
    let lastErr: unknown = null
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const { data: updated, error } = await admin
        .from('users')
        .update({ must_change_password: false })
        .eq('id', userId)
        .select('id,must_change_password')
      console.log(
        `${tag} update attempt ${attempt}/${MAX_RETRIES}:`,
        'rows=', updated?.length ?? 0,
        'err=', error?.message ?? 'none',
        'code=', (error as { code?: string } | null)?.code ?? '-'
      )
      if (!error) {
        if ((updated?.length ?? 0) === 0) {
          console.warn(`${tag} update returned 0 rows (RLS or filter issue?)`)
        }
        return NextResponse.json({ success: true, updated })
      }
      lastErr = error
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, attempt * 500))
      }
    }

    console.error(`${tag} all retries exhausted:`, lastErr)
    return NextResponse.json(
      {
        success: false,
        error:
          lastErr instanceof Error
            ? lastErr.message
            : 'Failed to clear must_change_password',
      },
      { status: 500 }
    )
  } catch (err) {
    console.error(`${tag} Unhandled error:`, err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
