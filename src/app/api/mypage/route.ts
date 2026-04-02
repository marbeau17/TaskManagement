import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { getMyPageData } = await import('@/lib/data/mypage')
    const data = await getMyPageData(user.id)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[MyPage API]', error)
    return NextResponse.json({ error: 'Failed to fetch mypage data' }, { status: 500 })
  }
}
