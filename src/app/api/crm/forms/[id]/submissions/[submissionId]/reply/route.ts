import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; submissionId: string }> }) {
  try {
    const { id: formId, submissionId } = await params
    const { subject, body, reply_to } = await request.json()

    if (!body?.trim() || !reply_to?.trim()) {
      return NextResponse.json({ error: 'Body and reply_to are required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    // Get current user
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Send email
    const { sendEmail } = await import('@/lib/email/send-email')
    await sendEmail({
      to: reply_to,
      subject: subject || `Re: お問い合わせの件`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <p>${body.replace(/\n/g, '<br>')}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#6b7280;font-size:12px">Meets Consulting</p>
      </div>`,
    })

    // Save reply record
    const { data: reply, error: replyError } = await db
      .from('crm_submission_replies')
      .insert({
        submission_id: submissionId,
        reply_to,
        subject: subject || `Re: お問い合わせの件`,
        body,
        sent_by: user?.id ?? null,
      })
      .select()
      .single()

    if (replyError) {
      return NextResponse.json({ error: replyError.message }, { status: 500 })
    }

    // Update submission status
    await db
      .from('crm_form_submissions')
      .update({ status: 'contacted', replied_at: new Date().toISOString(), replied_by: user?.id ?? null })
      .eq('id', submissionId)

    // Create CRM activity if contact linked
    const { data: submission } = await db
      .from('crm_form_submissions')
      .select('contact_id')
      .eq('id', submissionId)
      .single()

    if (submission?.contact_id) {
      await db.from('crm_activities').insert({
        entity_type: 'contact',
        entity_id: submission.contact_id,
        activity_type: 'email',
        subject: `返信: ${subject || 'お問い合わせの件'}`,
        body: body.slice(0, 500),
        user_id: user?.id,
        is_completed: true,
        completed_at: new Date().toISOString(),
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, reply })
  } catch (error) {
    console.error('[Submission Reply]', error)
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 })
  }
}

// GET: List replies for a submission
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string; submissionId: string }> }) {
  try {
    const { submissionId } = await params
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    const { data, error } = await db
      .from('crm_submission_replies')
      .select('*, sender:users!sent_by(id, name)')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
