// =============================================================================
// 流入経路 (Lead Source) Resolver
// 仕様: docs/lead_source_spec.md
//
// UTM パラメータ・Referrer・フォーム種別から 12 チャネルの source_channel と
// source_detail を導出する。
// =============================================================================

export const SOURCE_CHANNELS = [
  'organic_search',
  'paid_search',
  'paid_social',
  'social',
  'direct',
  'referral',
  'email',
  'form',
  'event',
  'partner',
  'outbound',
  'other',
] as const

export type SourceChannel = (typeof SOURCE_CHANNELS)[number]

export const SOURCE_CHANNEL_LABELS: Record<SourceChannel, string> = {
  organic_search: '自然検索',
  paid_search: '検索広告',
  paid_social: 'SNS広告',
  social: 'SNS',
  direct: '直接流入',
  referral: '他サイト紹介',
  email: 'メール',
  form: '自社フォーム',
  event: 'イベント・展示会',
  partner: '提携パートナー',
  outbound: 'アウトバウンド営業',
  other: 'その他',
}

// バッジ表示用の色 (Tailwind クラス)
export const SOURCE_CHANNEL_COLORS: Record<SourceChannel, string> = {
  organic_search: 'bg-blue-100 text-blue-700 border-blue-200',
  paid_search: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  paid_social: 'bg-violet-100 text-violet-700 border-violet-200',
  social: 'bg-pink-100 text-pink-700 border-pink-200',
  direct: 'bg-slate-100 text-slate-600 border-slate-200',
  referral: 'bg-amber-100 text-amber-700 border-amber-200',
  email: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  form: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  event: 'bg-orange-100 text-orange-700 border-orange-200',
  partner: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  outbound: 'bg-red-100 text-red-700 border-red-200',
  other: 'bg-gray-100 text-gray-500 border-gray-200',
}

const SEARCH_ENGINE_HOSTS = /\b(google|yahoo|bing|duckduckgo|baidu|naver)\b/i
const SOCIAL_HOSTS: Record<string, string> = {
  'x.com': 'x',
  'twitter.com': 'x',
  't.co': 'x',
  'facebook.com': 'facebook',
  'm.facebook.com': 'facebook',
  'l.facebook.com': 'facebook',
  'instagram.com': 'instagram',
  'line.me': 'line',
  'lin.ee': 'line',
  'liff.line.me': 'line',
  'tiktok.com': 'tiktok',
  'linkedin.com': 'linkedin',
  'youtube.com': 'youtube',
}
const SELF_HOSTS = /\b(meetsc\.co\.jp|portal\.meetsc\.co\.jp|task-management.*\.vercel\.app)\b/i

// 既知のフォーム種別 → source_detail
const FORM_KIND_TO_DETAIL: Record<string, string> = {
  hearing: 'hearing_form',
  hearing_form: 'hearing_form',
  contact: 'contact_form',
  contact_form: 'contact_form',
  document: 'document_request',
  document_request: 'document_request',
  line: 'line_inquiry',
  inquiry: 'contact_form',
}

export interface SourceInput {
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  referrer?: string | null
  landingUrl?: string | null
  /** 'hearing' | 'contact' | 'document' | 'line' | 任意の自由文字列 */
  formKind?: string | null
}

export interface ResolvedSource {
  channel: SourceChannel
  detail: string
}

function safeHost(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

/**
 * UTM / Referrer / フォーム種別から source_channel と source_detail を導出。
 * 優先順位は仕様書 §3 と一致:
 *   1. formKind (内部フォーム)
 *   2. UTM パラメータ
 *   3. Referrer ホスト
 *   4. fallback: direct
 */
export function resolveSource(input: SourceInput): ResolvedSource {
  // 1. フォーム送信が明示されている場合
  if (input.formKind) {
    const detail = FORM_KIND_TO_DETAIL[normalize(input.formKind)] ?? normalize(input.formKind)
    return { channel: 'form', detail }
  }

  const utmSource = normalize(input.utmSource)
  const utmMedium = normalize(input.utmMedium)
  const utmCampaign = normalize(input.utmCampaign)

  // 2-1. UTM source=line は SNS 扱い (LINE 公式アカウント経由)
  if (utmSource === 'line' || utmSource === 'line_official') {
    return { channel: 'social', detail: 'line' }
  }

  // 2-2. UTM medium による判定
  if (utmMedium) {
    if (utmMedium === 'cpc' || utmMedium === 'ppc' || utmMedium === 'paid_search' || utmMedium === 'paidsearch') {
      return { channel: 'paid_search', detail: utmSource || 'unknown' }
    }
    if (utmMedium === 'paid_social' || utmMedium === 'paidsocial' || utmMedium === 'cpc_social') {
      return { channel: 'paid_social', detail: utmSource || 'unknown' }
    }
    if (utmMedium === 'email' || utmMedium === 'newsletter' || utmMedium === 'mail') {
      return { channel: 'email', detail: utmCampaign || utmSource || 'newsletter' }
    }
    if (utmMedium === 'event' || utmMedium === 'webinar' || utmMedium === 'seminar') {
      return { channel: 'event', detail: utmCampaign || utmSource || 'event' }
    }
    if (utmMedium === 'referral') {
      return { channel: 'referral', detail: utmSource || 'unknown' }
    }
    if (utmMedium === 'organic') {
      return { channel: 'organic_search', detail: utmSource || 'unknown' }
    }
    if (utmMedium === 'social' || utmMedium === 'social_organic') {
      return { channel: 'social', detail: utmSource || 'unknown' }
    }
    if (utmMedium === 'partner' || utmMedium === 'affiliate') {
      return { channel: 'partner', detail: utmSource || 'unknown' }
    }
    if (utmMedium === 'outbound' || utmMedium === 'cold_email' || utmMedium === 'cold_call') {
      return { channel: 'outbound', detail: utmMedium }
    }
  }

  // 2-3. UTM source のみある (medium なし) の場合は referral 扱い
  if (utmSource && !utmMedium) {
    return { channel: 'referral', detail: utmSource }
  }

  // 3. Referrer 解析
  const refHost = safeHost(input.referrer)
  if (refHost) {
    // 自社ドメインからの遷移は無視 (内部遷移)
    if (!SELF_HOSTS.test(refHost)) {
      if (SEARCH_ENGINE_HOSTS.test(refHost)) {
        const match = refHost.match(SEARCH_ENGINE_HOSTS)
        return { channel: 'organic_search', detail: match?.[1]?.toLowerCase() ?? refHost }
      }
      // SNS ホスト一致
      for (const [host, name] of Object.entries(SOCIAL_HOSTS)) {
        if (refHost === host || refHost.endsWith('.' + host)) {
          return { channel: 'social', detail: name }
        }
      }
      // それ以外の外部サイト
      return { channel: 'referral', detail: refHost }
    }
  }

  // 4. 何も手がかりがない → 直接流入
  return { channel: 'direct', detail: '' }
}

/**
 * 既存の自由文字列 source 値 (旧スキーマ) から channel を推定する backfill 用ヘルパー。
 * 注: substring だと "pipeline" が "line" にマッチして social と誤判定されるため、
 *     トークン分割 + 完全一致 (集合) を使う。
 */
export function inferChannelFromLegacySource(source: string | null | undefined): SourceChannel {
  const s = normalize(source)
  if (!s) return 'other'
  const tokens = new Set(s.split(/[_\-\s,/]+/).filter(Boolean))
  const has = (token: string) => tokens.has(token)

  // 1. 完全一致 / 既知のエイリアス (最優先)
  if (s === 'pipeline') return 'other'
  if (s === 'website' || s === 'direct') return 'direct'

  // 2. フォーム系
  if (has('form') || has('hearing') || s.includes('hearing_form') || s.includes('contact_form') || s.includes('document_request') || s.includes('web_form')) return 'form'

  // 3. SNS (token 完全一致)
  if (has('line') || has('twitter') || has('facebook') || has('instagram') || has('tiktok') || has('linkedin') || has('x')) return 'social'

  // 4. パートナー / 紹介
  if (has('partner') || has('bank') || s.includes('partner_referral')) return 'partner'
  if (has('referral')) return 'referral'

  // 5. イベント / メール / 検索
  if (has('event') || has('seminar') || has('webinar') || has('expo')) return 'event'
  if (has('email') || has('newsletter') || has('mail')) return 'email'
  if (has('google') || has('yahoo') || has('bing') || has('search') || has('organic')) return 'organic_search'
  if (has('ads') || has('cpc') || has('ppc') || s.includes('google_ads') || s.includes('yahoo_ads')) return 'paid_search'

  // 6. アウトバウンド
  if (has('cold') || has('outbound') || has('cold_call') || has('cold_email')) return 'outbound'

  // 7. 一般 social キーワード
  if (has('social')) return 'social'

  return 'other'
}
