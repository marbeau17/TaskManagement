import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/send-email'

export async function POST(request: NextRequest) {
  try {
    const {
      mentionedUserIds,
      commentBody,
      entityType,
      entityId,
      entityKey,
      entityTitle,
      commenterName,
      commenterId,
    } = await request.json()

    if (!Array.isArray(mentionedUserIds) || mentionedUserIds.length === 0) {
      return NextResponse.json({ error: 'No mentions' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Get mentioned users' emails
    const { data: users } = await (supabase as any)
      .from('users')
      .select('id, name, email')
      .in('id', mentionedUserIds)

    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const appUrl = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const entityUrl = `${appUrl}/${entityType === 'issue' ? 'issues' : 'tasks'}/${entityId}`
    const entityLabel = entityType === 'issue' ? '課題' : 'タスク'

    let sent = 0
    for (const u of users) {
      // Don't notify yourself
      if (u.id === commenterId) continue
      if (!u.email) continue

      // Send email
      await sendEmail({
        to: u.email,
        subject: `[${entityKey}] ${commenterName}さんからメンションされました - ${entityTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6FB5A3;">メンションされました</h2>
            <p>${u.name} さん</p>
            <p><strong>${commenterName}</strong> さんが${entityLabel}のコメントであなたをメンションしました。</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 80px;">${entityLabel}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${entityKey} - ${entityTitle}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">コメント</td>
                <td style="padding: 8px; border: 1px solid #ddd; white-space: pre-wrap;">${commentBody}</td>
              </tr>
            </table>
            <a href="${entityUrl}" style="display: inline-block; background: #6FB5A3; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">${entityLabel}を確認する</a>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">このメールは WorkFlow Task Management から自動送信されました。</p>
          </div>
        `,
      }).catch((err) => console.error(`[notify-mention] Failed for ${u.email}:`, err))

      // Create in-app notification
      await (supabase as any).from('notifications').insert({
        user_id: u.id,
        type: 'mention',
        title: `${commenterName}さんからメンションされました`,
        message: `${entityKey} ${entityTitle} のコメントでメンションされました`,
        link: `/${entityType === 'issue' ? 'issues' : 'tasks'}/${entityId}`,
      }).catch(() => {})

      sent++
    }

    return NextResponse.json({ success: true, sent })
  } catch (error) {
    console.error('[notify-mention] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
