import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

async function getApiKeyFromDb(): Promise<string | null> {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any
    const { data, error } = await db
      .from('app_settings')
      .select('value')
      .eq('key', 'gemini_api_key')
      .maybeSingle()
    if (error) {
      console.error('[diagnosis] DB lookup error:', error.message)
      return null
    }
    return data?.value || null
  } catch (err) {
    console.error('[diagnosis] DB lookup threw:', err)
    return null
  }
}

function buildPrompt(formData: Record<string, any>): string {
  const company = formData.company || formData.company_name || '不明'
  const industry = formData.industry || formData.custom_fields?.industry || '不明'
  const employees = formData.employees || formData.custom_fields?.employees || '不明'
  const revenue = formData.revenue || formData.custom_fields?.revenue || '不明'
  const position = formData.position || formData.custom_fields?.position || '不明'
  const themes = formData.themes || formData.custom_fields?.themes || '不明'
  const issue = formData.issue || formData.custom_fields?.issue || formData.description || '不明'
  const tried = formData.tried || formData.custom_fields?.tried || '不明'
  const duration = formData.duration || formData.custom_fields?.duration || '不明'
  const urgency = formData.urgency || formData.custom_fields?.urgency || '不明'
  const budget = formData.budget || formData.custom_fields?.budget || '不明'
  const decisionMaker = formData.decision_maker || formData.custom_fields?.decision_maker || '不明'
  const expectations = formData.expectations || formData.custom_fields?.expectations || '不明'

  return `あなたはMeets Consultingの経営コンサルタントです。以下のクライアント情報と相談内容を分析し、経営診断レポートをJSON形式で作成してください。

【クライアント情報】
会社名: ${company}
業種: ${industry}
従業員数: ${employees}
年商: ${revenue}
役職: ${position}

【相談内容】
相談テーマ: ${themes}
現在の課題: ${issue}
過去の施策: ${tried}
課題期間: ${duration}
緊急度: ${urgency}
予算感: ${budget}
意思決定者: ${decisionMaker}
期待すること: ${expectations}

上記の情報と、「${company}」に関する公開情報（業界動向、競合環境など）を踏まえて、以下の観点で経営診断を行ってください:

1. SWOT分析
2. 4P分析（マーケティングミックス）
3. MECE分類による解決策（DX/AI/経営/組織の4軸）
4. 優先アクションプラン（タイムライン付き）
5. リスクアセスメント
6. 推奨アプローチ
7. 想定ROI

以下のJSON形式で回答してください。JSON以外のテキストは含めないでください:
{
  "company_overview": "企業の概要（公開情報に基づく）",
  "swot": {
    "strengths": ["強み1", "強み2"],
    "weaknesses": ["弱み1", "弱み2"],
    "opportunities": ["機会1", "機会2"],
    "threats": ["脅威1", "脅威2"]
  },
  "four_p": {
    "product": "製品・サービス分析",
    "price": "価格戦略分析",
    "place": "流通・チャネル分析",
    "promotion": "プロモーション分析"
  },
  "mece_solutions": [
    { "category": "DX/デジタル", "solutions": ["施策1", "施策2"] },
    { "category": "AI活用", "solutions": ["施策1", "施策2"] },
    { "category": "経営戦略", "solutions": ["施策1", "施策2"] },
    { "category": "組織・人材", "solutions": ["施策1", "施策2"] }
  ],
  "priority_actions": [
    { "action": "アクション内容", "timeline": "実施時期", "impact": "high/medium/low" }
  ],
  "risk_assessment": "リスク評価の詳細",
  "recommended_approach": "推奨アプローチの詳細",
  "estimated_roi": "想定ROIの詳細"
}`
}

/**
 * 直近 3 件を残して古い診断を削除する。
 * Supabase の `.limit().offset()` + delete は使えないため、
 * id を取得して slice(3) を delete .in() する。
 */
async function pruneOldDiagnoses(db: any, leadId: string) {
  const { data: rows } = await db
    .from('crm_lead_diagnoses')
    .select('id')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  if (!rows || rows.length <= 3) return
  const oldIds = rows.slice(3).map((r: { id: string }) => r.id)
  if (oldIds.length > 0) {
    await db.from('crm_lead_diagnoses').delete().in('id', oldIds)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, formData: directFormData, diagnosis: providedDiagnosis } = body

    // 既存の診断結果をそのまま保存するモード（再生成なし）
    if (leadId && providedDiagnosis && typeof providedDiagnosis === 'object') {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const db = createAdminClient() as any
      const { createServerSupabaseClient } = await import('@/lib/supabase/server')
      const supa = await createServerSupabaseClient()
      const { data: { user } } = await supa.auth.getUser()
      const { data: saved, error: saveErr } = await db.from('crm_lead_diagnoses').insert({
        lead_id: leadId,
        diagnosis: providedDiagnosis,
        model: 'manual-save',
        created_by: user?.id ?? null,
      }).select('id, created_at').single()
      if (saveErr) {
        console.error('[diagnosis] save-only insert failed:', saveErr.message)
        return NextResponse.json({ error: saveErr.message }, { status: 500 })
      }
      await pruneOldDiagnoses(db, leadId)
      return NextResponse.json({ diagnosis: providedDiagnosis, saved })
    }

    let formData: Record<string, any>

    if (directFormData) {
      // Use directly provided form data
      formData = directFormData
    } else if (leadId) {
      // Fetch lead data from database
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const supabase = createAdminClient() as any

      const { data: lead, error } = await supabase
        .from('crm_leads')
        .select(`
          *,
          contact:crm_contacts(*),
          company:crm_companies(*)
        `)
        .eq('id', leadId)
        .single()

      if (error || !lead) {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        )
      }

      // Merge lead, contact, company, and custom_fields into a flat formData
      formData = {
        company: lead.company?.name || '',
        industry: lead.company?.industry || '',
        employees: lead.company?.company_size || '',
        description: lead.description || '',
        ...((lead.custom_fields as Record<string, any>) || {}),
        contact_name: lead.contact
          ? `${lead.contact.last_name || ''} ${lead.contact.first_name || ''}`.trim()
          : '',
        position: lead.contact?.title || '',
      }
    } else {
      return NextResponse.json(
        { error: 'Either leadId or formData is required' },
        { status: 400 }
      )
    }

    // Get Gemini API key
    let apiKey = process.env.GEMINI_API_KEY || ''
    let keySource: 'env' | 'db' | 'none' = apiKey ? 'env' : 'none'
    if (!apiKey) {
      apiKey = (await getApiKeyFromDb()) || ''
      if (apiKey) keySource = 'db'
    }
    if (!apiKey) {
      console.error('[diagnosis] No Gemini API key found (env or DB)')
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 400 }
      )
    }
    console.log(`[diagnosis] Using Gemini key from ${keySource} (len=${apiKey.length})`)

    const prompt = buildPrompt(formData)

    const model = 'gemini-2.5-flash'
    // responseMimeType=application/json で markdown ラップなしの純 JSON を強制。
    // maxOutputTokens は構造化レポートが MAX_TOKENS で途切れる事象があったため
    // 4096 → 8192 に増量。
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      console.error(
        `[diagnosis] Gemini ${model} failed: status=${res.status} body=${errorText.slice(0, 500)}`
      )
      return NextResponse.json(
        {
          error: 'Gemini API call failed',
          status: res.status,
          details: errorText.slice(0, 1000),
        },
        { status: 502 }
      )
    }

    const data = await res.json()
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const finishReason = data.candidates?.[0]?.finishReason
    if (!rawText) {
      console.error('[diagnosis] Empty response from Gemini:', JSON.stringify(data).slice(0, 500))
    }
    if (finishReason === 'MAX_TOKENS') {
      console.warn('[diagnosis] Gemini hit MAX_TOKENS — response may be truncated (len=' + rawText.length + ')')
    }

    // Parse JSON from Gemini response.
    // responseMimeType=application/json で純 JSON が返るはずだが、念のため
    // ```json ... ``` ラップ / 途中で切れた JSON への対応もする。
    let diagnosis: Record<string, any>
    try {
      // 1) ```...``` ラップを剥がす（閉じが無くても先頭の ``` だけは剥がす）
      const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
      let jsonStr = fenceMatch ? fenceMatch[1].trim() : rawText.trim().replace(/^```(?:json)?\s*/i, '')
      // 2) 純パースを試す
      try {
        diagnosis = JSON.parse(jsonStr)
      } catch {
        // 3) 途切れている可能性 → 最後の閉じ括弧までで打ち切って再試行
        const lastBrace = jsonStr.lastIndexOf('}')
        if (lastBrace > 0) {
          jsonStr = jsonStr.slice(0, lastBrace + 1)
          diagnosis = JSON.parse(jsonStr)
        } else {
          throw new Error('No closing brace found')
        }
      }
    } catch (parseErr) {
      // パース失敗時は 502 を返してクライアント側でエラー扱いさせる
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr)
      console.error('[diagnosis] JSON parse failed:', msg, '\nraw:', rawText.slice(0, 300))
      return NextResponse.json(
        {
          error: 'Failed to parse diagnosis JSON from AI response',
          details: msg,
          raw: rawText.slice(0, 800),
        },
        { status: 502 },
      )
    }

    // 期待スキーマの最低限の整合性チェック（swot 配下が無いと UI が落ちる）
    if (!diagnosis || typeof diagnosis !== 'object' || !diagnosis.swot) {
      console.error('[diagnosis] AI returned malformed structure:', JSON.stringify(diagnosis).slice(0, 300))
      return NextResponse.json(
        {
          error: 'AI returned malformed structure (missing swot)',
          raw: rawText.slice(0, 800),
        },
        { status: 502 },
      )
    }

    // 永続化: leadId がある場合のみ保存。3 世代に制限。
    let saved: { id: string; created_at: string } | null = null
    if (leadId) {
      try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const db = createAdminClient() as any
        const { createServerSupabaseClient } = await import('@/lib/supabase/server')
        const supa = await createServerSupabaseClient()
        const { data: { user } } = await supa.auth.getUser()
        const { data: ins, error: insErr } = await db.from('crm_lead_diagnoses').insert({
          lead_id: leadId,
          diagnosis,
          model,
          created_by: user?.id ?? null,
        }).select('id, created_at').single()
        if (insErr) {
          console.error('[diagnosis] persist insert failed:', insErr.message)
        } else {
          saved = ins
          await pruneOldDiagnoses(db, leadId)
        }
      } catch (persistErr) {
        console.error('[diagnosis] persist threw:', persistErr)
      }
    }

    return NextResponse.json({ diagnosis, saved })
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
    console.error('[diagnosis] Unhandled error:', msg)
    return NextResponse.json(
      { error: 'Diagnosis generation failed', details: msg.slice(0, 500) },
      { status: 500 }
    )
  }
}

// 保存済み診断の取得
// ?leadId=xxx  → そのリードの最新 3 件 (newest first) を { history: [...] } で返す
// (no params) → 診断済リード ID 一覧を { leadIds: [...] } で返す
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const leadId = url.searchParams.get('leadId')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    if (leadId) {
      const { data, error } = await db
        .from('crm_lead_diagnoses')
        .select('id, diagnosis, model, created_at, created_by')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(3)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ history: data ?? [] })
    }

    const { data, error } = await db
      .from('crm_lead_diagnoses')
      .select('lead_id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const leadIds = Array.from(new Set((data ?? []).map((r: { lead_id: string }) => r.lead_id)))
    return NextResponse.json({ leadIds })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
