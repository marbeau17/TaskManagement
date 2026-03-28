import { NextResponse } from 'next/server'

export async function GET() {
  const configured = !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD)
  return NextResponse.json({ configured })
}
