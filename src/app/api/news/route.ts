import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('news_articles')
      .select('*, author:users!author_id(name, name_short, avatar_color, avatar_url)')
      .order('published_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query
    if (error) {
      // Fallback: if category column doesn't exist yet, retry without filter
      if (category && error.message?.includes('category')) {
        const { data: fallback, error: fbErr } = await (supabase as any)
          .from('news_articles')
          .select('*, author:users!author_id(name, name_short, avatar_color, avatar_url)')
          .order('published_at', { ascending: false })
        if (fbErr) return NextResponse.json({ error: fbErr.message }, { status: 500 })
        return NextResponse.json(fallback ?? [])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('news_articles')
      .insert(body)
      .select('*, author:users!author_id(name, name_short, avatar_color)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
