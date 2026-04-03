import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('[MS365 Callback] Error:', error, searchParams.get('error_description'))
      return NextResponse.redirect(new URL('/calendar?error=auth_failed', request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/calendar?error=no_code', request.url))
    }

    const clientId = process.env.MS365_CLIENT_ID!
    const clientSecret = process.env.MS365_CLIENT_SECRET!
    const tenantId = process.env.MS365_TENANT_ID!
    const redirectUri = process.env.MS365_REDIRECT_URI || 'https://task-management-nine-iota.vercel.app/api/ms365/callback'

    // Exchange code for tokens
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid profile email Calendars.Read User.Read offline_access',
      }),
    })

    if (!tokenRes.ok) {
      const errData = await tokenRes.text()
      console.error('[MS365 Callback] Token exchange failed:', errData)
      return NextResponse.redirect(new URL('/calendar?error=token_failed', request.url))
    }

    const tokens = await tokenRes.json()

    // Get user profile from MS Graph
    const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = profileRes.ok ? await profileRes.json() : {}

    // Get current Supabase user
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/calendar?error=not_logged_in', request.url))
    }

    // Store tokens in DB
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()

    await db.from('ms365_tokens').upsert({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? '',
      token_expires_at: expiresAt,
      scopes: tokens.scope ?? '',
      ms_user_id: profile.userPrincipalName ?? profile.mail ?? '',
      connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    // Update user ms365_connected flag
    await db.from('users').update({ ms365_connected: true }).eq('id', user.id)

    // Initial sync: fetch this week's events
    try {
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay() + 1) // Monday
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const eventsUrl = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${weekStart.toISOString()}&endDateTime=${weekEnd.toISOString()}&$top=50&$select=id,subject,start,end,isAllDay,sensitivity,showAs,isCancelled,isOrganizer,organizer,location,responseStatus,recurrence`

      const eventsRes = await fetch(eventsUrl, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json()
        const events = (eventsData.value ?? []).map((e: any) => ({
          user_id: user.id,
          ms_event_id: e.id,
          subject: e.sensitivity === 'private' || e.sensitivity === 'confidential' ? '' : (e.subject ?? ''),
          start_at: e.start?.dateTime ? e.start.dateTime + 'Z' : now.toISOString(),
          end_at: e.end?.dateTime ? e.end.dateTime + 'Z' : now.toISOString(),
          duration_minutes: Math.round(((new Date(e.end?.dateTime + 'Z')).getTime() - (new Date(e.start?.dateTime + 'Z')).getTime()) / 60000),
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

        if (events.length > 0) {
          // Upsert events
          for (const evt of events) {
            await db.from('calendar_events').upsert(evt, { onConflict: 'user_id,ms_event_id' }).catch(() => {})
          }
        }

        // Update last_sync_at
        await db.from('ms365_tokens').update({ last_sync_at: new Date().toISOString() }).eq('user_id', user.id)
      }
    } catch (syncErr) {
      console.error('[MS365 Callback] Initial sync error:', syncErr)
      // Non-blocking — connection still succeeded
    }

    return NextResponse.redirect(new URL('/calendar?connected=true', request.url))
  } catch (error) {
    console.error('[MS365 Callback] Error:', error)
    return NextResponse.redirect(new URL('/calendar?error=unknown', request.url))
  }
}
