import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const key = request.nextUrl.searchParams.get('key')

    if (key) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ value: data?.value ?? '' })
    }

    // Get all settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('app_settings')
      .select('key, value')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const result: Record<string, string> = {}
    for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
      result[row.key] = row.value
    }
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key, value } = await request.json()
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('app_settings')
      .upsert({ key, value: value ?? '' }, { onConflict: 'key' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
