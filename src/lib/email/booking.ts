import { sendEmail } from './send-email'
import {
  BookingConfirmationEmailHtml,
  BookingAdminNotificationHtml,
  BookingCancellationEmailHtml,
  type BookingLocale,
  type BookingCategory,
  type BookingConsultant,
  type BookingLead,
} from './templates-booking'

export interface SendResult {
  ok: boolean
  error?: string
}

const FROM_NAME = 'MEETS Inc.'
const DEFAULT_LOCALE: BookingLocale = 'ja'
const DEFAULT_APP_URL = 'https://portal.meetsc.co.jp'

function resolveAppBaseUrl(appBaseUrl?: string): string {
  return (
    appBaseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    DEFAULT_APP_URL
  )
}

function buildCancellationUrl(appBaseUrl: string, token: string): string {
  return `${appBaseUrl}/book/cancel?token=${encodeURIComponent(token)}`
}

function buildCrmLeadUrl(appBaseUrl: string, leadId: string): string {
  return `${appBaseUrl}/crm?tab=leads&lead_id=${encodeURIComponent(leadId)}`
}

// -------------------- Confirmation --------------------

export interface SendBookingConfirmationParams {
  to: string
  locale?: BookingLocale
  category: BookingCategory
  consultant: BookingConsultant
  lead?: Pick<BookingLead, 'name'>
  slot_start_at: string
  slot_end_at: string
  cancellation_token: string
  app_base_url?: string
}

export async function sendBookingConfirmationEmail(
  params: SendBookingConfirmationParams
): Promise<SendResult> {
  if (!params.to) {
    return { ok: false, error: 'Missing recipient address' }
  }

  try {
    const locale = params.locale ?? DEFAULT_LOCALE
    const appBaseUrl = resolveAppBaseUrl(params.app_base_url)
    const cancellation_url = buildCancellationUrl(appBaseUrl, params.cancellation_token)

    const { subject, html } = BookingConfirmationEmailHtml({
      locale,
      category: params.category,
      consultant: params.consultant,
      lead: params.lead,
      slot_start_at: params.slot_start_at,
      slot_end_at: params.slot_end_at,
      cancellation_url,
    })

    const ok = await sendEmail({
      to: params.to,
      subject,
      html,
      fromName: FROM_NAME,
    })

    return ok ? { ok: true } : { ok: false, error: 'SMTP send failed' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Booking] Confirmation email failed:', err)
    return { ok: false, error: message }
  }
}

// -------------------- Admin Notification --------------------

export interface SendBookingAdminNotificationParams {
  to: string
  locale?: BookingLocale
  category: BookingCategory
  consultant: BookingConsultant
  lead: BookingLead
  slot_start_at: string
  slot_end_at: string
  lead_id: string
  app_base_url?: string
}

export async function sendBookingAdminNotificationEmail(
  params: SendBookingAdminNotificationParams
): Promise<SendResult> {
  if (!params.to) {
    return { ok: false, error: 'Missing recipient address' }
  }

  try {
    const locale = params.locale ?? DEFAULT_LOCALE
    const appBaseUrl = resolveAppBaseUrl(params.app_base_url)
    const crm_lead_url = buildCrmLeadUrl(appBaseUrl, params.lead_id)

    const { subject, html } = BookingAdminNotificationHtml({
      locale,
      category: params.category,
      consultant: params.consultant,
      lead: params.lead,
      slot_start_at: params.slot_start_at,
      slot_end_at: params.slot_end_at,
      crm_lead_url,
    })

    const ok = await sendEmail({
      to: params.to,
      subject,
      html,
      fromName: FROM_NAME,
    })

    return ok ? { ok: true } : { ok: false, error: 'SMTP send failed' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Booking] Admin notification email failed:', err)
    return { ok: false, error: message }
  }
}

// -------------------- Cancellation --------------------

export interface SendBookingCancellationParams {
  to: string
  locale?: BookingLocale
  category: BookingCategory
  slot_start_at: string
  slot_end_at: string
  lead?: Pick<BookingLead, 'name'>
}

export async function sendBookingCancellationEmail(
  params: SendBookingCancellationParams
): Promise<SendResult> {
  if (!params.to) {
    return { ok: false, error: 'Missing recipient address' }
  }

  try {
    const locale = params.locale ?? DEFAULT_LOCALE

    const { subject, html } = BookingCancellationEmailHtml({
      locale,
      category: params.category,
      slot_start_at: params.slot_start_at,
      slot_end_at: params.slot_end_at,
      lead: params.lead,
    })

    const ok = await sendEmail({
      to: params.to,
      subject,
      html,
      fromName: FROM_NAME,
    })

    return ok ? { ok: true } : { ok: false, error: 'SMTP send failed' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Booking] Cancellation email failed:', err)
    return { ok: false, error: message }
  }
}
