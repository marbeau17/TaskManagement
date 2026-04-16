import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

/* ---------- CORS preflight ---------- */
export function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: corsHeaders })
}

/* ---------- POST: public form submission ---------- */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json()
    // Support both direct fields and { values: {...} } wrapper from form page
    const body = rawBody.values ? { ...rawBody.values, formId: rawBody.formId, slug: rawBody.slug } : rawBody

    // --- validate required fields ---
    const missing: string[] = []
    if (!body.company) missing.push('company')
    if (!body.name) missing.push('name')
    if (!body.email) missing.push('email')
    if (!body.issue) missing.push('issue')

    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `必須項目が不足しています: ${missing.join(', ')}` },
        { status: 400, headers: corsHeaders },
      )
    }

    // --- admin client (unauthenticated endpoint) ---
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    // --- find or create company ---
    const { data: existingCompany } = await db
      .from('crm_companies')
      .select('id')
      .eq('name', body.company)
      .maybeSingle()

    let companyId = existingCompany?.id

    if (!companyId) {
      const { data: newComp } = await db
        .from('crm_companies')
        .insert({
          name: body.company,
          industry: body.industry,
          size: body.employees || null,
        })
        .select('id')
        .single()
      companyId = newComp?.id
    }

    // --- find or create contact ---
    const { data: existingContact } = await db
      .from('crm_contacts')
      .select('id')
      .eq('email', body.email)
      .maybeSingle()

    let contactId = existingContact?.id

    if (!contactId) {
      const nameParts = body.name.split(' ')
      const { data: newContact } = await db
        .from('crm_contacts')
        .insert({
          first_name: nameParts[0] || body.name,
          last_name: nameParts.slice(1).join(' ') || '',
          email: body.email,
          company_id: companyId,
          job_title: body.position,
          lifecycle_stage: 'lead',
          lead_status: 'new',
          source: 'hearing_form',
        })
        .select('id')
        .single()
      contactId = newContact?.id
    }

    // --- create CRM lead with all form data ---
    const themes = Array.isArray(body.themes) ? body.themes.join(', ') : (body.themes || '')
    const expectations = Array.isArray(body.expectations) ? body.expectations.join(', ') : (body.expectations || '')
    const budgetLabels = ['未定', '〜5万円', '5〜15万円', '15〜30万円', '30〜50万円', '制限なし']
    const budgetDisplay = body.budget !== undefined ? (budgetLabels[parseInt(body.budget)] || body.budget) : '未定'

    await db.from('crm_leads').insert({
      title: `${body.company} - 経営相談会`,
      contact_id: contactId,
      company_id: companyId,
      status: 'new',
      notes: [
        `【基本情報】`,
        `会社名: ${body.company}`,
        `業種: ${body.industry || '未回答'}`,
        `担当者: ${body.name}`,
        `役職: ${body.position || '未回答'}`,
        `従業員数: ${body.employees || '未回答'}`,
        `年商: ${body.revenue || '未回答'}`,
        `メール: ${body.email}`,
        ``,
        `【相談テーマ】`,
        themes || '未選択',
        ``,
        `【課題】`,
        `現在の課題: ${body.issue}`,
        body.tried ? `過去の施策: ${body.tried}` : '',
        body.duration ? `課題期間: ${body.duration}` : '',
        ``,
        `【緊急度】${body.urgency || body.decision_maker ? '' : ''}`,
        body.urgency ? `緊急度: ${body.urgency}` : '',
        ``,
        `【予算】${budgetDisplay}`,
        ``,
        `【意思決定】${body.decision_maker || body.authority || '未回答'}`,
        ``,
        `【期待すること】`,
        expectations || '未選択',
        body.expectations_other || body.freeText ? `その他: ${body.expectations_other || body.freeText}` : '',
      ]
        .filter(line => line !== undefined)
        .join('\n'),
    })

    // --- also create CRM form submission if formId provided ---
    if (body.formId) {
      try {
        await db.from('crm_form_submissions').insert({
          form_id: body.formId,
          contact_id: contactId,
          data: body,
          status: 'new',
        })
      } catch {}
    }

    // --- activity log ---
    await db.from('crm_activities').insert({
      entity_type: 'contact',
      entity_id: contactId,
      type: 'system',
      subject: '事前ヒアリングシート送信',
      body: JSON.stringify(body),
    })

    // --- send thank you email ---
    try {
      const { sendFormThankYouEmail } = await import('@/lib/email/form-thank-you')

      // Resolve booked slot info if booking_slot_id provided
      let bookedSlot: { number: number; startTime: string; endTime: string } | null = null
      if (body.booking_slot_id) {
        const { data: slot } = await db.from('booking_slots').select('slot_number, start_time, end_time').eq('id', body.booking_slot_id).single()
        if (slot) bookedSlot = { number: slot.slot_number, startTime: slot.start_time, endTime: slot.end_time }
      }

      await sendFormThankYouEmail({
        recipientName: body.name,
        recipientEmail: body.email,
        company: body.company,
        bookedSlot,
        themes: Array.isArray(body.themes) ? body.themes : undefined,
      })
    } catch (emailErr) {
      console.error('[form/submit] Thank-you email failed:', emailErr)
    }

    return NextResponse.json(
      { success: true, contactId, companyId },
      { headers: corsHeaders },
    )
  } catch (err: any) {
    console.error('[form/submit] error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500, headers: corsHeaders },
    )
  }
}
