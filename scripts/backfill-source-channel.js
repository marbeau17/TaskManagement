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
function inferChannel(source) {
  const s = (source ?? '').trim().toLowerCase();
  if (!s) return 'other';
  if (s.includes('hearing') || s.includes('form') || s.includes('contact_form') || s.includes('document_request')) return 'form';
  if (s.includes('line')) return 'social';
  if (s.includes('partner') || s.includes('bank')) return 'partner';
  if (s.includes('referral')) return 'referral';
  if (s.includes('event') || s.includes('seminar') || s.includes('webinar')) return 'event';
  if (s.includes('email') || s.includes('newsletter')) return 'email';
  if (s.includes('social') || s.includes('twitter') || s.includes('facebook') || s.includes('instagram')) return 'social';
  if (s.includes('search') || s.includes('google') || s.includes('yahoo')) return 'organic_search';
  if (s.includes('ads') || s.includes('cpc') || s.includes('ppc')) return 'paid_search';
  if (s.includes('direct')) return 'direct';
  if (s.includes('cold') || s.includes('outbound')) return 'outbound';
  if (s.includes('pipeline')) return 'other';
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
