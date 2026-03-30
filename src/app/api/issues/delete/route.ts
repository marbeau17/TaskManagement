import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { issueId } = await request.json()

    if (!issueId) {
      return NextResponse.json({ error: 'issueId required' }, { status: 400 })
    }

    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()

    // Delete related records first
    await (supabase as any).from('issue_comments').delete().eq('issue_id', issueId)
    await (supabase as any).from('issue_activity_logs').delete().eq('issue_id', issueId)
    await (supabase as any).from('issue_relations').delete().or(`source_issue_id.eq.${issueId},target_issue_id.eq.${issueId}`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('issues').delete().eq('id', issueId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
