import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json()
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    // Get stored tokens
    const { data: tokenRow, error: tokenErr } = await db
      .from('ms365_tokens')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (tokenErr || !tokenRow) {
      console.log('[MS365 Sync] No tokens found for user:', user_id)
      return NextResponse.json({ synced: 0, reason: 'not_connected' })
    }

    let accessToken = tokenRow.access_token

    // Check if token is expired, refresh if needed
    const expiresAt = new Date(tokenRow.token_expires_at).getTime()
    if (Date.now() > expiresAt - 60_000) {
      console.log('[MS365 Sync] Token expired, refreshing...')
      const clientId = process.env.MS365_CLIENT_ID!
      const clientSecret = process.env.MS365_CLIENT_SECRET!
      const tenantId = process.env.MS365_TENANT_ID!

      const refreshRes = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: tokenRow.refresh_token,
            grant_type: 'refresh_token',
            scope: 'openid profile email Calendars.Read User.Read offline_access',
          }),
        }
      )

      if (!refreshRes.ok) {
        const errText = await refreshRes.text()
        console.error('[MS365 Sync] Token refresh failed:', errText)
        return NextResponse.json({ synced: 0, reason: 'token_refresh_failed' })
      }

      const newTokens = await refreshRes.json()
      accessToken = newTokens.access_token

      await db.from('ms365_tokens').update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token ?? tokenRow.refresh_token,
        token_expires_at: new Date(Date.now() + (newTokens.expires_in ?? 3600) * 1000).toISOString(),
      }).eq('user_id', user_id)

      console.log('[MS365 Sync] Token refreshed successfully')
    }

    // Fetch this week's events from MS Graph
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1) // Monday
    if (weekStart > now) weekStart.setDate(weekStart.getDate() - 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6) // Sunday

    const eventsUrl = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${weekStart.toISOString()}&endDateTime=${weekEnd.toISOString()}&$top=100&$select=id,subject,start,end,isAllDay,sensitivity,showAs,isCancelled,isOrganizer,organizer,location,responseStatus,recurrence`

    console.log('[MS365 Sync] Fetching events:', weekStart.toISOString(), 'to', weekEnd.toISOString())

    const eventsRes = await fetch(eventsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    })

    if (!eventsRes.ok) {
      const errText = await eventsRes.text()
      console.error('[MS365 Sync] Graph API error:', eventsRes.status, errText)
      return NextResponse.json({ synced: 0, reason: 'graph_api_error' })
    }

    const eventsData = await eventsRes.json()
    const events = (eventsData.value ?? []).map((e: any) => ({
      user_id,
      ms_event_id: e.id,
      subject: e.sensitivity === 'private' || e.sensitivity === 'confidential' ? '' : (e.subject ?? ''),
      start_at: e.start?.dateTime ? e.start.dateTime + 'Z' : now.toISOString(),
      end_at: e.end?.dateTime ? e.end.dateTime + 'Z' : now.toISOString(),
      duration_minutes: Math.round(
        ((new Date(e.end?.dateTime + 'Z')).getTime() - (new Date(e.start?.dateTime + 'Z')).getTime()) / 60000
      ),
      is_all_day: e.isAllDay ?? false,
      sensitivity: e.sensitivity ?? 'normal',
      show_as: e.showAs ?? 'busy',
      is_cancelled: e.isCancelled ?? false,
      is_recurring: !!e.recurrence,
      organizer_name: e.organizer?.emailAddress?.name ?? '',
      organizer_email: e.organizer?.emailAddress?.address ?? '',
      location: e.location?.displayName ?? '',
      response_status: e.responseStatus?.response ?? '',
    }))

    console.log('[MS365 Sync] Fetched', events.length, 'events from Graph API')

    // Upsert events
    let synced = 0
    for (const evt of events) {
      const { error: upsertErr } = await db
        .from('calendar_events')
        .upsert(evt, { onConflict: 'user_id,ms_event_id' })
      if (!upsertErr) synced++
    }

    // Update last_sync_at
    await db.from('ms365_tokens').update({
      last_sync_at: new Date().toISOString(),
    }).eq('user_id', user_id)

    console.log('[MS365 Sync] Synced', synced, 'events to DB')

    return NextResponse.json({ synced, total: events.length })
  } catch (error) {
    console.error('[MS365 Sync] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
