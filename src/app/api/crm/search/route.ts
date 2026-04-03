import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const q = new URL(request.url).searchParams.get('q')
    if (!q || q.length < 2) return NextResponse.json({ companies: [], contacts: [], leads: [], deals: [] })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any
    const pattern = `%${q}%`

    const [companies, contacts, leads, deals] = await Promise.all([
      db.from('crm_companies').select('id, name, industry').ilike('name', pattern).limit(5),
      db.from('crm_contacts').select('id, first_name, last_name, email, company:crm_companies(name)').or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`).limit(5),
      db.from('crm_leads').select('id, title, status').ilike('title', pattern).limit(5),
      db.from('crm_deals').select('id, title, stage, amount').ilike('title', pattern).limit(5),
    ])

    return NextResponse.json({
      companies: companies.data ?? [],
      contacts: contacts.data ?? [],
      leads: leads.data ?? [],
      deals: deals.data ?? [],
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
