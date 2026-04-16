import { sendEmail } from './send-email'

interface ThankYouEmailParams {
  recipientName: string
  recipientEmail: string
  company: string
  bookedSlot?: { number: number; startTime: string; endTime: string } | null
  themes?: string[]
}

export async function sendFormThankYouEmail(params: ThankYouEmailParams): Promise<void> {
  if (!params.recipientEmail) return

  const slotInfo = params.bookedSlot
    ? `<tr>
        <td style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e4e4e7;font-size:13px;color:#71717a;font-weight:600;width:140px">ご予約枠</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e4e4e7;font-size:14px;color:#0d1f3c;font-weight:700">
          第${params.bookedSlot.number}回（${params.bookedSlot.startTime} 〜 ${params.bookedSlot.endTime}）
        </td>
       </tr>`
    : ''

  const themesList = params.themes && params.themes.length > 0
    ? params.themes.map(t => `・${t}`).join('<br>')
    : '未選択'

  const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8f4ec;font-family:'Helvetica Neue',Arial,'Hiragino Sans','Noto Sans JP',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ec;padding:40px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fdfbf7;border-radius:0;overflow:hidden;box-shadow:0 4px 24px rgba(13,31,60,0.1)">

  <!-- Gold top border -->
  <tr><td style="height:5px;background:linear-gradient(90deg,#0d1f3c 0%,#b8922a 50%,#0d1f3c 100%)"></td></tr>

  <!-- Header -->
  <tr><td style="background:#0d1f3c;padding:32px 40px">
    <div style="font-size:10px;letter-spacing:0.35em;color:#d4aa4a;margin-bottom:8px">MEETS CONSULTING</div>
    <div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:0.15em;line-height:1.4">
      事前ヒアリングシートを<br>受け付けました
    </div>
    <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:10px;letter-spacing:0.1em">
      きらぼし銀行　経営相談会　2026年5月20日（水）
    </div>
  </td></tr>

  <!-- Greeting -->
  <tr><td style="padding:32px 40px 16px">
    <p style="margin:0;font-size:15px;color:#1a1a2e;line-height:2">
      ${params.recipientName} 様<br><br>
      この度は、経営相談会の事前ヒアリングシートにご回答いただき、<br>
      誠にありがとうございます。
    </p>
  </td></tr>

  <!-- Details table -->
  <tr><td style="padding:8px 40px 24px">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:6px;overflow:hidden">
      <tr>
        <td style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e4e4e7;font-size:13px;color:#71717a;font-weight:600;width:140px">会社名</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e4e4e7;font-size:14px;color:#1a1a2e;font-weight:600">${params.company}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e4e4e7;font-size:13px;color:#71717a;font-weight:600;width:140px">開催日</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e4e4e7;font-size:14px;color:#1a1a2e">2026年5月20日（水）</td>
      </tr>
      ${slotInfo}
      <tr>
        <td style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e4e4e7;font-size:13px;color:#71717a;font-weight:600;width:140px">会場</td>
        <td style="padding:12px 16px;border-bottom:1px solid #e4e4e7;font-size:14px;color:#1a1a2e">きらぼし銀行（詳細は別途ご連絡）</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;background:#f9fafb;font-size:13px;color:#71717a;font-weight:600;width:140px">ご相談テーマ</td>
        <td style="padding:12px 16px;font-size:13px;color:#1a1a2e;line-height:1.8">${themesList}</td>
      </tr>
    </table>
  </td></tr>

  <!-- Message -->
  <tr><td style="padding:0 40px 32px">
    <div style="background:#f5f3ef;border-left:4px solid #b8922a;padding:20px 24px;font-size:13px;color:#4a4a5a;line-height:2;letter-spacing:0.05em">
      ご入力いただいた内容は、担当コンサルタント <strong style="color:#0d1f3c">伊藤 祐太</strong> が事前に拝読し、<br>
      <strong style="color:#0d1f3c">30分を最大限に活かしたご提案</strong>をご用意いたします。<br><br>
      当日は何卒よろしくお願いいたします。
    </div>
  </td></tr>

  <!-- Consultant info -->
  <tr><td style="padding:0 40px 32px">
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-right:16px;vertical-align:top">
          <div style="width:48px;height:48px;background:#0d1f3c;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:700;text-align:center;line-height:48px">伊</div>
        </td>
        <td style="vertical-align:top">
          <div style="font-size:14px;font-weight:700;color:#0d1f3c;letter-spacing:0.1em">伊藤 祐太</div>
          <div style="font-size:11px;color:#71717a;margin-top:4px">代表取締役社長 CEO / 経営コンサルタント</div>
          <div style="font-size:11px;color:#71717a">Meets Consulting 株式会社</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 40px;border-top:1px solid #e4e4e7;background:#faf9f5">
    <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;line-height:1.8;letter-spacing:0.05em">
      Meets Consulting 株式会社<br>
      〒100-0005 東京都千代田区丸の内2-5-1 丸の内二丁目ビル 7F<br>
      TEL: 03-6868-8789<br><br>
      このメールはシステムより自動送信されています。<br>
      ご不明な点がございましたら、上記までお問い合わせください。
    </p>
  </td></tr>

  <!-- Gold bottom border -->
  <tr><td style="height:4px;background:linear-gradient(90deg,#b8922a 0%,#0d1f3c 100%)"></td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  await sendEmail({
    to: params.recipientEmail,
    subject: '【Meets Consulting】事前ヒアリングシートを受け付けました ─ 経営相談会 2026.5.20',
    html,
    fromName: 'Meets Consulting Inc.',
  }).catch(err => {
    console.error('[FormThankYou] Email failed:', err)
  })
}
