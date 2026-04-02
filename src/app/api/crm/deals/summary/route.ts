import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    // Fetch all deals
    const { data: deals, error: dealsError } = await db
      .from('crm_deals')
      .select('id, stage, amount, actual_close_date')

    if (dealsError) return NextResponse.json({ error: dealsError.message }, { status: 500 })

    const allDeals = deals ?? []

    // dealsByStage: group by stage with count + sum(amount)
    const stageMap: Record<string, { count: number; totalAmount: number }> = {}
    for (const deal of allDeals) {
      const s = deal.stage ?? 'unknown'
      if (!stageMap[s]) stageMap[s] = { count: 0, totalAmount: 0 }
      stageMap[s].count += 1
      stageMap[s].totalAmount += Number(deal.amount ?? 0)
    }
    const dealsByStage = Object.entries(stageMap).map(([stage, v]) => ({
      stage,
      count: v.count,
      totalAmount: v.totalAmount,
    }))

    // pipelineValue: sum(amount) where stage not in ('won','lost','churned')
    const excludedStages = new Set(['won', 'lost', 'churned'])
    const pipelineValue = allDeals
      .filter((d: any) => !excludedStages.has(d.stage))
      .reduce((sum: number, d: any) => sum + Number(d.amount ?? 0), 0)

    // wonThisMonth: sum(amount) where stage='won' and actual_close_date in current month
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const wonThisMonth = allDeals
      .filter((d: any) => {
        if (d.stage !== 'won' || !d.actual_close_date) return false
        const dt = new Date(d.actual_close_date)
        return dt.getFullYear() === currentYear && dt.getMonth() === currentMonth
      })
      .reduce((sum: number, d: any) => sum + Number(d.amount ?? 0), 0)

    // totalDeals
    const totalDeals = allDeals.length

    // Contacts count
    const { count: contactsCount, error: contactsError } = await db
      .from('crm_contacts')
      .select('id', { count: 'exact', head: true })

    if (contactsError) return NextResponse.json({ error: contactsError.message }, { status: 500 })

    // Leads count
    const { count: leadsCount, error: leadsError } = await db
      .from('crm_leads')
      .select('id', { count: 'exact', head: true })

    if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 })

    return NextResponse.json({
      dealsByStage,
      pipelineValue,
      wonThisMonth,
      totalDeals,
      totalContacts: contactsCount ?? 0,
      totalLeads: leadsCount ?? 0,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
