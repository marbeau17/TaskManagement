import { sendEmail } from './send-email'

interface PasswordExpiryParams {
  to: string
  userName: string
  daysRemaining: number // 正の値: あと N 日 / 0: 当日 / 負: 超過 N 日
  maxAgeDays: number
  loginUrl: string
}

export async function sendPasswordExpiryEmail(params: PasswordExpiryParams): Promise<void> {
  const { to, userName, daysRemaining, maxAgeDays, loginUrl } = params

  let subject: string
  let urgencyColor: string
  let leadText: string
  if (daysRemaining < 0) {
    subject = `【要対応】パスワード更新期限が ${Math.abs(daysRemaining)} 日超過しています`
    urgencyColor = '#dc2626'
    leadText = `セキュリティポリシーで定められた更新期限を <strong>${Math.abs(daysRemaining)} 日</strong> 経過しています。`
  } else if (daysRemaining === 0) {
    subject = '【本日期限】パスワードを更新してください'
    urgencyColor = '#dc2626'
    leadText = '本日がパスワード更新期限です。'
  } else {
    subject = `【リマインド】あと ${daysRemaining} 日でパスワード更新期限です`
    urgencyColor = '#f59e0b'
    leadText = `セキュリティポリシーにより <strong>${daysRemaining} 日後</strong> にパスワードの更新が必要です。`
  }

  const html = `
<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width:600px; margin:0 auto; padding:24px; color:#111827;">
  <div style="background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:24px;">
    <h2 style="color:${urgencyColor}; margin:0 0 12px;">🔐 パスワード更新のお願い</h2>
    <p>${userName} 様</p>
    <p>${leadText}</p>
    <p style="background:#f3f4f6; padding:12px; border-radius:6px; font-size:13px;">
      <strong>運用ルール:</strong> ${maxAgeDays} 日ごとにパスワード更新<br>
      セキュリティ保護のため、定期的な変更にご協力ください。
    </p>
    <p style="margin:20px 0;">
      <a href="${loginUrl}" style="display:inline-block; background:${urgencyColor}; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:bold;">
        ログインして変更する
      </a>
    </p>
    <p style="color:#6b7280; font-size:12px; margin-top:24px;">
      このメールは Meets ワークフローシステムから自動送信されています。<br>
      心当たりがない場合や、ご不明な点があれば管理者までお問い合わせください。
    </p>
  </div>
</body></html>`

  await sendEmail({ to, subject, html })
}
