import { escapeHtml } from './utils'

export type BookingLocale = 'ja' | 'en'

export interface BookingCategory {
  title: string
}

export interface BookingConsultant {
  name: string
  email?: string
}

export interface BookingLead {
  name: string
  email: string
  company?: string | null
  phone?: string | null
  message?: string | null
}

export interface BookingEmailOutput {
  subject: string
  html: string
  text: string
}

// -------------------- Date Formatters --------------------

function formatDateJa(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(d)
}

function formatTimeJa(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

function formatDateEn(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(d)
}

function formatTimeEn(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

function formatDate(dateStr: string, locale: BookingLocale): string {
  return locale === 'ja' ? formatDateJa(dateStr) : formatDateEn(dateStr)
}

function formatTime(dateStr: string, locale: BookingLocale): string {
  return locale === 'ja' ? formatTimeJa(dateStr) : formatTimeEn(dateStr)
}

function formatTimeRange(
  slot_start_at: string,
  slot_end_at: string,
  locale: BookingLocale
): string {
  const tzSuffix = locale === 'ja' ? '（JST）' : ' (JST)'
  return `${formatTime(slot_start_at, locale)} - ${formatTime(slot_end_at, locale)}${tzSuffix}`
}

// -------------------- Shared Style Helpers --------------------

const PALETTE = {
  cream: '#f8f4ec',
  card: '#fdfbf7',
  accent: '#6FB5A3', // mint
  accentDark: '#4f9585',
  gold: '#b8922a',
  navy: '#0d1f3c',
  text: '#1a1a2e',
  muted: '#71717a',
  border: '#e4e4e7',
  labelBg: '#f9fafb',
  alertBg: '#fef3c7',
}

function shellOpen(locale: BookingLocale, titleText: string, headerBg: string): string {
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(titleText)}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Hiragino Sans','Noto Sans JP',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PALETTE.cream};padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:${PALETTE.card};border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(13,31,60,0.08);">
          <tr>
            <td style="background:${headerBg};padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;letter-spacing:0.5px;">
                ${escapeHtml(titleText)}
              </h1>
            </td>
          </tr>`
}

function shellClose(locale: BookingLocale): string {
  const footer =
    locale === 'ja'
      ? 'このメールは株式会社MEETSより自動送信されています。<br>ご不明な点がございましたら、担当者までお問い合わせください。'
      : 'This email was automatically sent by MEETS Inc.<br>For questions, please contact your consultant.'
  const company = locale === 'ja' ? '株式会社MEETS' : 'MEETS Inc.'
  return `
          <tr>
            <td style="padding:20px 32px 24px;border-top:1px solid ${PALETTE.border};background:#faf9f5;">
              <p style="margin:0 0 8px;font-size:13px;color:${PALETTE.navy};text-align:center;font-weight:600;letter-spacing:0.08em;">
                ${escapeHtml(company)}
              </p>
              <p style="margin:0;font-size:11px;color:${PALETTE.muted};text-align:center;line-height:1.8;">
                ${footer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function detailsRow(label: string, value: string, lastRow = false): string {
  const border = lastRow ? '' : `border-bottom:1px solid ${PALETTE.border};`
  return `
            <tr>
              <td style="padding:12px 16px;background:${PALETTE.labelBg};${border}font-size:13px;color:${PALETTE.muted};font-weight:600;width:140px;vertical-align:top;">
                ${escapeHtml(label)}
              </td>
              <td style="padding:12px 16px;${border}font-size:14px;color:${PALETTE.text};line-height:1.6;">
                ${value}
              </td>
            </tr>`
}

// -------------------- Booking Confirmation --------------------

export interface BookingConfirmationParams {
  locale?: BookingLocale
  category: BookingCategory
  consultant: BookingConsultant
  lead?: Pick<BookingLead, 'name'>
  slot_start_at: string
  slot_end_at: string
  cancellation_url: string
}

export function BookingConfirmationEmailHtml(
  params: BookingConfirmationParams
): BookingEmailOutput {
  const locale: BookingLocale = params.locale ?? 'ja'
  const isJa = locale === 'ja'
  const leadName = params.lead?.name ?? ''

  const L = {
    subject: isJa
      ? `ご予約確認: ${params.category.title}`
      : `Booking Confirmation: ${params.category.title}`,
    header: isJa ? 'ご予約ありがとうございます' : 'Your booking is confirmed',
    greeting: isJa
      ? leadName
        ? `${leadName} 様`
        : 'お客様'
      : leadName
        ? `Dear ${leadName},`
        : 'Hello,',
    thanks: isJa
      ? 'この度は株式会社MEETSへのご予約をいただき、誠にありがとうございます。以下の内容で承りました。'
      : 'Thank you for booking with MEETS Inc. Your appointment has been confirmed with the following details.',
    summary: isJa ? 'ご予約内容' : 'Booking Summary',
    category: isJa ? 'ご相談内容' : 'Category',
    date: isJa ? '日付' : 'Date',
    time: isJa ? '時間' : 'Time',
    consultant: isJa ? '担当コンサルタント' : 'Consultant',
    cancelTitle: isJa ? 'ご予約のキャンセル' : 'Need to cancel?',
    cancelBody: isJa
      ? 'ご都合が合わなくなった場合は、以下のボタンからキャンセルのお手続きをお願いいたします。'
      : 'If you need to cancel, please use the button below.',
    cta: isJa ? '予約をキャンセルする' : 'Cancel booking',
    closing: isJa ? '当日お会いできることを楽しみにしております。' : 'We look forward to meeting you.',
  }

  const dateStr = formatDate(params.slot_start_at, locale)
  const timeStr = formatTimeRange(params.slot_start_at, params.slot_end_at, locale)

  const html = `${shellOpen(locale, L.header, PALETTE.accent)}
          <tr>
            <td style="padding:32px 32px 8px;">
              <p style="margin:0 0 16px;font-size:16px;color:${PALETTE.text};line-height:1.7;">
                ${escapeHtml(L.greeting)}
              </p>
              <p style="margin:0;font-size:14px;color:${PALETTE.text};line-height:1.9;">
                ${escapeHtml(L.thanks)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:${PALETTE.accentDark};font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                ${escapeHtml(L.summary)}
              </h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${PALETTE.border};border-radius:6px;overflow:hidden;">
                ${detailsRow(L.category, `<strong>${escapeHtml(params.category.title)}</strong>`)}
                ${detailsRow(L.date, escapeHtml(dateStr))}
                ${detailsRow(L.time, escapeHtml(timeStr))}
                ${detailsRow(L.consultant, escapeHtml(params.consultant.name), true)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px;">
              <div style="background:${PALETTE.labelBg};border-left:4px solid ${PALETTE.accent};padding:16px 20px;border-radius:4px;">
                <p style="margin:0 0 8px;font-size:14px;color:${PALETTE.text};font-weight:600;">
                  ${escapeHtml(L.cancelTitle)}
                </p>
                <p style="margin:0;font-size:13px;color:${PALETTE.muted};line-height:1.7;">
                  ${escapeHtml(L.cancelBody)}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 32px 8px;">
              <a href="${escapeHtml(params.cancellation_url)}" target="_blank" style="display:inline-block;background:#ffffff;color:${PALETTE.accentDark};text-decoration:none;padding:12px 28px;border:1.5px solid ${PALETTE.accent};border-radius:6px;font-size:14px;font-weight:600;letter-spacing:0.05em;">
                ${escapeHtml(L.cta)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px;">
              <p style="margin:0;font-size:14px;color:${PALETTE.text};line-height:1.8;text-align:center;">
                ${escapeHtml(L.closing)}
              </p>
            </td>
          </tr>
${shellClose(locale)}`

  const text = [
    L.header,
    '',
    L.greeting,
    '',
    L.thanks,
    '',
    `${L.summary}:`,
    `  ${L.category}: ${params.category.title}`,
    `  ${L.date}: ${dateStr}`,
    `  ${L.time}: ${timeStr}`,
    `  ${L.consultant}: ${params.consultant.name}`,
    '',
    `${L.cancelTitle}`,
    L.cancelBody,
    `${L.cta}: ${params.cancellation_url}`,
    '',
    L.closing,
    '',
    isJa ? '株式会社MEETS' : 'MEETS Inc.',
  ].join('\n')

  return { subject: L.subject, html, text }
}

// -------------------- Admin Notification --------------------

export interface BookingAdminNotificationParams {
  locale?: BookingLocale
  category: BookingCategory
  consultant: BookingConsultant
  lead: BookingLead
  slot_start_at: string
  slot_end_at: string
  crm_lead_url: string
}

export function BookingAdminNotificationHtml(
  params: BookingAdminNotificationParams
): BookingEmailOutput {
  const locale: BookingLocale = params.locale ?? 'ja'
  const isJa = locale === 'ja'

  const L = {
    subject: isJa
      ? `新規予約: ${params.category.title} - ${params.lead.name} 様`
      : `New Booking: ${params.category.title} - ${params.lead.name}`,
    header: isJa ? '新規予約が入りました' : 'New booking received',
    intro: isJa
      ? '新しいご予約が入りました。カレンダーへの追加と対応をお願いします。'
      : 'A new booking has been received. Please add it to your calendar and confirm.',
    bookingSection: isJa ? '予約情報' : 'Booking Details',
    leadSection: isJa ? 'リード情報' : 'Lead Details',
    category: isJa ? 'カテゴリ' : 'Category',
    date: isJa ? '日付' : 'Date',
    time: isJa ? '時間' : 'Time',
    consultant: isJa ? '担当コンサルタント' : 'Consultant assigned',
    name: isJa ? 'お名前' : 'Name',
    email: isJa ? 'メール' : 'Email',
    company: isJa ? '会社名' : 'Company',
    phone: isJa ? '電話番号' : 'Phone',
    message: isJa ? 'ご相談内容' : 'Agenda / Message',
    cta: isJa ? 'CRMでリードを確認' : 'View lead in CRM',
    reminder: isJa
      ? 'リマインダー: カレンダーに登録し、必要に応じて確認連絡を行ってください。'
      : 'Reminder: Please add this to your calendar and send any confirmation needed.',
    notSet: isJa ? '未入力' : 'Not provided',
  }

  const dateStr = formatDate(params.slot_start_at, locale)
  const timeStr = formatTimeRange(params.slot_start_at, params.slot_end_at, locale)

  const companyVal = params.lead.company?.trim() || L.notSet
  const phoneVal = params.lead.phone?.trim() || L.notSet
  const messageVal = params.lead.message?.trim() || L.notSet

  const html = `${shellOpen(locale, L.header, PALETTE.navy)}
          <tr>
            <td style="padding:32px 32px 8px;">
              <p style="margin:0;font-size:14px;color:${PALETTE.text};line-height:1.8;">
                ${escapeHtml(L.intro)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:${PALETTE.navy};font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                ${escapeHtml(L.bookingSection)}
              </h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${PALETTE.border};border-radius:6px;overflow:hidden;">
                ${detailsRow(L.category, `<strong>${escapeHtml(params.category.title)}</strong>`)}
                ${detailsRow(L.date, escapeHtml(dateStr))}
                ${detailsRow(L.time, escapeHtml(timeStr))}
                ${detailsRow(L.consultant, escapeHtml(params.consultant.name), true)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:${PALETTE.navy};font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                ${escapeHtml(L.leadSection)}
              </h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${PALETTE.border};border-radius:6px;overflow:hidden;">
                ${detailsRow(L.name, `<strong>${escapeHtml(params.lead.name)}</strong>`)}
                ${detailsRow(L.email, `<a href="mailto:${escapeHtml(params.lead.email)}" style="color:${PALETTE.accentDark};text-decoration:none;">${escapeHtml(params.lead.email)}</a>`)}
                ${detailsRow(L.company, escapeHtml(companyVal))}
                ${detailsRow(L.phone, escapeHtml(phoneVal))}
                ${detailsRow(L.message, escapeHtml(messageVal).replace(/\n/g, '<br>'), true)}
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px 8px;">
              <a href="${escapeHtml(params.crm_lead_url)}" target="_blank" style="display:inline-block;background:${PALETTE.navy};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:600;letter-spacing:0.05em;">
                ${escapeHtml(L.cta)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;">
              <div style="background:${PALETTE.alertBg};border-left:4px solid ${PALETTE.gold};padding:14px 18px;border-radius:4px;">
                <p style="margin:0;font-size:13px;color:${PALETTE.text};line-height:1.7;">
                  ${escapeHtml(L.reminder)}
                </p>
              </div>
            </td>
          </tr>
${shellClose(locale)}`

  const text = [
    L.header,
    '',
    L.intro,
    '',
    `${L.bookingSection}:`,
    `  ${L.category}: ${params.category.title}`,
    `  ${L.date}: ${dateStr}`,
    `  ${L.time}: ${timeStr}`,
    `  ${L.consultant}: ${params.consultant.name}`,
    '',
    `${L.leadSection}:`,
    `  ${L.name}: ${params.lead.name}`,
    `  ${L.email}: ${params.lead.email}`,
    `  ${L.company}: ${companyVal}`,
    `  ${L.phone}: ${phoneVal}`,
    `  ${L.message}: ${messageVal}`,
    '',
    `${L.cta}: ${params.crm_lead_url}`,
    '',
    L.reminder,
  ].join('\n')

  return { subject: L.subject, html, text }
}

// -------------------- Cancellation Confirmation --------------------

export interface BookingCancellationParams {
  locale?: BookingLocale
  category: BookingCategory
  slot_start_at: string
  slot_end_at: string
  lead?: Pick<BookingLead, 'name'>
}

export function BookingCancellationEmailHtml(
  params: BookingCancellationParams
): BookingEmailOutput {
  const locale: BookingLocale = params.locale ?? 'ja'
  const isJa = locale === 'ja'
  const leadName = params.lead?.name ?? ''

  const L = {
    subject: isJa
      ? `予約キャンセル確認: ${params.category.title}`
      : `Booking Cancelled: ${params.category.title}`,
    header: isJa ? 'ご予約をキャンセルしました' : 'Your booking has been cancelled',
    greeting: isJa
      ? leadName
        ? `${leadName} 様`
        : 'お客様'
      : leadName
        ? `Dear ${leadName},`
        : 'Hello,',
    body: isJa
      ? '以下のご予約がキャンセルされました。ご利用いただきありがとうございました。'
      : 'The following booking has been cancelled. Thank you for letting us know.',
    summary: isJa ? 'キャンセルされた予約' : 'Cancelled booking',
    category: isJa ? 'ご相談内容' : 'Category',
    date: isJa ? '日付' : 'Date',
    time: isJa ? '時間' : 'Time',
    rebook: isJa
      ? 'また機会がございましたら、改めてご予約をお待ちしております。'
      : 'We would be delighted to host you at another time.',
  }

  const dateStr = formatDate(params.slot_start_at, locale)
  const timeStr = formatTimeRange(params.slot_start_at, params.slot_end_at, locale)

  const html = `${shellOpen(locale, L.header, PALETTE.muted)}
          <tr>
            <td style="padding:32px 32px 8px;">
              <p style="margin:0 0 16px;font-size:16px;color:${PALETTE.text};line-height:1.7;">
                ${escapeHtml(L.greeting)}
              </p>
              <p style="margin:0;font-size:14px;color:${PALETTE.text};line-height:1.9;">
                ${escapeHtml(L.body)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:${PALETTE.muted};font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                ${escapeHtml(L.summary)}
              </h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${PALETTE.border};border-radius:6px;overflow:hidden;">
                ${detailsRow(L.category, escapeHtml(params.category.title))}
                ${detailsRow(L.date, escapeHtml(dateStr))}
                ${detailsRow(L.time, escapeHtml(timeStr), true)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px;">
              <p style="margin:0;font-size:14px;color:${PALETTE.text};line-height:1.8;text-align:center;">
                ${escapeHtml(L.rebook)}
              </p>
            </td>
          </tr>
${shellClose(locale)}`

  const text = [
    L.header,
    '',
    L.greeting,
    '',
    L.body,
    '',
    `${L.summary}:`,
    `  ${L.category}: ${params.category.title}`,
    `  ${L.date}: ${dateStr}`,
    `  ${L.time}: ${timeStr}`,
    '',
    L.rebook,
    '',
    isJa ? '株式会社MEETS' : 'MEETS Inc.',
  ].join('\n')

  return { subject: L.subject, html, text }
}
