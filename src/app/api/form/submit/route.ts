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
    const body = await req.json()

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

    // --- create CRM lead ---
    await db.from('crm_leads').insert({
      title: `${body.company} - 経営相談会`,
      contact_id: contactId,
      company_id: companyId,
      status: 'new',
      notes: [
        `相談テーマ: ${(body.themes || []).join(', ')}`,
        `課題: ${body.issue}`,
        `過去の施策: ${body.tried || 'なし'}`,
        `課題期間: ${body.duration || '未選択'}`,
        `緊急度: ${body.urgency || '未選択'}`,
        `予算: ${body.budget || '未定'}`,
        `意思決定: ${body.authority || '未選択'}`,
        `期待すること: ${(body.goals || []).join(', ')}`,
        body.freeText ? `その他: ${body.freeText}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    })

    // --- activity log ---
    await db.from('crm_activities').insert({
      entity_type: 'contact',
      entity_id: contactId,
      type: 'system',
      subject: '事前ヒアリングシート送信',
      body: JSON.stringify(body),
    })

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
