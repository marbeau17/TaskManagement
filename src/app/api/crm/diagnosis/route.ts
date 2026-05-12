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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, formData: directFormData } = body

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
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
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
    if (!rawText) {
      console.error('[diagnosis] Empty response from Gemini:', JSON.stringify(data).slice(0, 500))
    }

    // Parse JSON from Gemini response (may be wrapped in markdown code block)
    let diagnosis: Record<string, any>
    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawText.trim()
      diagnosis = JSON.parse(jsonStr)
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

    return NextResponse.json({ diagnosis })
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
    console.error('[diagnosis] Unhandled error:', msg)
    return NextResponse.json(
      { error: 'Diagnosis generation failed', details: msg.slice(0, 500) },
      { status: 500 }
    )
  }
}
