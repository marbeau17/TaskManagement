import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.MS365_CLIENT_ID
  const tenantId = process.env.MS365_TENANT_ID
  const redirectUri = process.env.MS365_REDIRECT_URI || 'https://task-management-nine-iota.vercel.app/api/ms365/callback'
  const scope = 'openid profile email Calendars.Read User.Read offline_access'

  if (!clientId || !tenantId) {
    return NextResponse.json({ error: 'MS365 not configured' }, { status: 500 })
  }

  const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('response_mode', 'query')
  authUrl.searchParams.set('state', 'workflow-calendar')

  return NextResponse.redirect(authUrl.toString())
}
