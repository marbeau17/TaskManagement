import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/send-email'

export async function POST(request: NextRequest) {
  try {
    const { issueId, issueKey, issueTitle, reporterEmail, reporterName, resolverName } = await request.json()

    if (!reporterEmail) {
      return NextResponse.json({ error: 'No reporter email' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const issueUrl = `${appUrl}/issues/${issueId}`

    await sendEmail({
      to: reporterEmail,
      subject: `[${issueKey}] 課題が解決されました - ${issueTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6FB5A3;">課題が解決されました</h2>
          <p>${reporterName} さん</p>
          <p>以下の課題が <strong>${resolverName}</strong> によって解決されました。内容を確認し、問題なければクローズしてください。</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 100px;">課題キー</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${issueKey}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">タイトル</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${issueTitle}</td>
            </tr>
          </table>
          <a href="${issueUrl}" style="display: inline-block; background: #6FB5A3; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">課題を確認してクローズする</a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">このメールは WorkFlow Task Management から自動送信されました。</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[notify-issue-resolved] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
