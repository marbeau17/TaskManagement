#!/usr/bin/env node
/**
 * 既存の crm_contacts / crm_leads / crm_companies に対し、
 * 自由文字列の source カラムから推定して source_channel / source_detail を埋める。
 *
 * 仕様: docs/lead_source_spec.md §3 / source-resolver.ts inferChannelFromLegacySource
 *
 * 実行: node scripts/backfill-source-channel.js [--dry-run]
 *
 * 注: migration 068 が先に適用されている必要がある。
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const s = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const DRY_RUN = process.argv.includes('--dry-run');

// source-resolver.ts の inferChannelFromLegacySource と同期した推定ロジック
// 注: substring 検索だと "pipeline" が "line" にマッチして social と誤判定されるため、
//     トークン分割 + 完全一致または接頭辞/接尾辞照合を使う。
function inferChannel(source) {
  const s = (source ?? '').trim().toLowerCase();
  if (!s) return 'other';

  // トークン分割 (_, -, スペース, /, , で区切る)
  const tokens = new Set(s.split(/[_\-\s,/]+/).filter(Boolean));
  const has = (token) => tokens.has(token);

  // 1. 完全一致 / 既知のエイリアス (最優先)
  if (s === 'pipeline') return 'other';                          // 社内パイプライン経由
  if (s === 'website' || s === 'direct') return 'direct';

  // 2. フォーム系 (token 一致)
  if (has('form') || has('hearing') || s.includes('hearing_form') || s.includes('contact_form') || s.includes('document_request') || s.includes('web_form')) return 'form';

  // 3. SNS (LINE は token として完全一致のみ、"pipeline" はマッチしない)
  if (has('line') || has('twitter') || has('facebook') || has('instagram') || has('tiktok') || has('linkedin') || has('x')) return 'social';

  // 4. パートナー / 紹介
  if (has('partner') || has('bank') || s.includes('partner_referral')) return 'partner';
  if (has('referral')) return 'referral';

  // 5. イベント / メール / 検索
  if (has('event') || has('seminar') || has('webinar') || has('expo')) return 'event';
  if (has('email') || has('newsletter') || has('mail')) return 'email';
  if (has('google') || has('yahoo') || has('bing') || has('search') || has('organic')) return 'organic_search';
  if (has('ads') || has('cpc') || has('ppc') || s.includes('google_ads') || s.includes('yahoo_ads')) return 'paid_search';

  // 6. アウトバウンド
  if (has('cold') || has('outbound') || has('cold_call') || has('cold_email')) return 'outbound';

  // 7. 一般 social キーワード
  if (has('social')) return 'social';

  return 'other';
}

async function backfillTable(table, label) {
  const { data, error } = await s.from(table).select('id, source, source_channel');
  if (error) {
    console.error(`${label}: SELECT failed:`, error.message);
    return;
  }
  console.log(`\n=== ${label} (${data.length} 件) ===`);
  let touched = 0;
  let skipped = 0;
  const stats = {};
  for (const row of data) {
    if (row.source_channel) {
      skipped++;
      continue;
    }
    const channel = inferChannel(row.source);
    const detail = (row.source ?? '').trim().toLowerCase();
    stats[channel] = (stats[channel] ?? 0) + 1;
    if (!DRY_RUN) {
      const { error: updErr } = await s.from(table).update({
        source_channel: channel,
        source_detail: detail || null,
      }).eq('id', row.id);
      if (updErr) console.error(`  ❌ ${row.id} 更新失敗: ${updErr.message}`);
    }
    touched++;
  }
  console.log(`  補完: ${touched} / スキップ済(既設定): ${skipped}`);
  console.log('  チャネル別:', stats);
}

(async () => {
  if (!url || !key) {
    console.error('Missing env vars'); process.exit(1);
  }
  console.log(DRY_RUN ? '🔍 DRY RUN' : '✏️ 書き込みモード');
  await backfillTable('crm_contacts', 'crm_contacts');
  await backfillTable('crm_leads', 'crm_leads');
  await backfillTable('crm_companies', 'crm_companies');
  console.log('\n完了');
})();
