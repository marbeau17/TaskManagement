import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/send-email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const success = await sendEmail({
      to: email,
      subject: '[WorkFlow] テスト送信 / Test Email',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #6FB5A3; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; font-size: 18px; margin: 0;">WorkFlow — メールテスト</h1>
          </div>
          <div style="padding: 24px; background: #FAFCFB; border: 1px solid #CCDDD8; border-radius: 0 0 10px 10px;">
            <p style="color: #2A3A36; font-size: 14px;">
              メール送信が正常に動作しています。<br/>
              Email delivery is working correctly.
            </p>
            <p style="color: #647870; font-size: 12px; margin-top: 16px;">
              送信日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
            </p>
          </div>
        </div>
      `,
    })

    if (success) {
      return NextResponse.json({ success: true, message: 'Test email sent' })
    } else {
      return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
