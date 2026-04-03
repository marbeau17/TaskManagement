import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: formId } = await params
    const body = await request.json()
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    // 1. Get form definition
    const { data: form, error: formError } = await db
      .from('crm_forms')
      .select('*')
      .eq('id', formId)
      .eq('status', 'active')
      .single()

    if (formError || !form) {
      return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 })
    }

    const settings = (form.settings ?? {}) as Record<string, any>
    const submittedData = body.data ?? body
    let contactId: string | null = null

    // 2. Auto-create/update CRM contact
    if (settings.createContact !== false) {
      const fields = (form.fields ?? []) as Array<{ name: string; crmMapping?: string }>
      const contactData: Record<string, any> = {}

      for (const field of fields) {
        if (field.crmMapping && submittedData[field.name] !== undefined) {
          contactData[field.crmMapping] = submittedData[field.name]
        }
      }

      // Try to find existing contact by email
      const email = contactData.email || submittedData.email
      if (email) {
        const { data: existing } = await db
          .from('crm_contacts')
          .select('id')
          .eq('email', email)
          .limit(1)
          .single()

        if (existing) {
          // Update existing contact
          contactId = existing.id
          await db.from('crm_contacts')
            .update({ ...contactData, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
        } else {
          // Create new contact
          const insertData = {
            ...contactData,
            lifecycle_stage: 'lead',
            lead_status: 'new',
            source: 'web_form',
            ...(settings.assignOwnerId ? { owner_id: settings.assignOwnerId } : {}),
          }
          const { data: newContact } = await db
            .from('crm_contacts')
            .insert(insertData)
            .select('id')
            .single()
          contactId = newContact?.id ?? null
        }
      }
    }

    // 3. Save submission
    const submission = {
      form_id: formId,
      contact_id: contactId,
      data: submittedData,
      source_url: body._source_url ?? '',
      ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '',
      user_agent: request.headers.get('user-agent') ?? '',
      utm_source: body._utm_source ?? submittedData.utm_source ?? '',
      utm_medium: body._utm_medium ?? submittedData.utm_medium ?? '',
      utm_campaign: body._utm_campaign ?? submittedData.utm_campaign ?? '',
    }

    const { data: saved, error: saveError } = await db
      .from('crm_form_submissions')
      .insert(submission)
      .select()
      .single()

    if (saveError) {
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    // 4. Increment submit count
    await db.rpc('increment_form_count', { form_id: formId }).catch(() => {
      // Fallback: manual increment if RPC doesn't exist
      db.from('crm_forms')
        .update({ submit_count: (form.submit_count ?? 0) + 1, updated_at: new Date().toISOString() })
        .eq('id', formId)
        .then(() => {})
        .catch(() => {})
    })

    // 5. Create CRM activity
    if (contactId) {
      await db.from('crm_activities').insert({
        entity_type: 'contact',
        entity_id: contactId,
        activity_type: 'system',
        subject: `フォーム送信: ${form.name}`,
        body: JSON.stringify(submittedData, null, 2),
        user_id: settings.assignOwnerId ?? form.created_by,
        is_completed: true,
        completed_at: new Date().toISOString(),
      }).catch(() => {})
    }

    // 6. Send notification email
    if (settings.notificationEmail) {
      try {
        const { sendEmail } = await import('@/lib/email/send-email')
        const fieldLabels = (form.fields ?? []) as Array<{ name: string; label: string }>
        const dataRows = Object.entries(submittedData)
          .filter(([k]) => !k.startsWith('_'))
          .map(([k, v]) => {
            const field = fieldLabels.find(f => f.name === k)
            return `<tr><td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:600;color:#374151">${field?.label ?? k}</td><td style="padding:6px 12px;border:1px solid #e5e7eb;color:#111827">${String(v)}</td></tr>`
          })
          .join('')

        const html = `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1a2d51;border-bottom:2px solid #1a2d51;padding-bottom:8px">📋 新しいフォーム送信: ${form.name}</h2>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              ${dataRows}
            </table>
            <p style="color:#6b7280;font-size:12px;margin-top:16px">
              送信元: ${submission.source_url || '不明'}<br>
              日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              ${contactId ? '<br>CRMコンタクト: 自動リンク済み' : ''}
            </p>
          </div>
        `

        await sendEmail({
          to: settings.notificationEmail,
          subject: `[WorkFlow] フォーム送信: ${form.name}`,
          html,
        }).catch(err => console.error('[Form Notify]', err))
      } catch (err) {
        console.error('[Form Notify Email]', err)
      }
    }

    const response = NextResponse.json({
      success: true,
      submissionId: saved.id,
      contactId,
      redirectUrl: settings.redirectUrl || null,
      thankYouMessage: settings.thankYouMessage || 'Thank you for your submission!',
    })
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response
  } catch (error) {
    console.error('[Form Submit]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Allow CORS for external embedding
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
