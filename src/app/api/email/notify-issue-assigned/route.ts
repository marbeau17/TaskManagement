import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/send-email'

interface AssignedNotifyParams {
  issueId: string
  issueKey: string
  issueTitle: string
  issueType?: string
  severity?: string
  projectName?: string
  taskTitle?: string
  description?: string
  reporterName?: string
  assigneeEmail: string
  assigneeName: string
}

export async function POST(request: NextRequest) {
  try {
    const params = (await request.json()) as Partial<AssignedNotifyParams>

    if (!params.assigneeEmail) {
      return NextResponse.json({ error: 'No assignee email' }, { status: 400 })
    }
    if (!params.issueId || !params.issueKey) {
      return NextResponse.json({ error: 'Missing issueId/issueKey' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const issueUrl = `${appUrl}/issues/${params.issueId}`

    const severityBadge = (() => {
      const s = (params.severity ?? '').toLowerCase()
      if (s === 'critical' || s === 'high')
        return `<span style="display:inline-block;background:#E5384B;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">${params.severity}</span>`
      if (s === 'medium')
        return `<span style="display:inline-block;background:#E89B4A;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">${params.severity}</span>`
      if (s)
        return `<span style="display:inline-block;background:#6B7280;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">${params.severity}</span>`
      return ''
    })()

    const descBlock = params.description
      ? `<p style="white-space:pre-wrap;line-height:1.6;color:#333;">${params.description
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</p>`
      : '<p style="color:#999;">（説明なし）</p>'

    await sendEmail({
      to: params.assigneeEmail,
      subject: `[${params.issueKey}] 課題が割り当てられました - ${params.issueTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6FB5A3;">課題が割り当てられました</h2>
          <p>${params.assigneeName ?? ''} さん</p>
          <p>${params.reporterName ?? '不明な報告者'} さんから新しい課題が割り当てられました。${severityBadge}</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 110px;">課題キー</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${params.issueKey}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">タイトル</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${params.issueTitle}</td>
            </tr>
            ${params.issueType ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">種別</td><td style="padding: 8px; border: 1px solid #ddd;">${params.issueType}</td></tr>` : ''}
            ${params.projectName ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">プロジェクト</td><td style="padding: 8px; border: 1px solid #ddd;">${params.projectName}</td></tr>` : ''}
            ${params.taskTitle ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">関連タスク</td><td style="padding: 8px; border: 1px solid #ddd;">${params.taskTitle}</td></tr>` : ''}
          </table>
          <h3 style="font-size:13px;color:#444;margin-bottom:4px;">内容</h3>
          ${descBlock}
          <p style="margin-top:24px;">
            <a href="${issueUrl}" style="display: inline-block; background: #6FB5A3; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">課題を開く</a>
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">このメールは WorkFlow Task Management から自動送信されました。</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[notify-issue-assigned] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
