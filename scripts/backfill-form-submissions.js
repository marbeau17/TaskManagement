#!/usr/bin/env node
/**
 * crm_form_submissions.data の欠落フィールドを空値で補完するバックフィルスクリプト。
 *
 * 背景:
 *   送信時にユーザーが触れなかったフィールドは React state に存在せず、
 *   JSON にも含まれなかった。結果、受信トレイ・通知メールで未回答項目が
 *   表示されない（4月時点の TEST 送信などが該当）。
 *
 * 動作:
 *   1. crm_form_submissions を全件取得
 *   2. 紐づく form の fields 定義（または 'hearing' フォームの DEFAULT）から
 *      期待されるフィールド名一覧を取り出す
 *   3. data に存在しないフィールドを空値で追加
 *   4. update で書き戻す（差分があるレコードのみ）
 *
 * 実行: node scripts/backfill-form-submissions.js [--dry-run]
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DRY_RUN = process.argv.includes('--dry-run');

// /app/form/[slug]/page.tsx の DEFAULT_FORM と同期。
// hearing フォーム送信は form_id が紐づいていない可能性があるため、
// このリストでフォールバック補完する。
const HEARING_FIELDS = [
  { name: 'company', type: 'text' },
  { name: 'industry', type: 'text' },
  { name: 'name', type: 'text' },
  { name: 'position', type: 'text' },
  { name: 'employees', type: 'select' },
  { name: 'revenue', type: 'select' },
  { name: 'email', type: 'email' },
  { name: 'themes', type: 'checkbox-group' },
  { name: 'issue', type: 'textarea' },
  { name: 'tried', type: 'textarea' },
  { name: 'duration', type: 'select' },
  { name: 'urgency', type: 'radio-group' },
  { name: 'budget', type: 'range' },
  { name: 'decision_maker', type: 'radio-group' },
  { name: 'expectations', type: 'checkbox-group' },
  { name: 'expectations_other', type: 'textarea' },
];

function emptyValueFor(type) {
  if (type === 'checkbox-group') return [];
  if (type === 'range') return '0';
  return '';
}

function backfillData(data, fields) {
  const next = { ...(data || {}) };
  let changed = false;
  for (const f of fields) {
    if (!Object.prototype.hasOwnProperty.call(next, f.name)) {
      next[f.name] = emptyValueFor(f.type);
      changed = true;
    }
  }
  return { next, changed };
}

(async () => {
  console.log(DRY_RUN ? '🔍 DRY RUN モード' : '✏️ 書き込みモード');

  // 1. フォーム定義を取得して form_id → fields のマップを作る
  const { data: forms, error: formsErr } = await supabase
    .from('crm_forms')
    .select('id, name, fields');
  if (formsErr) {
    console.error('Failed to fetch forms:', formsErr.message);
    process.exit(1);
  }
  const formFieldsMap = new Map();
  for (const f of forms || []) {
    const fields = Array.isArray(f.fields)
      ? f.fields.map(x => ({ name: x.name, type: x.type }))
      : [];
    formFieldsMap.set(f.id, { name: f.name, fields });
  }
  console.log(`📋 取得したフォーム定義: ${forms?.length ?? 0} 件`);

  // 2. submissions を全件取得
  const { data: subs, error: subsErr } = await supabase
    .from('crm_form_submissions')
    .select('id, form_id, data');
  if (subsErr) {
    console.error('Failed to fetch submissions:', subsErr.message);
    process.exit(1);
  }
  console.log(`📬 取得した送信レコード: ${subs?.length ?? 0} 件`);

  let updated = 0;
  let skipped = 0;
  for (const sub of subs || []) {
    const formMeta = formFieldsMap.get(sub.form_id);
    const formName = formMeta?.name ?? '';

    // 事前ヒアリングシートだけ補完対象。お問い合わせフォーム等は DB の
    // fields 定義が崩れている（name が空文字や _ など）ため触らない。
    const isHearing = formName.includes('ヒアリング');
    if (!isHearing) {
      skipped++;
      continue;
    }

    // hearing は /app/form/[slug]/page.tsx の DEFAULT_FORM ベース（DB の fields は無視）
    const fields = HEARING_FIELDS;

    const { next, changed } = backfillData(sub.data, fields);
    if (!changed) {
      skipped++;
      continue;
    }

    const addedKeys = Object.keys(next).filter(k => !Object.prototype.hasOwnProperty.call(sub.data || {}, k));
    console.log(`  ${sub.id} (form: ${formName}): +${addedKeys.length} 項目 [${addedKeys.join(', ')}]`);

    if (!DRY_RUN) {
      const { error: updErr } = await supabase
        .from('crm_form_submissions')
        .update({ data: next })
        .eq('id', sub.id);
      if (updErr) {
        console.error(`  ❌ ${sub.id} 更新失敗: ${updErr.message}`);
        continue;
      }
    }
    updated++;
  }

  console.log('');
  console.log(`✅ 完了: 補完 ${updated} 件 / スキップ ${skipped} 件${DRY_RUN ? ' (DRY RUN — 実書き込みはしていません)' : ''}`);
})();
