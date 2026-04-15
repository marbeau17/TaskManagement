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

    // Fetch past week + next 2 weeks of events from MS Graph
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1) // Monday
    if (weekStart > now) weekStart.setDate(weekStart.getDate() - 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 20) // +20 days to cover ~3 weeks

    const eventsUrl = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${weekStart.toISOString()}&endDateTime=${weekEnd.toISOString()}&$top=250&$select=id,subject,start,end,isAllDay,sensitivity,showAs,isCancelled,isOrganizer,organizer,location,responseStatus,recurrence`

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

    // =====================================================================
    // Meeting → Task auto-generation & completion
    // =====================================================================
    let tasksCreated = 0
    let tasksCompleted = 0
    try {
      // Ensure a "内部会議" client exists
      const { data: meetingClient } = await db
        .from('clients')
        .select('id')
        .eq('name', '内部会議')
        .maybeSingle()
      let meetingClientId = meetingClient?.id as string | undefined
      if (!meetingClientId) {
        const { data: newClient } = await db
          .from('clients')
          .insert({ name: '内部会議' })
          .select('id')
          .single()
        meetingClientId = newClient?.id
      }

      if (meetingClientId) {
        // Cutoff for "next 2 weeks" (JST)
        const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

        // Fetch existing calendar-source tasks for this user
        const { data: existingTasks } = await db
          .from('tasks')
          .select('id, status, template_data, estimated_hours')
          .eq('requested_by', user_id)
          .eq('client_id', meetingClientId)

        const existingByEventId = new Map<string, { id: string; status: string; estimated_hours: number }>()
        for (const t of existingTasks ?? []) {
          const evtId = t.template_data?.ms_event_id
          if (evtId) existingByEventId.set(evtId, t)
        }

        // 1. Create tasks for future accepted meetings in next 2 weeks
        for (const evt of events) {
          if (evt.is_cancelled) continue
          if (evt.show_as === 'free') continue
          const resp = evt.response_status
          if (resp !== 'accepted' && resp !== 'organizer') continue
          const evtEnd = new Date(evt.end_at)
          const evtStart = new Date(evt.start_at)
          if (evtEnd <= now) continue // past meeting, don't create
          if (evtStart > twoWeeksFromNow) continue // too far future

          if (existingByEventId.has(evt.ms_event_id)) continue // already created

          const durationHours = Math.round((evt.duration_minutes / 60) * 10) / 10
          const startDateStr = new Date(evtStart.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10)
          const endDateStr = new Date(evtEnd.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10)

          const { error: createErr } = await db.from('tasks').insert({
            client_id: meetingClientId,
            title: evt.subject || '(会議)',
            description: evt.location ? `場所: ${evt.location}` : null,
            requested_by: user_id,
            assigned_to: user_id,
            status: 'todo',
            is_draft: false,
            progress: 0,
            actual_hours: 0,
            start_date: startDateStr,
            confirmed_deadline: endDateStr,
            desired_deadline: endDateStr,
            estimated_hours: durationHours,
            planned_hours_per_week: durationHours,
            priority: 3,
            template_data: { ms_event_id: evt.ms_event_id, source: 'calendar' },
          })
          if (!createErr) tasksCreated++
        }

        // 2. Complete past meetings' tasks / drop cancelled
        for (const [evtId, existingTask] of existingByEventId.entries()) {
          const evt = events.find((e: any) => e.ms_event_id === evtId)
          if (!evt) continue
          if (evt.is_cancelled && existingTask.status !== 'dropped') {
            await db.from('tasks').update({
              status: 'dropped',
              updated_at: new Date().toISOString(),
            }).eq('id', existingTask.id)
            continue
          }
          const evtEnd = new Date(evt.end_at)
          if (evtEnd < now && existingTask.status !== 'done') {
            // Build weekly_actual for this meeting
            const durationHours = existingTask.estimated_hours || (evt.duration_minutes / 60)
            const weekKey = new Date(evt.start_at)
            const day = weekKey.getDay()
            weekKey.setDate(weekKey.getDate() - (day === 0 ? 6 : day - 1))
            const wy = weekKey.getFullYear()
            const wm = String(weekKey.getMonth() + 1).padStart(2, '0')
            const wd = String(weekKey.getDate()).padStart(2, '0')
            const weekStr = `${wy}-${wm}-${wd}`

            await db.from('tasks').update({
              status: 'done',
              progress: 100,
              actual_hours: durationHours,
              template_data: {
                ms_event_id: evtId,
                source: 'calendar',
                weekly_actual: { [weekStr]: durationHours },
              },
              updated_at: new Date().toISOString(),
            }).eq('id', existingTask.id)
            tasksCompleted++
          }
        }
      }
    } catch (taskErr) {
      console.error('[MS365 Sync] Meeting-to-task error:', taskErr)
    }

    console.log('[MS365 Sync] Tasks created:', tasksCreated, 'completed:', tasksCompleted)

    return NextResponse.json({ synced, total: events.length, tasks_created: tasksCreated, tasks_completed: tasksCompleted })
  } catch (error) {
    console.error('[MS365 Sync] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
