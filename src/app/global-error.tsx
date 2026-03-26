'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  let locale: 'ja' | 'en' = 'ja'
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('workflow-locale')
      if (stored === 'en') locale = 'en'
    }
  } catch {}

  const labels = locale === 'en'
    ? { title: 'A critical error occurred', desc: 'A critical error occurred in the application. Please reload the page.', retry: 'Retry', reload: 'Reload Page' }
    : { title: '重大なエラーが発生しました', desc: 'アプリケーションで重大なエラーが発生しました。ページを再読み込みしてください。', retry: '再試行', reload: '再読み込み' }

  return (
    <html lang="ja">
      <body>
        <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', backgroundColor: '#f8f9fa' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '400px', textAlign: 'center', padding: '0 20px' }}>
            <div style={{ fontSize: '40px' }}>!</div>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a1a1a' }}>{labels.title}</h2>
            <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>{labels.desc}</p>
            {error?.message && (
              <p style={{ fontSize: '11px', color: '#999', backgroundColor: '#f0f0f0', borderRadius: '6px', padding: '8px 12px', width: '100%', wordBreak: 'break-all' }}>
                {error.message}
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={reset}
                style={{ height: '36px', padding: '0 20px', borderRadius: '7px', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#34d399', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                {labels.retry}
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{ height: '36px', padding: '0 20px', borderRadius: '7px', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#e5e7eb', color: '#1a1a1a', border: 'none', cursor: 'pointer' }}
              >
                {labels.reload}
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
