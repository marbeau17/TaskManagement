import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { text, targetLang } = await request.json()

  // Get Gemini API key from settings or env
  const apiKey = process.env.GEMINI_API_KEY || ''
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Gemini API key not configured' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
