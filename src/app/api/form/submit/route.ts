import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: corsHeaders })
}

const BUDGET_LABELS = ['未定', '〜30万円', '30〜50万円', '50〜100万円', '100万円〜', '制限なし']

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json()
    const body = rawBody.values ? { ...rawBody.values, formId: rawBody.formId, slug: rawBody.slug } : rawBody

    // Validate
    const missing: string[] = []
    if (!body.company) missing.push('company')
    if (!body.name) missing.push('name')
    if (!body.email) missing.push('email')
    if (!body.issue) missing.push('issue')
    if (missing.length > 0) {
      return NextResponse.json({ success: false, error: `必須項目が不足しています: ${missing.join(', ')}` }, { status: 400, headers: corsHeaders })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    const themes = Array.isArray(body.themes) ? body.themes : (body.themes ? [body.themes] : [])
    const expectations = Array.isArray(body.expectations) ? body.expectations : (body.expectations ? [body.expectations] : [])
    const budgetDisplay = body.budget !== undefined ? (BUDGET_LABELS[parseInt(body.budget)] || body.budget) : '未定'
    const nameParts = (body.name || '').split(' ')

    // =========================================================================
    // 1. CRM Company — find or create, update if exists
    // =========================================================================
    let companyId: string | null = null
    const { data: existingCompany } = await db.from('crm_companies').select('id').eq('name', body.company).maybeSingle()
    if (existingCompany) {
      companyId = existingCompany.id
      // Update company with latest form data
      await db.from('crm_companies').update({
        industry: body.industry || undefined,
        size: body.employees || undefined,
        updated_at: new Date().toISOString(),
      }).eq('id', companyId)
    } else {
      const { data: newComp } = await db.from('crm_companies').insert({
        name: body.company,
        industry: body.industry || null,
        size: body.employees || null,
      }).select('id').single()
      companyId = newComp?.id
    }

    // =========================================================================
    // 2. Clients table — also create/link for task management side
    // =========================================================================
    let clientId: string | null = null
    const { data: existingClient } = await db.from('clients').select('id').eq('name', body.company).maybeSingle()
    if (existingClient) {
      clientId = existingClient.id
    } else {
      const { data: newClient } = await db.from('clients').insert({ name: body.company }).select('id').single()
      clientId = newClient?.id
    }
    // Link crm_company → client
    if (companyId && clientId) {
      await db.from('crm_companies').update({ client_id: clientId }).eq('id', companyId)
    }

    // =========================================================================
    // 3. CRM Contact — find or create, UPDATE if exists (fix dedup bug)
    // =========================================================================
    let contactId: string | null = null
    const { data: existingContact } = await db.from('crm_contacts').select('id').eq('email', body.email).maybeSingle()
    if (existingContact) {
      contactId = existingContact.id
      // Update with latest data (fixes dedup bug — company_id was never updated)
      await db.from('crm_contacts').update({
        company_id: companyId,
        job_title: body.position || undefined,
        first_name: nameParts[0] || undefined,
        last_name: nameParts.slice(1).join(' ') || undefined,
        updated_at: new Date().toISOString(),
      }).eq('id', contactId)
    } else {
      const { data: newContact } = await db.from('crm_contacts').insert({
        first_name: nameParts[0] || body.name,
        last_name: nameParts.slice(1).join(' ') || '',
        email: body.email,
        company_id: companyId,
        job_title: body.position || null,
        lifecycle_stage: 'lead',
        lead_status: 'new',
        source: 'hearing_form',
      }).select('id').single()
      contactId = newContact?.id
    }

    // =========================================================================
    // 4. CRM Lead — structured fields + rich description
    // =========================================================================
    const description = [
      `【基本情報】`,
      `会社名: ${body.company}`,
      `業種: ${body.industry || '未回答'}`,
      `担当者: ${body.name}（${body.position || '役職未回答'}）`,
      `従業員数: ${body.employees || '未回答'}`,
      `年商: ${body.revenue || '未回答'}`,
      ``,
      `【相談テーマ】${themes.join(', ') || '未選択'}`,
      ``,
      `【課題】${body.issue}`,
      body.tried ? `【過去の施策】${body.tried}` : '',
      body.duration ? `【課題期間】${body.duration}` : '',
      ``,
      `【緊急度】${body.urgency || '未選択'}`,
      `【予算】${budgetDisplay}`,
      `【意思決定】${body.decision_maker || body.authority || '未回答'}`,
      ``,
      `【期待すること】${expectations.join(', ') || '未選択'}`,
      body.expectations_other || body.freeText ? `【その他】${body.expectations_other || body.freeText}` : '',
    ].filter(Boolean).join('\n')

    const { data: lead } = await db.from('crm_leads').insert({
      title: `${body.company} - 経営相談会`,
      contact_id: contactId,
      company_id: companyId,
      status: 'new',
      source: 'hearing_form',
      description,
      custom_fields: {
        themes,
        urgency: body.urgency || null,
        budget: budgetDisplay,
        decision_maker: body.decision_maker || body.authority || null,
        expectations,
        duration: body.duration || null,
        revenue: body.revenue || null,
        employees: body.employees || null,
      },
    }).select('id').single()

    // =========================================================================
    // 5. CRM Form Submission — for inbox display
    // =========================================================================
    let formId = body.formId
    if (!formId) {
      const { data: form } = await db.from('crm_forms').select('id').ilike('name', '%ヒアリング%').limit(1).maybeSingle()
      formId = form?.id
    }
    if (formId && contactId) {
      const { error: subErr } = await db.from('crm_form_submissions').insert({
        form_id: formId,
        contact_id: contactId,
        data: body,
        status: 'new',
      })
      if (subErr) console.error('[form/submit] Submission insert failed:', subErr.message)
    }

    // =========================================================================
    // 6. CRM Activities — log on BOTH contact AND lead
    // =========================================================================
    const activityBody = JSON.stringify({
      ...body,
      _budget_display: budgetDisplay,
      _themes: themes,
      _expectations: expectations,
    })
    if (contactId) {
      await db.from('crm_activities').insert({
        entity_type: 'contact',
        entity_id: contactId,
        type: 'system',
        subject: '事前ヒアリングシート送信',
        body: activityBody,
      })
    }
    if (lead?.id) {
      await db.from('crm_activities').insert({
        entity_type: 'lead',
        entity_id: lead.id,
        type: 'system',
        subject: '事前ヒアリングシートからリード作成',
        body: activityBody,
      })
    }

    // =========================================================================
    // 7. Thank you email
    // =========================================================================
    try {
      const { sendFormThankYouEmail } = await import('@/lib/email/form-thank-you')
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
        themes,
      })
    } catch (emailErr) {
      console.error('[form/submit] Email failed:', emailErr)
    }

    return NextResponse.json(
      { success: true, contactId, companyId, leadId: lead?.id, clientId },
      { headers: corsHeaders },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[form/submit] error:', err)
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: corsHeaders })
  }
}
