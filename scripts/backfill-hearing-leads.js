#!/usr/bin/env node
/**
 * /api/form/submit のカラム名バグ (size, job_title) により
 * crm_companies と crm_contacts の挿入が silent fail していた問題のリカバリ。
 *
 * 対象: source='hearing_form' で contact_id が null のリード（5/8〜5/12 の 4 件）
 *
 * 復元手順:
 *   1. lead.description / custom_fields をパースして基本情報を取り出す
 *   2. booking_slots からメールアドレスを補完（予約枠が割当されている場合）
 *   3. crm_companies に会社を作成
 *   4. crm_contacts に担当者を作成（メールがある場合のみ）
 *   5. lead を contact_id / company_id で更新
 *   6. crm_form_submissions に新規レコードを作成（受信トレイ表示用）
 *
 * 実行: node scripts/backfill-hearing-leads.js [--dry-run]
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY');
  process.exit(1);
}
const s = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const DRY_RUN = process.argv.includes('--dry-run');

const HEARING_FORM_NAME_PATTERN = 'ヒアリング';

function parseDescription(desc) {
  // 描画フォーマットを正規表現で逆解析
  const get = (re) => {
    const m = desc.match(re);
    return m ? m[1].trim() : '';
  };
  const company = get(/会社名:\s*(.+)/);
  const industry = get(/業種:\s*(.+)/);
  // 担当者: 田中　高行（代表取締役） or 担当者: TESTEST（TEST）
  const namePosMatch = desc.match(/担当者:\s*(.+?)（(.+?)）/);
  const name = namePosMatch ? namePosMatch[1].trim() : '';
  const position = namePosMatch ? namePosMatch[2].trim() : '';
  const employees = get(/従業員数:\s*(.+)/);
  const revenue = get(/年商:\s*(.+)/);
  const issue = get(/【課題】\s*(.+?)(?=\n【|$)/s) || get(/現在の課題:\s*(.+?)(?=\n|$)/s);
  const tried = get(/【過去の施策】\s*(.+?)(?=\n【|$)/s) || get(/過去の施策:\s*(.+?)(?=\n|$)/s);
  const duration = get(/【課題期間】\s*(.+?)(?=\n|$)/) || get(/課題期間:\s*(.+?)(?=\n|$)/);
  const expectationsOther = get(/【その他】\s*(.+?)(?=\n【|$)/s);
  return { company, industry, name, position, employees, revenue, issue, tried, duration, expectationsOther };
}

(async () => {
  console.log(DRY_RUN ? '🔍 DRY RUN' : '✏️ 書き込みモード');

  // 2026-05-01 以降のみ対象（4月のリードは既に別途 submissions が存在）
  const { data: leads, error: lerr } = await s
    .from('crm_leads')
    .select('*')
    .eq('source', 'hearing_form')
    .is('contact_id', null)
    .gte('created_at', '2026-05-01')
    .order('created_at', { ascending: false });
  if (lerr) { console.error(lerr); process.exit(1); }
  console.log(`孤立リード: ${leads.length} 件`);

  // hearing フォーム ID 取得
  const { data: form } = await s.from('crm_forms').select('id').ilike('name', `%${HEARING_FORM_NAME_PATTERN}%`).limit(1).maybeSingle();
  if (!form?.id) { console.error('hearing form not found'); process.exit(1); }
  const formId = form.id;
  console.log(`hearing form_id: ${formId}\n`);

  for (const lead of leads) {
    console.log(`--- ${lead.title} (${lead.created_at}) ---`);
    const parsed = parseDescription(lead.description || '');
    const cf = lead.custom_fields || {};
    console.log(`  会社: ${parsed.company} / 担当者: ${parsed.name} / 役職: ${parsed.position}`);

    // 1. description 内に「メール: xxx」があれば優先
    let email = '';
    const emailInDesc = (lead.description || '').match(/メール:\s*([\w.+-]+@[\w-]+\.[\w.-]+)/);
    if (emailInDesc) {
      email = emailInDesc[1];
      console.log(`  ✉ メール (description): ${email}`);
    } else {
      // 2. booking_slots からメール補完 (会社名 + 担当者名 の AND で照合)
      const { data: slot } = await s
        .from('booking_slots')
        .select('booked_by_email')
        .eq('booked_by_company', parsed.company)
        .eq('booked_by_name', parsed.name)
        .not('booked_by_email', 'is', null)
        .limit(1)
        .maybeSingle();
      if (slot?.booked_by_email) {
        email = slot.booked_by_email;
        console.log(`  ✉ メール (booking_slot): ${email}`);
      } else {
        console.log('  ⚠️ メールが見つからない');
      }
    }

    // 既に submissions が存在するかチェック（重複防止）
    let dupCheck = null;
    if (email) {
      const { data: existing } = await s
        .from('crm_form_submissions')
        .select('id')
        .eq('form_id', formId)
        .eq('data->>email', email);
      if (existing && existing.length > 0) {
        dupCheck = existing[0].id;
      }
    }
    if (dupCheck) {
      console.log(`  ⏭ 既に submission 存在 (${dupCheck}) — スキップ`);
      continue;
    }

    if (DRY_RUN) {
      console.log('  [DRY] submission を新規挿入 (会社/連絡先も作成)');
      continue;
    }

    // 1. Company find-or-create
    let companyId = null;
    if (parsed.company) {
      const { data: existingComp } = await s.from('crm_companies').select('id').eq('name', parsed.company).maybeSingle();
      if (existingComp) {
        companyId = existingComp.id;
      } else {
        const { data: newComp, error: ce } = await s.from('crm_companies').insert({
          name: parsed.company,
          industry: parsed.industry || null,
          company_size: parsed.employees || null,
        }).select('id').single();
        if (ce) console.error('  ❌ company insert:', ce.message);
        companyId = newComp?.id;
      }
    }

    // 2. Contact find-or-create (email がある場合のみ)
    let contactId = null;
    if (email) {
      const { data: existingContact } = await s.from('crm_contacts').select('id').eq('email', email).maybeSingle();
      if (existingContact) {
        contactId = existingContact.id;
        await s.from('crm_contacts').update({
          company_id: companyId,
          title: parsed.position || undefined,
          updated_at: new Date().toISOString(),
        }).eq('id', contactId);
      } else {
        const nameParts = parsed.name.split(/\s+/);
        const { data: newC, error: ke } = await s.from('crm_contacts').insert({
          first_name: nameParts[0] || parsed.name,
          last_name: nameParts.slice(1).join(' ') || '',
          email,
          company_id: companyId,
          title: parsed.position || null,
          lifecycle_stage: 'lead',
          lead_status: 'new',
          source: 'hearing_form',
        }).select('id').single();
        if (ke) console.error('  ❌ contact insert:', ke.message);
        contactId = newC?.id;
      }
    }

    // 3. Lead update
    if (contactId || companyId) {
      await s.from('crm_leads').update({
        contact_id: contactId,
        company_id: companyId,
      }).eq('id', lead.id);
      console.log(`  🔗 lead を更新 (contact: ${contactId?.slice(0,8) ?? '-'}, company: ${companyId?.slice(0,8) ?? '-'})`);
    }

    // 4. Form submission insert (常に作成、contact_id は null 可)
    const reconstructedData = {
      company: parsed.company,
      industry: parsed.industry,
      name: parsed.name,
      position: parsed.position,
      employees: parsed.employees,
      revenue: parsed.revenue,
      email: email || '',
      themes: cf.themes || [],
      issue: parsed.issue,
      tried: parsed.tried,
      duration: parsed.duration,
      urgency: cf.urgency || '',
      budget: cf.budget || '',
      decision_maker: cf.decision_maker || '',
      expectations: cf.expectations || [],
      expectations_other: parsed.expectationsOther,
    };
    const { data: subIns, error: subErr } = await s.from('crm_form_submissions').insert({
      form_id: formId,
      contact_id: contactId,
      data: reconstructedData,
      status: 'new',
      created_at: lead.created_at, // リード作成時刻と合わせる
    }).select('id').single();
    if (subErr) console.error('  ❌ submission insert:', subErr.message);
    else console.log(`  ✅ submission 作成: ${subIns.id}`);
  }

  console.log('\n完了');
})();
