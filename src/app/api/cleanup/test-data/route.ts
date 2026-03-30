import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Consume request body to avoid lint warnings
    void request

    // Find test clients (names containing "E2Eテスト" or "テストクライアント" or numeric suffixes like "_177436...")
    const { data: testClients } = await db
      .from('clients')
      .select('id, name')

    const testClientIds = (testClients ?? [])
      .filter((c: { id: string; name: string }) =>
        c.name.includes('E2Eテスト') ||
        c.name.includes('テストクライアント') ||
        c.name.match(/\d{10,}/) // long numeric strings indicate test data
      )
      .map((c: { id: string; name: string }) => c.id)

    if (testClientIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No test data found', cleaned: 0 })
    }

    // Update test client names to empty string
    for (const clientId of testClientIds) {
      await db.from('clients').update({ name: '' }).eq('id', clientId)
    }

    return NextResponse.json({
      success: true,
      cleaned: testClientIds.length,
      testClients: testClientIds
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
