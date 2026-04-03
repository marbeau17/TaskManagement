import { NextRequest, NextResponse } from 'next/server'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    // 1. Get campaign
    const { data: campaign, error: campErr } = await db.from('crm_campaigns').select('*').eq('id', id).single()
    if (campErr || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    if (campaign.status === 'sent') return NextResponse.json({ error: 'Already sent' }, { status: 409 })

    // 2. Update status to sending
    await db.from('crm_campaigns').update({ status: 'sending', updated_at: new Date().toISOString() }).eq('id', id)

    // 3. Query contacts matching segment
    const segment = campaign.target_segment ?? {}
    let query = db.from('crm_contacts').select('id, first_name, last_name, email, line_user_id, email_opt_in, line_opt_in')

    if (segment.lifecycle_stage?.length) query = query.in('lifecycle_stage', segment.lifecycle_stage)
    if (segment.source_channel?.length) query = query.in('source_channel', segment.source_channel)
    if (segment.decision_maker !== undefined) query = query.eq('decision_maker', segment.decision_maker)
    if (segment.preferred_language) query = query.eq('preferred_language', segment.preferred_language)
    if (segment.email_opt_in !== undefined) query = query.eq('email_opt_in', segment.email_opt_in)
    if (segment.lead_score_min !== undefined) query = query.gte('lead_score', segment.lead_score_min)
    if (segment.lead_score_max !== undefined) query = query.lte('lead_score', segment.lead_score_max)

    const { data: contacts } = await query
    if (!contacts || contacts.length === 0) {
      await db.from('crm_campaigns').update({ status: 'sent', sent_count: 0, sent_at: new Date().toISOString() }).eq('id', id)
      return NextResponse.json({ success: true, sent: 0, message: 'No matching contacts' })
    }

    // 4. Filter by channel opt-in
    const eligible = contacts.filter((c: any) => {
      if (campaign.campaign_type === 'email') return c.email && c.email_opt_in !== false
      if (campaign.campaign_type === 'line') return c.line_user_id && c.line_opt_in !== false
      return c.email || c.line_user_id
    })

    // 5. Create recipient records
    const recipients = eligible.map((c: any) => ({
      campaign_id: id,
      contact_id: c.id,
      channel: campaign.campaign_type === 'line' ? 'line' : 'email',
      status: 'pending',
    }))

    if (recipients.length > 0) {
      await db.from('crm_campaign_recipients').insert(recipients).catch(() => {})
    }

    // 6. Send emails (for email campaigns)
    let sentCount = 0
    if (campaign.campaign_type === 'email' || campaign.campaign_type === 'multi') {
      const { sendEmail } = await import('@/lib/email/send-email')
      const content = campaign.content ?? {}
      const emailHtml = content.email_html ?? `<p>${campaign.description}</p>`

      for (const contact of eligible.filter((c: any) => c.email)) {
        try {
          // Personalize
          const personalizedHtml = emailHtml
            .replace(/\{\{first_name\}\}/g, contact.first_name ?? '')
            .replace(/\{\{last_name\}\}/g, contact.last_name ?? '')

          await sendEmail({
            to: contact.email,
            subject: campaign.subject || campaign.name,
            html: personalizedHtml,
          })

          await db.from('crm_campaign_recipients')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('campaign_id', id)
            .eq('contact_id', contact.id)

          sentCount++
        } catch (err) {
          console.error(`[Campaign Send] Failed for ${contact.email}:`, err)
          await db.from('crm_campaign_recipients')
            .update({ status: 'bounced' })
            .eq('campaign_id', id)
            .eq('contact_id', contact.id)
        }
      }
    }

    // 7. Update campaign stats
    await db.from('crm_campaigns').update({
      status: 'sent',
      sent_count: sentCount,
      target_count: eligible.length,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    return NextResponse.json({ success: true, sent: sentCount, target: eligible.length })
  } catch (error) {
    console.error('[Campaign Send]', error)
    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 })
  }
}
