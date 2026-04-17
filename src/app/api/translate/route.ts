import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { text, targetLang } = await request.json()

  // Get Gemini API key: prefer env var, fall back to app_settings in DB
  let apiKey = process.env.GEMINI_API_KEY || ''

  if (!apiKey) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const supabase = createAdminClient()
      const { data } = await (supabase as any)
        .from('app_settings')
        .select('value')
        .eq('key', 'gemini_api_key')
        .single()
      apiKey = (data as { value: string } | null)?.value ?? ''
    } catch {
      // DB lookup failed — continue with empty key
    }
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Gemini API key not configured' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Translate the following text to ${targetLang === 'en' ? 'English' : 'Japanese'}. Return ONLY the translation, nothing else:\n\n${text}`,
                },
              ],
            },
          ],
        }),
      }
    )

    const data = await res.json()
    const translated =
      data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return NextResponse.json({ translated })
  } catch (err) {
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    )
  }
}
