import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Sum file sizes from attachments table
    const { data: attachments, error } = await db
      .from('attachments')
      .select('file_size')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const totalBytes = (attachments ?? []).reduce(
      (sum: number, a: { file_size: number }) => sum + (a.file_size ?? 0),
      0
    )
    const fileCount = (attachments ?? []).length
    const limitBytes = 1 * 1024 * 1024 * 1024 // 1 GB

    return NextResponse.json({
      used_bytes: totalBytes,
      used_mb: Math.round((totalBytes / (1024 * 1024)) * 10) / 10,
      limit_bytes: limitBytes,
      limit_mb: 1024,
      file_count: fileCount,
      usage_percent: Math.round((totalBytes / limitBytes) * 1000) / 10,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
